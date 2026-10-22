import logging

import httpx

from .config import settings
from .models import SuricataEvent, SuricataFlowEvent
from .parser import as_payload, as_flow_payload

logger = logging.getLogger("fanos.suricata.collector")


async def send(event: SuricataEvent | SuricataFlowEvent) -> bool:
    if not settings.backend_url:
        logger.error("FANOS_SURICATA_URL is not configured; cannot forward event %s", event.event_id)
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {"X-FANOS-Suricata-Token": settings.ingest_token} if settings.ingest_token else {}
            if isinstance(event, SuricataFlowEvent):
                url = settings.flows_url
                payload = as_flow_payload(event)
            else:
                url = settings.events_url
                payload = as_payload(event)
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return True
    except httpx.HTTPStatusError as exc:
        detail = ""
        try:
            detail = exc.response.text
        except Exception:
            pass
        logger.warning(
            "HTTP %s from backend forwarding Suricata event %s to %s: %s | Detail: %s",
            exc.response.status_code, event.event_id, exc.request.url, exc, detail
        )
        if exc.response.status_code in (400, 422):
            logger.error("Skipping permanently invalid event %s to prevent collector stall", event.event_id)
            return True
        return False
    except httpx.HTTPError as exc:
        logger.warning("Could not forward Suricata event %s to backend: %s", event.event_id, exc)
        return False


import logging

import httpx

from .config import settings
from .models import SuricataEvent
from .parser import as_payload

logger = logging.getLogger("fanos.suricata.collector")


async def send(event: SuricataEvent) -> bool:
    if not settings.backend_url:
        logger.error("FANOS_SURICATA_URL is not configured; cannot forward event %s", event.event_id)
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {"X-FANOS-Suricata-Token": settings.ingest_token} if settings.ingest_token else {}
            response = await client.post(settings.backend_url, json=as_payload(event), headers=headers)
            response.raise_for_status()
            return True
    except httpx.HTTPError as exc:
        logger.warning("Could not forward Suricata event %s to %s: %s", event.event_id, settings.backend_url, exc)
        return False

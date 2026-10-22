import asyncio
import json
import logging
import os
from pathlib import Path

from .config import settings
from .parser import parse_line
from .sender import send

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fanos.suricata.collector")


def load_state(path: Path) -> tuple[int, int, set[str]]:
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
        return int(state.get("offset", 0)), int(state.get("inode", 0)), set(state.get("seen", []))
    except (OSError, ValueError, TypeError):
        return 0, 0, set()


def save_state(path: Path, offset: int, inode: int, seen: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps({"offset": offset, "inode": inode, "seen": list(seen)[-50000:]}), encoding="utf-8")
    temporary.replace(path)


async def run() -> None:
    if not settings.eve_path:
        raise RuntimeError("SURICATA_EVE_PATH must match the native Windows Suricata eve-log filename")
    state_path = Path(settings.state_path)
    offset, inode, seen = load_state(state_path)
    tail_only = os.getenv("SURICATA_TAIL_ONLY", "false").lower() in ("true", "1", "yes")
    initial_check = True

    while True:
        path = Path(settings.eve_path)
        if not path.exists():
            await asyncio.sleep(settings.poll_seconds)
            continue
        try:
            file_stat = path.stat()
            current_inode = getattr(file_stat, "st_ino", 0)
            if initial_check:
                initial_check = False
                if tail_only and not state_path.exists():
                    offset = file_stat.st_size
                    inode = current_inode
                    save_state(state_path, offset, inode, seen)
                    logger.info("Starting collector at end of file to read only newly appended events (offset=%d)", offset)
            if current_inode != inode or file_stat.st_size < offset:
                offset = 0
                inode = current_inode
            with path.open("r", encoding="utf-8", errors="replace") as stream:
                stream.seek(offset)
                while line := stream.readline():
                    offset = stream.tell()
                    event = parse_line(line)
                    if event is None:
                        continue
                    if event.event_id in seen:
                        continue
                    while not await send(event):
                        await asyncio.sleep(settings.retry_seconds)
                    seen.add(event.event_id)
                    save_state(state_path, offset, inode, seen)
                    logger.info("Forwarded Suricata alert %s", event.event_id)
                save_state(state_path, offset, inode, seen)
        except OSError as exc:
            logger.warning("Could not read EVE JSON: %s", exc)
        await asyncio.sleep(settings.poll_seconds)


if __name__ == "__main__":
    asyncio.run(run())

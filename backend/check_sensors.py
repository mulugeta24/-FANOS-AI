import asyncio
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.security import SensorLifecycle

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SensorLifecycle))
        rows = result.scalars().all()

        print("SENSOR_COUNT:", len(rows))

        for row in rows:
            print(
                "SENSOR:", row.sensor_id,
                "| DESIRED:", row.desired_state,
                "| STATUS:", row.status
            )

asyncio.run(main())

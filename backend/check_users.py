import asyncio
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.security import User

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User.username, User.role, User.is_active)
        )

        for username, role, active in result.all():
            print(f"USER: {username} | ROLE: {role} | ACTIVE: {active}")

asyncio.run(main())

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone

from core.models.user import User
from core.models.refresh_token import RefreshToken

async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_refresh_token_by_hash(session: AsyncSession, token_hash: str) -> RefreshToken | None:
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await session.execute(stmt)
    return result.scalars().first()


async def create_refresh_token(session: AsyncSession, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
    from core.models.refresh_token import RefreshToken
    
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at
    )
    
    session.add(refresh_token)
    await session.commit()
    await session.refresh(refresh_token)
    return refresh_token


async def revoke_refresh_token(session: AsyncSession, token_hash: str) -> bool:
    stmt = update(RefreshToken).where(RefreshToken.token_hash == token_hash).values(
        revoked_at=datetime.now(timezone.utc)
    )
    result = await session.execute(stmt)
    await session.commit()
    return True


async def get_active_refresh_token(session: AsyncSession, token_hash: str) -> RefreshToken | None:
    from sqlalchemy.orm import selectinload
    
    stmt = select(RefreshToken).options(
        selectinload(RefreshToken.user)
    ).where(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > datetime.now(timezone.utc)
    )
    result = await session.execute(stmt)
    return result.scalars().first()

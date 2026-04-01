from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import database
from .schemas import AuthUserPayload
from .utils import decode_jwt
from core.models.user import User
from . import crud

security = APIKeyCookie(
    name="access_token",
    scheme_name="Access token cookie",
    description="JWT access token stored in HttpOnly cookie `access_token`.",
    auto_error=False,
)


async def get_current_payload(
    token: str | None = Depends(security),
) -> AuthUserPayload:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_jwt(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    try:
        return AuthUserPayload.model_validate(payload)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )


async def get_current_user(
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
) -> User:
    user = await crud.get_user_by_id(session, payload.sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


CurrentPayload = Annotated[AuthUserPayload, Depends(get_current_payload)]


async def is_admin(payload: CurrentPayload):
    if payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permisson",
        )

    return payload

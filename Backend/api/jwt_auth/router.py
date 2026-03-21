import hashlib

from fastapi import APIRouter, Depends, Response, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from core.database import database

from .schemas import UserSchema, TokenInfo, UserLogin
from .utils import validate_password, create_access_token, create_refresh_token
from . import crud
from . import dependencies as dp

router = APIRouter(tags=["JWT_Auth"], prefix="/api/jwt")

@router.get(
    "/me",
    response_model=UserSchema,
    summary="Получить профиль текущего пользователя",
    description="Возвращает данные пользователя на основе access token из заголовка Authorization Bearer.",
)
async def get_me(user = Depends(dp.get_current_user)):
    return user

@router.post(
    "/login",
    response_model=TokenInfo,
    summary="Вход в систему",
    description="Проверяет логин и пароль, выдает access token и устанавливает access/refresh токены в cookies.",
)
async def auth_user_jwt(
    response: Response,
    user_data: UserLogin,
    session: AsyncSession = Depends(database.get_session)
):
    user = await crud.get_user_by_username(session, user_data.username)
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password",
        )
    
    if not validate_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password",
        )
    
    jwt_payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "group_id": user.group_id,
    }
    access_token = create_access_token(payload=jwt_payload)
    refresh_token, refresh_token_hash = create_refresh_token()
    

    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await crud.create_refresh_token(session, user.id, refresh_token_hash, expires_at)
    

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=2592000  # 30 дней в секундах
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    
    return TokenInfo(
        access_token=access_token,
        token_type="Bearer",
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Выход из системы",
    description="Отзывает refresh token (если есть) и удаляет access/refresh cookies.",
)
async def logout_user_jwt(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(database.get_session)
):
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        await crud.revoke_refresh_token(session, refresh_token_hash)

    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=False,
        samesite="lax",
    )
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,
        samesite="lax",
    )


@router.post(
    "/refresh",
    response_model=TokenInfo,
    summary="Обновить пару токенов",
    description="Проверяет refresh token из cookie, перевыпускает access token и новый refresh token.",
)
async def refresh_tokens_jwt(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(database.get_session)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    token_entry = await crud.get_active_refresh_token(session, refresh_token_hash)

    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    await crud.revoke_refresh_token(session, refresh_token_hash)

    new_refresh_token, new_refresh_token_hash = create_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await crud.create_refresh_token(
        session,
        token_entry.user_id,
        new_refresh_token_hash,
        expires_at,
    )

    jwt_payload = {
        "sub": str(token_entry.user.id),
        "username": token_entry.user.username,
        "role": token_entry.user.role,
        "group_id": token_entry.user.group_id,
    }
    access_token = create_access_token(payload=jwt_payload)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=2592000,
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
    )

    return TokenInfo(
        access_token=access_token,
        token_type="Bearer",
    )

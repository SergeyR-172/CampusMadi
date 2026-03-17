from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from core.database import database
from core.models import User
from .schemas import ScheduleItemOut
from .crud import get_schedule_items_for_day
from api.jwt_auth.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Schedule"])


@router.get(
    "/schedule",
    response_model=list[ScheduleItemOut],
    summary="Получить расписание пользователя",
    description="Возвращает расписание для группы текущего пользователя на день, вычисленный по параметру offset.",
)
async def get_schedule(
    offset: int = 0,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(database.get_session),
):
    target_day = datetime.now(timezone.utc) + timedelta(days=offset)

    if user.group_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not consist in a group",
        )

    items = await get_schedule_items_for_day(session, user.group_id, target_day)
    return items

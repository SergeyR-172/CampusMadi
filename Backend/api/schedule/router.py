from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.jwt_auth.dependencies import get_current_user
from core.database import database
from core.models import User
from .schemas import ScheduleDayOut, ScheduleItemOut
from .utils import get_serialized_schedule_for_day, get_serialized_schedule_for_week

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
    return await get_serialized_schedule_for_day(session, user, target_day)


@router.get(
    "/schedule/week/current",
    response_model=list[ScheduleDayOut],
    summary="Получить расписание пользователя на текущую неделю",
    description="Возвращает расписание для группы текущего пользователя на текущую неделю с понедельника по воскресенье.",
)
async def get_current_week_schedule(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(database.get_session),
):
    current_day = datetime.now(timezone.utc)
    return await get_serialized_schedule_for_week(session, user, current_day)

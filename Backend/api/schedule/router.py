from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from core.database import database
from core.models import User
from .schemas import NoteOut, ScheduleDayOut, ScheduleItemOut
from .crud import (
    get_current_week_range,
    get_notes_for_schedule_items,
    get_schedule_items_for_day,
)
from api.jwt_auth.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Schedule"])


def serialize_schedule_items(items, notes, user_id: int) -> list[ScheduleItemOut]:
    notes_by_schedule_item: dict[int, list[NoteOut]] = {}
    for note in notes:
        if note.schedule_item_id is None:
            continue
        notes_by_schedule_item.setdefault(note.schedule_item_id, []).append(
            NoteOut.model_validate(note)
        )

    serialized_items: list[ScheduleItemOut] = []
    for item in items:
        item_notes = notes_by_schedule_item.get(item.id, [])
        serialized_items.append(
            ScheduleItemOut(
                id=item.id,
                subject=item.subject,
                group_id=item.group_id,
                teacher_name=item.teacher.name,
                day_of_week=item.day_of_week,
                pair_number=item.pair_number,
                week_type=item.week_type,
                start_time=item.start_time,
                end_time=item.end_time,
                date_from=item.date_from,
                date_to=item.date_to,
                user_notes=[note for note in item_notes if note.author_id == user_id],
                teacher_notes=[
                    note for note in item_notes if note.author_id == item.teacher_id
                ],
            )
        )

    return serialized_items


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
    notes = await get_notes_for_schedule_items(session, [item.id for item in items])
    return serialize_schedule_items(items, notes, user.id)


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

    if user.group_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not consist in a group",
        )

    monday, _ = get_current_week_range(current_day)
    week_schedule: list[ScheduleDayOut] = []

    for day_offset in range(7):
        day_date = monday + timedelta(days=day_offset)
        day_datetime = datetime.combine(day_date, datetime.min.time(), tzinfo=timezone.utc)
        items = await get_schedule_items_for_day(session, user.group_id, day_datetime)
        notes = await get_notes_for_schedule_items(session, [item.id for item in items])

        week_schedule.append(
            ScheduleDayOut(
                date=day_date,
                day_of_week=day_date.isoweekday(),
                items=serialize_schedule_items(items, notes, user.id),
            )
        )

    return week_schedule

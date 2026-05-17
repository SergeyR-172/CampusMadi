from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.jwt_auth.schemas import AuthUserPayload
from core.redis import redis_client
from core.settings import settings
from .crud import (
    get_attachments_for_schedule_items,
    get_notes_for_schedule_items,
    get_schedule_items_for_day,
    get_teacher_schedule_items_for_day,
)
from .schemas import AttachmentOut, NoteOut, ScheduleDayOut, ScheduleItemOut


def build_day_schedule_cache_key(user_id: int, group_id: int, target_date: date) -> str:
    return (
        f"schedule:day:user:{user_id}:group:{group_id}:date:{target_date.isoformat()}"
    )


def build_week_schedule_cache_key(user_id: int, group_id: int, monday: date) -> str:
    return f"schedule:week:user:{user_id}:group:{group_id}:monday:{monday.isoformat()}"


def build_teacher_day_schedule_cache_key(user_id: int, target_date: date) -> str:
    return f"schedule:day:teacher:{user_id}:date:{target_date.isoformat()}"


def build_teacher_week_schedule_cache_key(user_id: int, monday: date) -> str:
    return f"schedule:week:teacher:{user_id}:monday:{monday.isoformat()}"


def get_current_week_range(current_day: datetime) -> tuple[date, date]:
    current_date = current_day.date()
    monday = current_date - timedelta(days=current_date.isoweekday() - 1)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def serialize_schedule_items(
    items,
    notes,
    attachments,
    user_id: int,
    user_role: str,
) -> list[ScheduleItemOut]:
    notes_by_schedule_item: dict[int, list[NoteOut]] = {}
    for note in notes:
        if note.schedule_item_id is None:
            continue
        notes_by_schedule_item.setdefault(note.schedule_item_id, []).append(
            NoteOut.model_validate(note)
        )

    attachments_by_schedule_item: dict[int, list[AttachmentOut]] = {}
    for attachment in attachments:
        attachments_by_schedule_item.setdefault(attachment.schedule_item_id, []).append(
            AttachmentOut.model_validate(attachment)
        )

    serialized_items: list[ScheduleItemOut] = []
    for item in items:
        item_notes = notes_by_schedule_item.get(item.id, [])
        item_attachments = attachments_by_schedule_item.get(item.id, [])
        teacher_notes = [
            note
            for note in item_notes
            if note.author_id == item.teacher_id and note.private == False
        ]
        user_notes = [note for note in item_notes if note.author_id == user_id]

        if user_role == "teacher":
            user_notes = [note for note in user_notes if note.private == True]

        serialized_items.append(
            ScheduleItemOut(
                id=item.id,
                subject=item.subject,
                group_id=item.group_id,
                group_name=item.group.name,
                teacher_name=item.teacher.name,
                day_of_week=item.day_of_week,
                pair_number=item.pair_number,
                week_type=item.week_type,
                start_time=item.start_time,
                end_time=item.end_time,
                date_from=item.date_from,
                date_to=item.date_to,
                user_notes=user_notes,
                teacher_notes=teacher_notes,
                attachments=item_attachments,
            )
        )

    return serialized_items


def ensure_user_group_id(payload: AuthUserPayload) -> int:
    if payload.group_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not consist in a group",
        )

    return payload.group_id


async def get_serialized_schedule_for_day(
    session: AsyncSession,
    payload: AuthUserPayload,
    target_day: datetime,
) -> list[dict]:
    user_id = payload.sub
    target_date = target_day.date()

    if payload.role == "teacher":
        cache_key = build_teacher_day_schedule_cache_key(user_id, target_date)
        fetch_items = get_teacher_schedule_items_for_day
        fetch_args = (session, user_id, target_day)
    else:
        group_id = ensure_user_group_id(payload)
        cache_key = build_day_schedule_cache_key(user_id, group_id, target_date)
        fetch_items = get_schedule_items_for_day
        fetch_args = (session, group_id, target_day)

    cached_schedule = await redis_client.get_json(cache_key)
    if cached_schedule is not None:
        return cached_schedule

    items = await fetch_items(*fetch_args)
    notes = await get_notes_for_schedule_items(
        session,
        [item.id for item in items],
        target_date,
    )
    attachments = await get_attachments_for_schedule_items(
        session,
        [item.id for item in items],
        target_date,
    )
    serialized_items = serialize_schedule_items(items, notes, attachments, user_id, payload.role)
    serialized_schedule = [item.model_dump(mode="json") for item in serialized_items]

    await redis_client.set_json(
        cache_key,
        serialized_schedule,
        ex=settings.day_schedule_ttl,
    )
    return serialized_schedule


async def get_serialized_schedule_for_week(
    session: AsyncSession,
    payload: AuthUserPayload,
    current_day: datetime,
) -> list[dict]:
    user_id = payload.sub
    monday, _ = get_current_week_range(current_day)

    if payload.role == "teacher":
        cache_key = build_teacher_week_schedule_cache_key(user_id, monday)
    else:
        group_id = ensure_user_group_id(payload)
        cache_key = build_week_schedule_cache_key(user_id, group_id, monday)

    cached_schedule = await redis_client.get_json(cache_key)
    if cached_schedule is not None:
        return cached_schedule

    serialized_week_schedule: list[dict] = []
    for day_offset in range(7):
        day_date = monday + timedelta(days=day_offset)
        day_datetime = datetime.combine(day_date, datetime.min.time())
        serialized_day_items = await get_serialized_schedule_for_day(
            session,
            payload,
            day_datetime,
        )
        day_schedule = ScheduleDayOut(
            date=day_date,
            day_of_week=day_date.isoweekday(),
            items=[
                ScheduleItemOut.model_validate(item) for item in serialized_day_items
            ],
        )
        serialized_week_schedule.append(day_schedule.model_dump(mode="json"))

    await redis_client.set_json(
        cache_key,
        serialized_week_schedule,
        ex=settings.week_schedule_ttl,
    )
    return serialized_week_schedule

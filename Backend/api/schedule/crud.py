from datetime import date, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import LessonAttachment, Note, ScheduleItem


async def get_schedule_items_for_day(
    session: AsyncSession,
    group_id: int,
    current_day: datetime,
) -> list[ScheduleItem]:
    current_date = current_day.date()
    week_type = "even" if current_day.isocalendar().week % 2 == 0 else "odd"
    day_of_week = current_day.isoweekday()

    stmt = (
        select(ScheduleItem)
        .options(selectinload(ScheduleItem.teacher))
        .where(
            ScheduleItem.group_id == group_id,
            ScheduleItem.week_type.in_([week_type, "both"]),
            ScheduleItem.day_of_week == day_of_week,
            ScheduleItem.date_from <= current_date,
            ScheduleItem.date_to >= current_date,
        )
        .order_by(ScheduleItem.pair_number)
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_teacher_schedule_items_for_day(
    session: AsyncSession,
    teacher_id: int,
    current_day: datetime,
) -> list[ScheduleItem]:
    current_date = current_day.date()
    week_type = "even" if current_day.isocalendar().week % 2 == 0 else "odd"
    day_of_week = current_day.isoweekday()

    stmt = (
        select(ScheduleItem)
        .options(
            selectinload(ScheduleItem.teacher),
            selectinload(ScheduleItem.group),
        )
        .where(
            ScheduleItem.teacher_id == teacher_id,
            ScheduleItem.week_type.in_([week_type, "both"]),
            ScheduleItem.day_of_week == day_of_week,
            ScheduleItem.date_from <= current_date,
            ScheduleItem.date_to >= current_date,
        )
        .order_by(ScheduleItem.pair_number, ScheduleItem.group_id)
    )

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_notes_for_schedule_items(
    session: AsyncSession,
    schedule_item_ids: list[int],
    lesson_date: date,
) -> list[Note]:
    if not schedule_item_ids:
        return []

    stmt = select(Note).where(
        Note.schedule_item_id.in_(schedule_item_ids),
        Note.lesson_date == lesson_date,
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_attachments_for_schedule_items(
    session: AsyncSession,
    schedule_item_ids: list[int],
    lesson_date: date,
) -> list[LessonAttachment]:
    if not schedule_item_ids:
        return []

    stmt = (
        select(LessonAttachment)
        .where(
            LessonAttachment.schedule_item_id.in_(schedule_item_ids),
            LessonAttachment.lesson_date == lesson_date,
        )
        .order_by(LessonAttachment.created_at, LessonAttachment.id)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


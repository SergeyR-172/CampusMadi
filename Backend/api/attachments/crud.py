from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import LessonAttachment, ScheduleItem


async def get_schedule_item_by_id(
    session: AsyncSession,
    schedule_item_id: int,
) -> ScheduleItem | None:
    stmt = select(ScheduleItem).where(ScheduleItem.id == schedule_item_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def create_attachment(
    session: AsyncSession,
    values: dict,
) -> LessonAttachment:
    attachment = LessonAttachment(**values)
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)
    return attachment


async def get_attachment_by_id(
    session: AsyncSession,
    attachment_id: int,
) -> LessonAttachment | None:
    stmt = select(LessonAttachment).where(LessonAttachment.id == attachment_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_attachments_for_lesson(
    session: AsyncSession,
    *,
    schedule_item_id: int,
    lesson_date: date,
) -> list[LessonAttachment]:
    stmt = (
        select(LessonAttachment)
        .where(
            LessonAttachment.schedule_item_id == schedule_item_id,
            LessonAttachment.lesson_date == lesson_date,
        )
        .order_by(LessonAttachment.created_at, LessonAttachment.id)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_attachment(
    session: AsyncSession,
    attachment_id: int,
) -> bool:
    attachment = await get_attachment_by_id(session, attachment_id)
    if attachment is None:
        return False

    stmt = delete(LessonAttachment).where(LessonAttachment.id == attachment_id)
    await session.execute(stmt)
    await session.commit()
    return True

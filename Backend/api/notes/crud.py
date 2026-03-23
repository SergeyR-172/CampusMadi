from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import Note, ScheduleItem


async def get_schedule_item_by_id(
    session: AsyncSession,
    schedule_item_id: int,
) -> ScheduleItem | None:
    stmt = select(ScheduleItem).where(ScheduleItem.id == schedule_item_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_note_by_id(session: AsyncSession, note_id: int) -> Note | None:
    stmt = select(Note).where(Note.id == note_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_notes_by_author(
    session: AsyncSession,
    author_id: int,
    schedule_item_id: int | None = None,
) -> list[Note]:
    stmt = select(Note).where(Note.author_id == author_id)

    if schedule_item_id is not None:
        stmt = stmt.where(Note.schedule_item_id == schedule_item_id)

    stmt = stmt.order_by(Note.schedule_item_id, Note.private, Note.id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_note_for_slot(
    session: AsyncSession,
    *,
    author_id: int,
    schedule_item_id: int,
    is_teacher: bool,
    private: bool,
    exclude_id: int | None = None,
) -> Note | None:
    stmt = select(Note).where(
        Note.author_id == author_id,
        Note.schedule_item_id == schedule_item_id,
    )

    if is_teacher:
        stmt = stmt.where(Note.private == private)

    if exclude_id is not None:
        stmt = stmt.where(Note.id != exclude_id)

    result = await session.execute(stmt.order_by(Note.id))
    return result.scalars().first()


async def create_note(session: AsyncSession, values: dict) -> Note:
    note = Note(**values)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


async def update_note(
    session: AsyncSession,
    note_id: int,
    values: dict,
) -> Note | None:
    if not values:
        return await get_note_by_id(session, note_id)

    stmt = update(Note).where(Note.id == note_id).values(**values)
    await session.execute(stmt)
    await session.commit()
    return await get_note_by_id(session, note_id)


async def delete_note(session: AsyncSession, note_id: int) -> bool:
    note = await get_note_by_id(session, note_id)
    if note is None:
        return False

    stmt = delete(Note).where(Note.id == note_id)
    await session.execute(stmt)
    await session.commit()
    return True

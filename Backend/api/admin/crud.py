from datetime import date

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import Group, ScheduleItem
from core.models.user import User


async def get_users(session: AsyncSession) -> list[User]:
    stmt = select(User).order_by(User.id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def create_user(
    session: AsyncSession,
    username: str,
    hashed_password: str,
    name: str,
    role: str = "default",
) -> User:
    user = User(
        username=username,
        hashed_password=hashed_password,
        name=name,
        role=role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    user_id: int,
    values: dict,
) -> User | None:
    if not values:
        return await get_user_by_id(session, user_id)

    stmt = update(User).where(User.id == user_id).values(**values)
    await session.execute(stmt)
    await session.commit()
    return await get_user_by_id(session, user_id)


async def delete_user(session: AsyncSession, user_id: int) -> bool:
    user = await get_user_by_id(session, user_id)
    if user is None:
        return False

    stmt = delete(User).where(User.id == user_id)
    await session.execute(stmt)
    await session.commit()
    return True


async def get_group_by_id(session: AsyncSession, group_id: int) -> Group | None:
    stmt = select(Group).where(Group.id == group_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_schedule_items(session: AsyncSession) -> list[ScheduleItem]:
    stmt = select(ScheduleItem).order_by(
        ScheduleItem.group_id,
        ScheduleItem.day_of_week,
        ScheduleItem.pair_number,
        ScheduleItem.id,
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_schedule_items_by_group(
    session: AsyncSession,
    group_id: int,
) -> list[ScheduleItem]:
    stmt = (
        select(ScheduleItem)
        .where(ScheduleItem.group_id == group_id)
        .order_by(
            ScheduleItem.day_of_week,
            ScheduleItem.pair_number,
            ScheduleItem.id,
        )
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_schedule_item_by_id(
    session: AsyncSession,
    schedule_item_id: int,
) -> ScheduleItem | None:
    stmt = select(ScheduleItem).where(ScheduleItem.id == schedule_item_id)
    result = await session.execute(stmt)
    return result.scalars().first()


async def create_schedule_item(session: AsyncSession, values: dict) -> ScheduleItem:
    schedule_item = ScheduleItem(**values)
    session.add(schedule_item)
    await session.commit()
    await session.refresh(schedule_item)
    return schedule_item


async def update_schedule_item(
    session: AsyncSession,
    schedule_item_id: int,
    values: dict,
) -> ScheduleItem | None:
    if not values:
        return await get_schedule_item_by_id(session, schedule_item_id)

    stmt = update(ScheduleItem).where(ScheduleItem.id == schedule_item_id).values(**values)
    await session.execute(stmt)
    await session.commit()
    return await get_schedule_item_by_id(session, schedule_item_id)


async def delete_schedule_item(session: AsyncSession, schedule_item_id: int) -> bool:
    schedule_item = await get_schedule_item_by_id(session, schedule_item_id)
    if schedule_item is None:
        return False

    stmt = delete(ScheduleItem).where(ScheduleItem.id == schedule_item_id)
    await session.execute(stmt)
    await session.commit()
    return True


async def get_conflicting_schedule_item(
    session: AsyncSession,
    *,
    group_id: int,
    day_of_week: int,
    pair_number: int,
    week_type: str,
    date_from: date,
    date_to: date,
    exclude_id: int | None = None,
) -> ScheduleItem | None:
    week_type_conditions = [ScheduleItem.week_type == "both"]
    if week_type == "both":
        week_type_conditions.extend(
            [
                ScheduleItem.week_type == "odd",
                ScheduleItem.week_type == "even",
            ]
        )
    else:
        week_type_conditions.append(ScheduleItem.week_type == week_type)

    stmt = select(ScheduleItem).where(
        ScheduleItem.group_id == group_id,
        ScheduleItem.day_of_week == day_of_week,
        ScheduleItem.pair_number == pair_number,
        ScheduleItem.date_from <= date_to,
        ScheduleItem.date_to >= date_from,
        or_(*week_type_conditions),
    )

    if exclude_id is not None:
        stmt = stmt.where(ScheduleItem.id != exclude_id)

    result = await session.execute(stmt.order_by(ScheduleItem.id))
    return result.scalars().first()

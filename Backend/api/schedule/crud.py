from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import ScheduleItem


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
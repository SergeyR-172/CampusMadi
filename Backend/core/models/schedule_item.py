from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey, Enum, Time, Date
from typing import TYPE_CHECKING
from datetime import date, time

from .base import Base

if TYPE_CHECKING:
    from .group import Group
    from .user import User

class ScheduleItem(Base):
    __tablename__ = "schedule_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    subject: Mapped[str] = mapped_column(String, nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"),nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer,nullable=False)
    pair_number: Mapped[int] = mapped_column(Integer,nullable=False)

    week_type: Mapped[str] = mapped_column(
        Enum("odd", "even", "both", name="week_type_enum"),
        nullable=False,
        default="both")
    
    start_time: Mapped[time] = mapped_column(Time,nullable=False)
    end_time: Mapped[time] = mapped_column(Time,nullable=False)
    date_from: Mapped[date] = mapped_column(Date,nullable=False)
    date_to: Mapped[date] = mapped_column(Date,nullable=False)

    group: Mapped["Group"] = relationship(
        back_populates="schedule_items",
        lazy="selectin")
    
    teacher: Mapped["User"] = relationship(
        lazy="selectin")



from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User
    from .schedule_item import ScheduleItem

from .base import Base

class Group(Base):
    __tablename__ = "groups"
    id: Mapped[int] =  mapped_column(Integer, primary_key=True, autoincrement=True)
    
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    users: Mapped[list["User"]] = relationship(back_populates="group", lazy="selectin")
    schedule_items: Mapped[list["ScheduleItem"]] = relationship(back_populates="group", lazy="selectin")
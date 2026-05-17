from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from typing import TYPE_CHECKING, Optional
from datetime import date

from .base import Base
if TYPE_CHECKING:
    from .user import User


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        UniqueConstraint(
            "author_id",
            "schedule_item_id",
            "lesson_date",
            "private",
            name="uq_notes_author_schedule_date_private",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schedule_items.id", ondelete="CASCADE"), nullable=True)
    lesson_date: Mapped[date] = mapped_column(Date, nullable=False)
    text: Mapped[str] = mapped_column(String, nullable=False)
    private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    author: Mapped["User"] = relationship(back_populates="notes") 

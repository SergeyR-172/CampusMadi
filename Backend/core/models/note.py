from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Boolean, ForeignKey, Integer, String
from typing import TYPE_CHECKING, Optional

from .base import Base
if TYPE_CHECKING:
    from .user import User


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schedule_items.id", ondelete="CASCADE"), nullable=True)
    text: Mapped[str] = mapped_column(String(255), nullable=False)
    private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    author: Mapped["User"] = relationship(back_populates="notes") 

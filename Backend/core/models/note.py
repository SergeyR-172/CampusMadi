from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, DateTime, ForeignKey
from typing import TYPE_CHECKING

from .base import Base
if TYPE_CHECKING:
    from .user import User


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    #schedule_item_id: Mapped[int]
    text: Mapped[str] = mapped_column(String(255), nullable=False)
    
    author: Mapped["User"] = relationship(back_populates="notes") 
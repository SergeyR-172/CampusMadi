from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AttachmentOut(BaseModel):
    id: int
    schedule_item_id: int
    lesson_date: date
    teacher_id: int
    original_filename: str
    content_type: str
    size: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

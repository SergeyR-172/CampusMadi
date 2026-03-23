from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=255)
    private: bool = False


class NoteOut(BaseModel):
    id: int
    author_id: int
    schedule_item_id: int | None
    text: str
    private: bool

    model_config = ConfigDict(from_attributes=True)


class ScheduleDayOut(BaseModel):
    date: date
    day_of_week: int
    items: list["ScheduleItemOut"]

    model_config = ConfigDict(from_attributes=True)

class ScheduleItemOut(BaseModel):
    id: int
    subject: str
    group_id: int
    group_name: str
    teacher_name: str
    day_of_week: int
    pair_number: int
    week_type: str
    start_time: time
    end_time: time
    date_from: date
    date_to: date
    user_notes: list[NoteOut] = Field(default_factory=list)
    teacher_notes: list[NoteOut] = Field(default_factory=list)


    model_config = ConfigDict(from_attributes=True)

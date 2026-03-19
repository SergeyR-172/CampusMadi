from datetime import date, time

from pydantic import AliasPath, BaseModel, ConfigDict, Field


class NoteOut(BaseModel):
    id: int
    author_id: int
    schedule_item_id: int | None
    text: str

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
    teacher_name: str = Field(validation_alias=AliasPath("teacher", "name"))
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

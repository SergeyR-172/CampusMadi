from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str = "default"


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    name: str | None = None
    role: str | None = None


class UserOut(BaseModel):
    id: int
    username: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


WeekType = Literal["odd", "even", "both"]


class ScheduleItemBase(BaseModel):
    subject: str
    group_id: int
    teacher_id: int
    day_of_week: int = Field(ge=1, le=7)
    pair_number: int = Field(ge=1)
    week_type: WeekType = "both"
    start_time: time
    end_time: time
    date_from: date
    date_to: date

    @model_validator(mode="after")
    def validate_dates_and_time(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be greater than start time")
        if self.date_to < self.date_from:
            raise ValueError("date_to must be greater than or equal to date_from")
        return self


class ScheduleItemCreate(ScheduleItemBase):
    pass


class ScheduleItemUpdate(BaseModel):
    subject: str | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    pair_number: int | None = Field(default=None, ge=1)
    week_type: WeekType | None = None
    start_time: time | None = None
    end_time: time | None = None
    date_from: date | None = None
    date_to: date | None = None


class ScheduleItemOut(ScheduleItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

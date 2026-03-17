from datetime import date, time

from pydantic import AliasPath, BaseModel, ConfigDict, Field

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


    model_config = ConfigDict(from_attributes=True)

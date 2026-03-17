from pydantic import BaseModel, ConfigDict

class ScheduleItemOut(BaseModel):


    model_config = ConfigDict(from_attributes=True)
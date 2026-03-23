from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NoteText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


class NoteCreate(BaseModel):
    schedule_item_id: int = Field(gt=0)
    text: NoteText
    private: bool = False


class NoteUpdate(BaseModel):
    text: NoteText | None = None
    private: bool | None = None


class NoteOut(BaseModel):
    id: int
    author_id: int
    schedule_item_id: int | None
    text: str
    private: bool

    model_config = ConfigDict(from_attributes=True)

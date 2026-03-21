from pydantic import BaseModel, ConfigDict
from typing import Optional

class TokenInfo(BaseModel):
    access_token: str
    token_type: str

class UserSchema(BaseModel):
    id: int
    username: str
    name: str
    role: str
    #group_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AuthUserPayload(BaseModel):
    sub: int
    username: str
    role: str
    group_id: Optional[int] = None

class UserLogin(BaseModel):
    username: str
    password: str

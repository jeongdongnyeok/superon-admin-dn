from pydantic import BaseModel
from typing import List, Literal

from typing import Optional

from sqlalchemy import desc

class CharacterProfile(BaseModel):
    name: Optional[str] = None
    style: Optional[str] = None
    perspective: str
    tone: Optional[str] = None
    country: str  # 국가 정보 추가

class CharacterPayload(BaseModel):
    id: str
    description: str
    profile: CharacterProfile

class ChatTurn(BaseModel):
    role: Literal["user", "ai"]
    content: str

class AskPayload(BaseModel):
    id: str  # character_id
    session_id: str
    viewer_id: str
    history: List[ChatTurn]
    profile: Optional[dict] = None  # profile(instruction, examples) 허용

class StartSessionPayload(BaseModel):
    pass

class EndSessionPayload(BaseModel):
    session_id: str

class CharacterCreatePayload(BaseModel):
    name: str
    description: str
    profile: CharacterProfile

from pydantic import BaseModel
from typing import List, Literal

class CharacterProfile(BaseModel):
    name: str
    style: str
    perspective: str
    tone: str

class CharacterPayload(BaseModel):
    id: str
    world: str
    profile: CharacterProfile

class ChatTurn(BaseModel):
    role: Literal["user", "ai"]
    content: str

class AskPayload(BaseModel):
    id: str  # character_id
    session_id: str
    viewer_id: str
    history: List[ChatTurn]

class StartSessionPayload(BaseModel):
    character_id: str

class EndSessionPayload(BaseModel):
    session_id: str

class CharacterCreatePayload(BaseModel):
    character_id: str
    name: str
    world: str
    profile: CharacterProfile

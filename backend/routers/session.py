from fastapi import APIRouter
from backend.models.schemas import StartSessionPayload, EndSessionPayload
from backend.services.session_service import get_sessions, start_session, end_session

router = APIRouter(prefix="/sessions")

@router.get("")
def list_sessions(character_id: str = None):
    return get_sessions(character_id)

@router.post("/start")
def start_session_route(payload: StartSessionPayload):
    return start_session(payload)

@router.post("/end")
def end_session_route(payload: EndSessionPayload):
    return end_session(payload)

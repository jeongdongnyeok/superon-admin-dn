from fastapi import APIRouter
from backend.models.schemas import AskPayload
from backend.services.chat_service import get_chat_logs, ask

router = APIRouter(prefix="/chat")

@router.get("/logs")
def chat_logs(character_id: str = None, session_id: str = None, date: str = None):
    return get_chat_logs(character_id, session_id, date)


@router.post("/ask")
def ask_route(payload: AskPayload):
    return ask(payload)

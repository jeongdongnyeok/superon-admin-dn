from backend.config.settings import supabase
from backend.models.schemas import AskPayload
from fastapi import HTTPException
from backend.rag.chain import ask_character
from datetime import datetime

def get_chat_logs(character_id: str = None, session_id: str = None, date: str = None):
    query = supabase.table("chat_logs").select("id, character_id, session_id, viewer_id, question, response, emotion, timestamp")
    if character_id:
        query = query.eq("character_id", character_id)
    if session_id:
        query = query.eq("session_id", session_id)
    if date:
        query = query.gte("timestamp", f"{date}T00:00:00").lt("timestamp", f"{date}T23:59:59")
    rows = query.order("timestamp", desc=True).execute()
    return rows.data

def ask(payload: AskPayload):
    try:
        response = ask_character(payload)
        now = datetime.now().isoformat()
        supabase.table("chat_logs").insert({
            "character_id": payload.id,
            "session_id": payload.session_id,
            "viewer_id": payload.viewer_id,
            "question": payload.history[-1].content,
            "response": response,
            "timestamp": now,
        }).execute()
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"질문 처리 실패: {str(e)}")

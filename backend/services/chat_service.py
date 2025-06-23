from backend.models.schemas import AskPayload
from fastapi import HTTPException
from backend.services.chat_graph import run_chat_graph
from backend.config.settings import supabase
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
        # 기존 history를 memory로 전달
        memory = {"chat_log": [turn.dict() for turn in payload.history]}
        steps = run_chat_graph(memory=memory)
        last_state = steps[-1]["state"] if steps else {}
        response_text = last_state.get("response_text", "응답 생성 실패")
        emotion = last_state.get("emotion_tag", "neutral")
        now = datetime.now().isoformat()
        # supabase 저장 (memory update 노드에서 별도 저장 가능, 여기선 예시)
        supabase.table("chat_logs").insert({
            "character_id": payload.id,
            "session_id": payload.session_id,
            "viewer_id": payload.viewer_id,
            "question": payload.history[-1].content if payload.history else None,
            "response": response_text,
            "emotion": emotion,
            "timestamp": now,
        }).execute()
        return {"response": response_text, "emotion": emotion}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"질문 처리 실패: {str(e)}")

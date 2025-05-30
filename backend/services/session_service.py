from backend.config.settings import supabase
from backend.models.schemas import StartSessionPayload, EndSessionPayload
from fastapi import HTTPException
from uuid import uuid4
from datetime import datetime

def get_sessions(character_id: str = None):
    try:
        query = supabase.table("live_sessions").select("id, character_id")
        if character_id:
            query = query.eq("character_id", character_id)
        rows = query.execute()
        return [{"id": row["id"]} for row in rows.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"세션 목록 조회 실패: {str(e)}")

def start_session():
    try:
        session_id = str(uuid4())
        now = datetime.now().isoformat()
        supabase.table("live_sessions").insert({
            "id": session_id,
            "created_at": now,
        }).execute()
        return {"session_id": session_id, "created_at": now}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"세션 생성 실패: {str(e)}")

def end_session(payload: EndSessionPayload):
    try:
        supabase.table("live_sessions").delete().eq("id", payload.session_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"세션 종료 실패: {str(e)}")

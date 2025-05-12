# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal
from supabase import create_client
from uuid import uuid4
from datetime import datetime
import os
from dotenv import load_dotenv

from .rag.chain import load_character_chain, ask_character

# Load .env
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=dotenv_path)
print(f"[DEBUG] main.py: Loading .env from: {dotenv_path}")

# Supabase client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

    
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Pydantic Schemas ===
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

# === Routes ===

class CharacterCreatePayload(BaseModel):
    character_id: str
    name: str
    world: str
    profile: CharacterProfile

@app.post("/create_character")
def create_character(payload: CharacterCreatePayload):
    try:
        # Insert new character, let id (uuid) be auto-generated
        result = supabase.table("characters").insert({
            "character_id": payload.character_id,
            "name": payload.name,
            "world": payload.world,
            "style": payload.profile.style,
            "perspective": payload.profile.perspective,
            "tone": payload.profile.tone
        }).execute()
        if result.data and len(result.data) > 0:
            char = result.data[0]
            return {
                "status": "success",
                "id": char.get("id"),
                "character_id": char.get("character_id")
            }
        else:
            raise HTTPException(status_code=500, detail="캐릭터 생성 결과를 받아올 수 없습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캐릭터 생성 중 오류: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running"}

@app.post("/load_character")
def load_character(payload: CharacterPayload):
    print(f"[API DEBUG] /load_character called with id: {payload.id}")
    try:
        # payload.id가 uuid인지 확인, 아니면 character_id(영문 텍스트)로 조회
        from uuid import UUID
        try:
            UUID(str(payload.id))
            query_field = "id"
            query_value = payload.id
        except ValueError:
            query_field = "character_id"
            query_value = payload.id
        char_row = supabase.table("characters").select("id, character_id").eq(query_field, query_value).single().execute()
        if not char_row.data:
            raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
        character_uuid = char_row.data["id"]
        character_text_id = char_row.data["character_id"]
        load_character_chain(
            character_id=character_uuid,  # 내부 체인에는 uuid 사용
            world_text=payload.world,
            character_profile=payload.profile.dict()
        )
        return {"status": "success", "message": f"Character {payload.id} loaded successfully."}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"[API ERROR] Error loading character {payload.id}: {e}")
        raise HTTPException(status_code=500, detail=f"캐릭터 로딩 중 오류가 발생했습니다: {str(e)}")

@app.post("/ask_character")
def ask(payload: AskPayload):
    print(f"[API DEBUG] /ask_character called for id: {payload.id}, session: {payload.session_id}, viewer: {payload.viewer_id}")
    try:
        history = [t.dict() for t in payload.history]
        raw_response = ask_character(payload.id, history)

        actual_response_content = ""
        if hasattr(raw_response, 'content'):
            actual_response_content = raw_response.content
        elif isinstance(raw_response, str):
            actual_response_content = raw_response
        else:
            raise HTTPException(status_code=500, detail="Unexpected response type")

        if actual_response_content is None:
            raise HTTPException(status_code=500, detail="Empty response from character")

        # payload.id가 uuid인지 확인, 아니면 character_id(영문 텍스트)로 조회
        from uuid import UUID
        try:
            UUID(str(payload.id))
            query_field = "id"
            query_value = payload.id
        except ValueError:
            query_field = "character_id"
            query_value = payload.id
        char_row = supabase.table("characters").select("id, character_id").eq(query_field, query_value).single().execute()
        character_text_id = char_row.data["character_id"] if char_row.data and "character_id" in char_row.data else payload.id

        supabase.table("chat_logs").insert({
            "session_id": payload.session_id,
            "character_id": character_text_id,  # 영문 텍스트 저장
            "viewer_id": payload.viewer_id,
            "question": history[-1]["content"],
            "response": actual_response_content,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()

        return {"response": actual_response_content}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"[API ERROR] ask_character error for id {payload.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/start_session")
def start_session(payload: StartSessionPayload):
    try:
        new_session_id = str(uuid4())

        # payload.character_id가 uuid인지 확인, 아니면 character_id(영문 텍스트)로 조회
        from uuid import UUID
        try:
            UUID(str(payload.character_id))
            query_field = "id"
            query_value = payload.character_id
        except ValueError:
            query_field = "character_id"
            query_value = payload.character_id
        char_row = supabase.table("characters").select("id, character_id").eq(query_field, query_value).single().execute()
        if not char_row.data or "character_id" not in char_row.data:
            raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
        character_text_id = char_row.data["character_id"]
        character_uuid = char_row.data["id"]

        supabase.table("live_sessions").insert({
            "id": new_session_id,
            "character_id": character_text_id,  # 영문 텍스트 저장
            "started_at": datetime.utcnow().isoformat()
        }).execute()

        supabase.table("characters").update({"status": "라이브중"}).eq("character_id", payload.character_id).execute()

        return {"session_id": new_session_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"세션 시작 중 오류가 발생했습니다: {str(e)}")

@app.post("/end_session")
def end_session(payload: EndSessionPayload):
    now = datetime.utcnow().isoformat()
    try:
        session_data = supabase.table("live_sessions").select("character_id").eq("id", payload.session_id).single().execute()
        character_id = session_data.data["character_id"]

        supabase.table("live_sessions").update({"ended_at": now}).eq("id", payload.session_id).execute()
        supabase.table("characters").update({"status": "대기"}).eq("character_id", character_id).execute()

        return {"status": "ended", "session_id": payload.session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session end error: {str(e)}")

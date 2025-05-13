from backend.config.settings import supabase
from backend.models.schemas import CharacterPayload, CharacterCreatePayload
from fastapi import HTTPException

def get_characters():
    rows = supabase.table("characters").select("id, name").execute()
    return [{"id": row["id"], "name": row["name"]} for row in rows.data]

def create_character(payload: CharacterCreatePayload):
    try:
        supabase.table("characters").insert({
            "character_id": payload.character_id,
            "name": payload.name,
            "world": payload.world,
            "profile": payload.profile.dict(),
        }).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"캐릭터 생성 실패: {str(e)}")

def load_character(payload: CharacterPayload):
    rows = supabase.table("characters").select("*").eq("id", payload.id).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="존재하지 않는 캐릭터입니다.")
    return rows.data[0]

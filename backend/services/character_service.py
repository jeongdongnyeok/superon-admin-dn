from backend.config.settings import supabase
from backend.models.schemas import CharacterPayload, CharacterCreatePayload
from fastapi import HTTPException

def get_characters():
    rows = supabase.table("characters").select("id, name, image_url, description, status, created_at").execute()
    result = []
    for row in rows.data:
        image_url = None
        if row.get("image_url"):
            try:
                # 파일이 실제로 존재하는지 확인
                list_resp = supabase.storage.from_("character-assets/images").list(
                    path="/".join(row["image_url"].split("/")[:-1]) or "",
                    limit=1000
                )
                files = [f['name'] for f in list_resp.get('data', [])]
                filename = row["image_url"].split("/")[-1]
                if filename in files:
                    resp = supabase.storage.from_("character-assets/images").create_signed_url(row["image_url"], 60*60)
                    image_url = resp.get("signedURL")
            except Exception:
                image_url = None
        result.append({
            "id": row["id"],
            "name": row["name"],
            "description": row.get("description", ""),
            "status": row.get("status", "idle"),
            "created_at": row.get("created_at"),
            "image_url": image_url
        })
    return result

def create_character(payload: CharacterCreatePayload):
    try:
        # 추가 수정이 가능한 세계관 정보는 profile(jsonb)에 저장
        core_profile = {
            "age": payload.profile.age if hasattr(payload.profile, 'age') else None,
            "job": payload.profile.job if hasattr(payload.profile, 'job') else None,
            "gender": payload.profile.gender if hasattr(payload.profile, 'gender') else None,
            "tone": payload.profile.tone if hasattr(payload.profile, 'tone') else None,
            "perspective": payload.profile.perspective if hasattr(payload.profile, 'perspective') else None,
            "appearance": payload.profile.appearance if hasattr(payload.profile, 'appearance') else None,
            "country": payload.profile.country if hasattr(payload.profile, 'country') else None,
            "taboo_topic": payload.profile.taboo_topic if hasattr(payload.profile, 'taboo_topic') else None,
            "examples": payload.profile.examples if hasattr(payload.profile, 'examples') else None,
            "relationships": payload.profile.relationships if hasattr(payload.profile, 'relationships') else None,
            "background": payload.profile.background if hasattr(payload.profile, 'background') else None,
        }
        result = supabase.table("characters").insert({
            "name": payload.name,
            "description": getattr(payload, 'description', None),
            "image_url": getattr(payload, 'image_url', None),
            "profile": core_profile,
            "status": "idle"
        }).execute()
        # 생성된 캐릭터의 id(uuid)를 응답에 포함
        if result.data and len(result.data) > 0:
            character_id = result.data[0].get("id")
            return {"success": True, "id": character_id}
        else:
            return {"success": False, "message": "id를 반환받지 못함"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"캐릭터 생성 실패: {str(e)}")

def load_character(payload: CharacterPayload):
    rows = supabase.table("characters").select("*").eq("id", payload.id).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="존재하지 않는 캐릭터입니다.")
    character = rows.data[0]
    image_url = None
    if character.get("image_url"):
        try:
            list_resp = supabase.storage.from_("character-assets/images").list(
                path="/".join(character["image_url"].split("/")[:-1]) or "",
                limit=1000
            )
            files = [f['name'] for f in list_resp.get('data', [])]
            filename = character["image_url"].split("/")[-1]
            if filename in files:
                resp = supabase.storage.from_("character-assets/images").create_signed_url(character["image_url"], 60*60)
                image_url = resp.get("signedURL")
        except Exception:
            image_url = None
    character["image_url"] = image_url
    return character

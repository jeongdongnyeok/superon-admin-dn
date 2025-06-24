from fastapi import APIRouter
from backend.models.schemas import CharacterPayload, CharacterCreatePayload
from backend.services.character_service import get_characters, create_character, load_character, get_character_profile, update_character_profile
from fastapi import HTTPException

router = APIRouter(prefix="/characters")

@router.get("")
def list_characters():
    return get_characters()

@router.post("/create")
def create_character_route(payload: CharacterCreatePayload):
    # CharacterCreatePayload.profile now includes 'country'
    return create_character(payload)

@router.post("/load")
def load_character_route(payload: CharacterPayload):
    return load_character(payload)

@router.get("/{id}/profile")
def get_profile(id: str):
    profile = get_character_profile(id)
    if profile is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 캐릭터입니다.")
    return profile

@router.put("/{id}/profile")
def put_profile(id: str, profile: dict):
    updated = update_character_profile(id, profile)
    if not updated:
        raise HTTPException(status_code=404, detail="존재하지 않는 캐릭터입니다.")
    return {"success": True}

from fastapi import APIRouter
from backend.models.schemas import CharacterPayload, CharacterCreatePayload
from backend.services.character_service import get_characters, create_character, load_character

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

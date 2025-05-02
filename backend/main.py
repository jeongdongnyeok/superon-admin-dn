# backend/main.py

from fastapi import FastAPI, Request
from pydantic import BaseModel
from .rag.chain import load_character_chain, ask_character
import os
from dotenv import load_dotenv

# 멀티프로세스에서도 정확한 경로에서 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))


app = FastAPI()

class CharacterPayload(BaseModel):
    id: str
    world: str

class AskPayload(BaseModel):
    id: str
    question: str

@app.post("/load_character")
def load_character(payload: CharacterPayload):
    load_character_chain(payload.id, payload.world)
    return {"status": "success"}

@app.post("/ask_character")
def ask(payload: AskPayload):
    response = ask_character(payload.id, payload.question)
    return {"response": response}
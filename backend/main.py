# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware # 추가
from pydantic import BaseModel
from .rag.chain import load_character_chain, ask_character
import os
from dotenv import load_dotenv

# 멀티프로세스에서도 정확한 경로에서 로드
# main.py 기준 프로젝트 루트의 .env를 사용하도록 경로 수정 (chain.py와 일관성 고려)
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
# load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env")) # 기존 코드
load_dotenv(dotenv_path=dotenv_path)
print(f"[DEBUG] main.py: Loading .env from: {dotenv_path}")


app = FastAPI()

# CORS 미들웨어 설정 추가
origins = [
    "http://localhost:3000",  # Next.js 개발 서버 주소
    # "https://your-render-app-name.onrender.com" # Render 배포 주소 (필요시 추가)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

class CharacterPayload(BaseModel):
    id: str
    world: str

class AskPayload(BaseModel):
    id: str
    question: str

@app.post("/load_character")
def load_character(payload: CharacterPayload):
    print(f"[API DEBUG] /load_character called with id: {payload.id}, world: {payload.world[:50]}...") # world는 너무 길 수 있으니 일부만 로깅
    try:
        load_character_chain(payload.id, payload.world)
        return {"status": "success", "message": f"Character {payload.id} loaded successfully."}
    except Exception as e:
        print(f"[API ERROR] Error loading character {payload.id}: {e}")
        # 실제 운영시에는 더 구체적인 HTTP 에러 반환 고려
        return {"status": "error", "message": str(e)}, 500


@app.post("/ask_character")
def ask(payload: AskPayload):
    print(f"[API DEBUG] /ask_character called for id: {payload.id}, question: {payload.question}")
    try:
        response = ask_character(payload.id, payload.question)
        return {"response": response}
    except Exception as e:
        print(f"[API ERROR] Error asking character {payload.id}: {e}")
        return {"status": "error", "message": str(e)}, 500
# backend/main.py

from fastapi import FastAPI, Request, HTTPException
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

class CharacterProfile(BaseModel):
    name: str
    style: str
    perspective: str
    tone: str

class CharacterPayload(BaseModel):
    id: str
    world: str
    profile: CharacterProfile

class AskPayload(BaseModel):
    id: str
    question: str

@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running"}

@app.post("/load_character")
def load_character(payload: CharacterPayload):
    print(f"[API DEBUG] /load_character called with id: {payload.id}")
    try:
        load_character_chain(
            character_id=payload.id,
            world_text=payload.world,
            character_profile=payload.profile.dict()
        )
        return {"status": "success", "message": f"Character {payload.id} loaded successfully."}
    except Exception as e:
        print(f"[API ERROR] Error loading character {payload.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask_character")
def ask(payload: AskPayload):
    print(f"[API DEBUG] /ask_character called for id: {payload.id}, question: {payload.question}")
    try:
        # ask_character가 AIMessage 같은 객체를 반환하거나, 오류 시 문자열을 반환할 수 있음
        raw_response = ask_character(payload.id, payload.question)

        actual_response_content = ""
        if hasattr(raw_response, 'content'): # AIMessage 등의 Langchain 메시지 객체인 경우
            actual_response_content = raw_response.content
        elif isinstance(raw_response, str): # 이미 문자열인 경우 (e.g., ask_character 내부 오류)
            actual_response_content = raw_response
        else:
            # 예기치 않은 타입의 응답 처리
            print(f"[API WARN] Unexpected response type from ask_character: {type(raw_response)}, value: {raw_response}")
            # 이 경우, 객체를 문자열로 변환하거나, 에러를 발생시킬 수 있습니다.
            # 기본적으로는 에러로 처리하여 원인 파악을 용이하게 함
            raise HTTPException(status_code=500, detail=f"캐릭터로부터 예기치 않은 응답 형식: {type(raw_response)}")

        if actual_response_content is None: 
            print(f"[API WARN] ask_character returned None or empty content for id: {payload.id}, question: {payload.question}")
            raise HTTPException(status_code=500, detail="캐릭터로부터 응답 내용을 가져오지 못했습니다.")
        
        # 프론트엔드에는 추출된 텍스트 content를 전달
        return {"response": actual_response_content} 
    except HTTPException as http_exc: # 이미 처리된 HTTPException은 그대로 전달
        raise http_exc
    except Exception as e:
        print(f"[API ERROR] Error asking character {payload.id}: {e}")
        # 좀 더 일반적인 에러 메시지를 프론트엔드에 전달
        raise HTTPException(status_code=500, detail=f"질문 처리 중 서버 오류 발생: {str(e)}")
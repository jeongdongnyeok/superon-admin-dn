from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.character import router as character_router
from backend.routers.session import router as session_router
from backend.routers.chat import router as chat_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(character_router)
app.include_router(session_router)
app.include_router(chat_router)



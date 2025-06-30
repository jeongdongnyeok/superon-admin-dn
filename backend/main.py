from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.responses import Response

from backend.routers.obs import router as obs_router
from backend.routers.motion import router as motion_router
from backend.routers.character import router as character_router
from backend.routers.session import router as session_router
from backend.routers.tiktok import router as tiktok_router
from backend.routers.chat import router as chat_router
from backend.routers.tts import router as tts_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(character_router)
app.include_router(obs_router)
app.include_router(motion_router)
app.include_router(session_router)
app.include_router(tiktok_router)
app.include_router(chat_router)
app.include_router(tts_router)

# Broadcast router 추가
from backend.routers.broadcast import router as broadcast_router
app.include_router(broadcast_router)

# Always use absolute path for assets directory
assets_dir = Path(__file__).parent / "assets"
assets_dir.mkdir(exist_ok=True)

# Mount static files with CORS header for video playback
class CORSMiddlewareStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

app.mount(
    "/assets",
    CORSMiddlewareStaticFiles(directory=str(assets_dir)),
    name="assets"
)

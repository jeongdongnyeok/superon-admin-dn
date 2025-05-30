from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, UploadFile, File, Form, Depends
from typing import List, Optional
from backend.services.obs_service import obs_service
from backend.services.supabase_client import supabase
import os

router = APIRouter(
    prefix="/obs",
    tags=["OBS"]
)

obs_router = router  # main.py에서 from backend.routers.obs import obs_router 형태로 사용

# ==================== OBS WebSocket 및 상태 관리 ====================

@router.websocket("/ws")
async def obs_websocket_endpoint(websocket: WebSocket):
    """
    OBS Studio와의 실시간 WebSocket 통신 엔드포인트.
    - OBS Studio와의 상태, 로그, 이벤트 실시간 송수신 처리
    - 어드민에서 이 엔드포인트로 연결하여 상태 모니터링 가능
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # TODO: OBS와 연동된 메시지 처리 및 상태 전송
            await websocket.send_text(f"Received: {data}")
    except WebSocketDisconnect:
        # TODO: 연결 해제 처리
        pass

@router.post("/connect")
async def connect_obs():
    """
    OBS Studio에 연결 시도
    """
    success = obs_service.connect()
    if not success:
        raise HTTPException(status_code=500, detail="OBS 연결 실패")
    return {"message": "OBS 연결 성공"}

@router.post("/disconnect")
async def disconnect_obs():
    """
    OBS Studio 연결 해제
    """
    success = obs_service.disconnect()
    if not success:
        raise HTTPException(status_code=500, detail="OBS 연결 해제 실패")
    return {"message": "OBS 연결 해제"}

@router.get("/status")
async def obs_status():
    """
    OBS 연결 상태/헬스체크/로그 반환 (어드민에서 상태 모니터링용)
    """
    status = obs_service.get_status()
    # TODO: 로그 연동 시 logs 필드 추가
    return {"connected": status["connected"], "logs": ["상태 조회"]}

@router.post("/stream/start")
async def start_stream():
    """
    OBS Studio에서 스트리밍 시작 제어
    """
    success = obs_service.start_stream()
    if not success:
        raise HTTPException(status_code=500, detail="스트리밍 시작 실패")
    return {"message": "스트리밍 시작"}

@router.post("/stream/stop")
async def stop_stream():
    """
    OBS Studio에서 스트리밍 종료 제어
    """
    success = obs_service.stop_stream()
    if not success:
        raise HTTPException(status_code=500, detail="스트리밍 종료 실패")
    return {"message": "스트리밍 종료"}

@router.post("/scene/switch")
async def switch_scene(scene_name: str = Form(...)):
    """
    OBS Studio의 씬 전환 제어
    """
    success = obs_service.switch_scene(scene_name)
    if not success:
        raise HTTPException(status_code=500, detail="씬 전환 실패")
    return {"message": f"씬 전환: {scene_name}"}

@router.post("/tts/play")
async def play_tts_audio(audio_url: str = Form(...)):
    """
    OBS Studio에서 TTS 오디오 출력 제어
    """
    # TODO: obs_service.play_tts_audio 구현 필요
    return {"message": f"TTS 오디오 재생: {audio_url}"}

# ==================== 캐릭터별 모션/감정 태깅 관리 ====================

@router.get("/character/{character_id}/motions")
async def get_character_motions(character_id: int):
    """
    특정 캐릭터의 모션/감정 태깅 리스트 반환 (Supabase 연동)
    """
    resp = supabase.table("character_motions").select("id, tag, video_url, audio_url").eq("character_id", character_id).execute()
    motions = resp.data if hasattr(resp, 'data') else resp
    return {"character_id": character_id, "motions": motions}

@router.post("/character/{character_id}/motions")
async def add_character_motion(
    character_id: int,
    tag: str = Form(...),
    video: UploadFile = File(...),
    audio: UploadFile = File(...)
):
    """
    Supabase Storage에 파일 업로드 후, character_motions 테이블에 메타데이터 저장
    """
    # Supabase Storage 버킷 이름
    bucket = "character-assets"
    video_path = f"character/{character_id}/motions/{tag}/{video.filename}"
    audio_path = f"character/{character_id}/motions/{tag}/{audio.filename}"
    # 영상 업로드
    video_bytes = await video.read()
    audio_bytes = await audio.read()
    supabase.storage().from_(bucket).upload(video_path, video_bytes, {"content-type": video.content_type})
    supabase.storage().from_(bucket).upload(audio_path, audio_bytes, {"content-type": audio.content_type})
    video_url = f"/storage/v1/object/public/{bucket}/{video_path}"
    audio_url = f"/storage/v1/object/public/{bucket}/{audio_path}"
    # DB 등록
    resp = supabase.table("character_motions").insert({
        "character_id": character_id,
        "tag": tag,
        "video_url": video_url,
        "audio_url": audio_url
    }).execute()
    motion_id = resp.data[0]["id"] if hasattr(resp, 'data') and resp.data else None
    return {"message": "모션/감정 태깅 등록 완료", "character_id": character_id, "tag": tag, "id": motion_id}

# ==================== 기타 ====================
# 실제 OBS 연동 및 캐릭터/모션 관리 로직은 서비스 레이어로 분리해서 구현하는 것을 권장합니다.

from fastapi import APIRouter, Request, Response, HTTPException
from backend.config.settings import ELEVENLABS_API_KEY
import httpx
import re

router = APIRouter(prefix="/tts")

# ElevenLabs 기본값: "Rachel" voice (voice_id는 실제 사용 시 캐릭터별로 전달)
DEFAULT_VOICE_ID = "MpbDJfQJUYUnp0i1QvOZ"  # hunmin

def clean_response_text(text: str) -> str:
    """
    Clean the response text by:
    1. Removing all content within square brackets (emotion/action tags)
    2. Removing any leading 'A:' or 'a:' prefix
    3. Cleaning up whitespace
    """
    # Remove all content within square brackets, including the brackets themselves
    text = re.sub(r'\[.*?\]', '', text)
    # Remove any leading 'A:' or 'a:' prefix
    text = re.sub(r'^[aA]:\s*', '', text)
    # Clean up any double spaces or leading/trailing spaces
    return ' '.join(text.split()).strip()

@router.post("/stream")
async def tts_stream(request: Request):
    data = await request.json()
    provider = data.get("provider", "elevenlabs")
    # Prefer clean_response if provided, otherwise clean the text
    clean_text = data.get("clean_response")
    if clean_text is None:
        text = data.get("text")
        if not text:
            raise HTTPException(status_code=400, detail="text 또는 clean_response 필드가 필요합니다.")
        clean_text = clean_response_text(text)

    if provider == "elevenlabs":
        voice_id = data.get("voice_id") or DEFAULT_VOICE_ID
        if not ELEVENLABS_API_KEY:
            raise HTTPException(status_code=500, detail="ElevenLabs API 키가 설정되지 않았습니다.")

        eleven_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        # Optimized settings for Korean speech
        payload = {
            "text": clean_text,
            "model_id": "eleven_multilingual_v2",  # Use multilingual model for better Korean support
            "voice_settings": {
                "stability": 0.6,          # Slightly more stable for clearer speech
                "similarity_boost": 0.8,   # Slightly higher for better pronunciation
                "style": 0.4,              # Add slight style for more natural speech
                "use_speaker_boost": True  # Enable speaker boost for clarity
            },
            "model_settings": {
                "enhancement": "high"      # Enable enhancement for better quality
            },
            "language_id": "ko"          # Explicitly set language to Korean
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(eleven_url, headers=headers, json=payload)
                content_type = resp.headers.get("content-type", "")
                if resp.status_code == 200 and "audio/mpeg" in content_type:
                    audio_bytes = resp.content
                    from fastapi.responses import Response
                    return Response(content=audio_bytes, media_type="audio/mpeg")
                # 에러 응답 처리
                from fastapi.responses import JSONResponse
                detail = resp.text
                return JSONResponse(
                    status_code=resp.status_code,
                    content={"detail": f"TTS API 오류: {detail}"}
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TTS 변환 실패: {str(e)}")
    elif provider == "gemini":
        # TODO: Implement Google Gemini TTS integration here
        raise HTTPException(status_code=501, detail="Google Gemini TTS는 아직 구현되지 않았습니다.")
    else:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 TTS provider: {provider}")


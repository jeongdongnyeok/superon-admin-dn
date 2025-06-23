import pytest
from fastapi.testclient import TestClient
from backend.main import app

# 테스트용 캐릭터/세션/뷰어 정보 (실제 DB에 존재하는 값으로 맞춰야 함)
TEST_CHARACTER_ID = "65d3ca8d-3fa2-47a8-b736-8a95d625b11a"
TEST_SESSION_ID = "65d3ca8d-3fa2-47a8-b736-8a95d625b11a"
TEST_VIEWER_ID = "test-viewer-id"

client = TestClient(app)

def test_chat_ask_basic():
    # 대화 히스토리 예시
    payload = {
        "id": TEST_CHARACTER_ID,
        "session_id": TEST_SESSION_ID,
        "viewer_id": TEST_VIEWER_ID,
        "history": [
            {"role": "user", "content": "안녕! 오늘 기분 어때?"}
        ]
    }
    response = client.post("/chat/ask", json=payload)
    if response.status_code != 200:
        print("TEST FAIL RESPONSE:", response.status_code, response.json())
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "emotion" in data
    if data["emotion"] is None:
        print("DEBUG: emotion is None, full response:", data)
    # 감정 태그가 올바른 값인지 확인 (예: happy, sad 등)
    assert data["emotion"] in [
        "neutral", "happy", "sad", "angry", "fear", "surprise", "disgust"
    ]
    assert isinstance(data["response"], str)

import requests

url = "http://localhost:8000/tts/stream"
payload = {
    "text": "안녕하세요. ElevenLabs TTS 한국어 스트리밍 테스트입니다. 오늘 하루도 힘내시고, 항상 행복하세요!",
    "voice_id": "ZQe5CZNOzWyzPSCn5a3c"
}
response = requests.post(url, json=payload, stream=False)
print(f"Status: {response.status_code}")
print(response.text)

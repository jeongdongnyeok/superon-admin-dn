import os
from dotenv import load_dotenv
from supabase import create_client

# Load .env
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ElevenLabs TTS
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# .env 파일에 다음과 같이 추가하세요:
# ELEVENLABS_API_KEY=sk_a86ccf48cdf947147da2cd08e66ff6e8b5df6859d1b314ce

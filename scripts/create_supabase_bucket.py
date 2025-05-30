import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BUCKET_NAME = "character-assets"

try:
    supabase.storage.create_bucket(BUCKET_NAME)
    print(f"Bucket '{BUCKET_NAME}' created.")
    print("\n[!] 버킷 public read 정책은 Supabase 대시보드에서 직접 추가하세요.\n")
except Exception as e:
    if "already exists" in str(e):
        print(f"Bucket '{BUCKET_NAME}' already exists.")
    else:
        print(f"Error creating bucket: {e}")

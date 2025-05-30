import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 기존 버킷/폴더
SOURCE_BUCKET = "character-images"
TARGET_BUCKET = "character-assets"
TARGET_PREFIX = "images/"  # character-assets/images/ 하위로 복사

# 복사할 경로들 (characters/, private/characters/)
COPY_PATHS = ["characters", "private/characters"]

# 1. images 버킷의 모든 파일 가져오기
def list_all_files(bucket, path=""):
    all_files = []
    try:
        resp = supabase.storage.from_(bucket).list(path)
        for file in resp:
            full_path = f"{path}/{file['name']}" if path else file['name']
            print(f"[LIST] {full_path} (id={file['id']})")
            # 파일: mimetype이 존재
            if file.get("metadata", {}).get("mimetype"):
                all_files.append(full_path)
            else:  # 폴더
                all_files += list_all_files(bucket, full_path)
    except Exception as e:
        print(f"[ERROR] list_all_files({bucket}, {path}): {e}")
    return all_files

# 2. 파일 복사 (다운로드 후 업로드)
def copy_file(filename):
    # 다운로드
    file_resp = supabase.storage.from_(SOURCE_BUCKET).download(filename)
    if not file_resp:
        print(f"[FAIL] Download: {filename}")
        return False
    target_path = TARGET_PREFIX + filename
    # 업로드 전 삭제 시도(존재하지 않으면 무시)
    try:
        supabase.storage.from_(TARGET_BUCKET).remove([target_path])
        print(f"[DEL] 기존 파일 삭제: {target_path}")
    except Exception as e:
        print(f"[WARN] Delete before upload: {e}")
    # 업로드
    if hasattr(file_resp, 'read'):
        data = file_resp.read()
    else:
        data = file_resp
    up_resp = supabase.storage.from_(TARGET_BUCKET).upload(target_path, data)
    if hasattr(up_resp, "error") and up_resp.error:
        print(f"[FAIL] Upload: {filename} -> {target_path} ({up_resp.error})")
        return False
    print(f"[OK] {filename} -> {TARGET_BUCKET}/{target_path}")
    return True

if __name__ == "__main__":
    all_files = []
    for base in COPY_PATHS:
        all_files += list_all_files(SOURCE_BUCKET, base)
    print(f"[DEBUG] 최종 복사 대상 파일 리스트: {all_files}")
    if not all_files:
        print("[WARN] 복사할 파일이 없습니다! (all_files is empty)")
    for f in all_files:
        print(f"[COPY] {f}")
        copy_file(f)
    print("이미지 복사 완료!")

    # 복사한 파일 character-images 버킷에서 일괄 삭제
    try:
        del_resp = supabase.storage.from_(SOURCE_BUCKET).remove(all_files)
        print(f"[DEL] character-images 버킷에서 파일 일괄 삭제 완료! (총 {len(all_files)}개)")
    except Exception as e:
        print(f"[FAIL] character-images 버킷 파일 삭제 실패: {e}")

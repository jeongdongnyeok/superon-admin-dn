from fastapi import APIRouter, HTTPException, Query
import subprocess
import os
import sys
import logging
from pymongo import MongoClient
from typing import List

router = APIRouter(prefix="/broadcast")

import uuid

from backend.config.settings import supabase
from datetime import datetime

# TikTokLive 상태 확인 엔드포인트 추가
from TikTokLive import TikTokLiveClient
import asyncio

@router.get("/status")
async def get_broadcast_status(room_id: str = Query(..., description="TikTok 계정 아이디")):
    """
    TikTok 계정(room_id)이 현재 라이브 방송 중인지 확인
    - room_id: TikTok 방송 계정 아이디
    - return: { is_live: bool, detail: str (optional) }
    """
    if not room_id:
        raise HTTPException(status_code=400, detail="Room ID(계정 아이디)가 없습니다.")
    try:
        client = TikTokLiveClient(unique_id=room_id)
        try:
            is_live = await client.is_live()
            return {"is_live": is_live}
        except Exception as sub_e:
            return {"is_live": False, "detail": f"TikTokLive API 오류: {str(sub_e)}"}
    except Exception as e:
        return {"is_live": False, "detail": f"서버 오류: {str(e)}"}

from pydantic import BaseModel

class StartBroadcastRequest(BaseModel):
    room_id: str
    character_id: str

@router.post("/start")
async def start_broadcast(req: StartBroadcastRequest):
    room_id = req.room_id
    character_id = req.character_id
    """
    방송 시작 시 TikTokLive 이벤트 Collector를 subprocess로 실행 (Redis 버퍼링 시작)
    새로운 session_id를 생성하여 반환
    supabase의 live_sessions에 insert
    """
    import sys
    # room_id는 TikTok 방송 계정 아이디(문자열)로 사용됨
    print(f"[start_broadcast] called with room_id={room_id}", file=sys.stderr)
    if not room_id:
        print("[start_broadcast] room_id is missing", file=sys.stderr)
        raise HTTPException(status_code=400, detail="Room ID(계정 아이디)가 없습니다.")
    if not character_id:
        print("[start_broadcast] character_id is missing", file=sys.stderr)
        raise HTTPException(status_code=400, detail="캐릭터 ID가 없습니다.")
    try:
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        print(f"[start_broadcast] Generated session_id={session_id}, now={now}", file=sys.stderr)
        # supabase live_sessions에 insert
        try:
            print(f"[start_broadcast] Inserting session to supabase: id={session_id}, room_id={room_id}", file=sys.stderr)
            supabase.table("live_sessions").insert({
                "id": session_id,
                "room_id": room_id,
                "character_id": character_id,
                "started_at": now,
                "ended_at": None
            }).execute()
        except Exception as e:
            print(f"[start_broadcast] Supabase insert error: {e}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"방송 세션 DB 기록 실패: {str(e)}")
        # TikTokLive 이벤트 Collector 실행
        try:
            print(f"[start_broadcast] Launching collector subprocess for room_id={room_id}, session_id={session_id}", file=sys.stderr)
            import os
            collector_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "services", "tiktoklive_event_collector.py")
            )
            # Collector subprocess 실행 및 PID 파일 저장
            proc = subprocess.Popen([
                "python3",
                collector_path,
                "--room_id", room_id,
                "--session_id", session_id,
            ])
            # 세션별 collector PID를 파일에 저장 및 실제 PID 로그 남김
            pid_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "collector_pids"))
            os.makedirs(pid_dir, exist_ok=True)
            pid_file = os.path.join(pid_dir, f"collector_{room_id}_{session_id}.pid")
            with open(pid_file, "w") as f:
                f.write(str(proc.pid))
            print(f"[start_broadcast] Collector subprocess started with PID: {proc.pid}", file=sys.stderr)
            print(f"[start_broadcast] Collector PID 파일 위치: {pid_file}", file=sys.stderr)
        except Exception as e:
            print(f"[start_broadcast] Collector launch error: {e}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"Collector 실행 실패: {str(e)}")
        print(f"[start_broadcast] Success: session_id={session_id}", file=sys.stderr)
        return {"message": "방송 시작 및 Collector 실행", "session_id": session_id}
    except HTTPException as e:
        print(f"[start_broadcast] HTTPException: {e.detail}", file=sys.stderr)
        raise e
    except Exception as e:
        print(f"[start_broadcast] Unknown error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"알 수 없는 오류: {str(e)}")


from pydantic import BaseModel

class StopBroadcastRequest(BaseModel):
    room_id: str
    session_id: str

@router.post("/stop")
async def stop_broadcast(req: StopBroadcastRequest):
    room_id = req.room_id
    session_id = req.session_id
    """
    방송 종료 시점에 TikTokLive 이벤트를 MongoDB로 아카이브 (batch worker 실행)
    supabase의 live_sessions에 ended_at 기록
    종료 로그를 MongoDB에도 저장
    """
    if not room_id or not session_id:
        raise HTTPException(status_code=400, detail="Room ID 또는 Session ID가 누락되었습니다.")
    try:
        ended_at = datetime.now().isoformat()
        # supabase live_sessions에 ended_at 기록
        try:
            supabase.table("live_sessions").update({"ended_at": ended_at}).eq("id", session_id).execute()
            print(f"[stop_broadcast] Ended at recorded in supabase: session_id={session_id}, ended_at={ended_at}", file=sys.stderr)
        except Exception as e:
            print(f"[stop_broadcast] Supabase update error: {e}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"방송 종료 DB 기록 실패: {str(e)}")
        
        # Collector 프로세스 종료 시도 (PID 파일 기반)
        import signal
        import time
        pid_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "collector_pids"))
        pid_file = os.path.join(pid_dir, f"collector_{room_id}_{session_id}.pid")
        if os.path.exists(pid_file):
            try:
                import psutil
            except ImportError:
                psutil = None
            try:
                with open(pid_file, "r") as f:
                    collector_pid = int(f.read().strip())
                print(f"[stop_broadcast] Stopping collector PID: {collector_pid}", file=sys.stderr)
                if psutil:
                    print(f"[stop_broadcast] psutil.pid_exists({collector_pid}): {psutil.pid_exists(collector_pid)}", file=sys.stderr)
                os.kill(collector_pid, signal.SIGTERM)
                # 종료 대기 (최대 2초, 4x 0.5s)
                for _ in range(4):
                    try:
                        os.kill(collector_pid, 0)
                        time.sleep(0.5)
                    except OSError:
                        print(f"[stop_broadcast] Collector PID {collector_pid} 종료 확인", file=sys.stderr)
                        collector_stopped = True
                        break
                else:
                    print(f"[stop_broadcast] Collector PID {collector_pid}가 종료되지 않음. SIGKILL 시도", file=sys.stderr)
                    os.kill(collector_pid, signal.SIGKILL)
                    # SIGKILL 후 1초 대기 후 상태 체크
                    time.sleep(1)
                    if psutil and psutil.pid_exists(collector_pid):
                        print(f"[stop_broadcast][WARNING] Collector PID {collector_pid} still alive after SIGKILL (1s wait)!", file=sys.stderr)
                        # 추가로 현재 살아있는 자식 프로세스/스레드 로그
                        try:
                            children = psutil.Process(collector_pid).children(recursive=True)
                            if children:
                                print(f"[stop_broadcast][WARNING] Collector child processes after SIGKILL: {[c.pid for c in children]}", file=sys.stderr)
                        except Exception as child_e:
                            print(f"[stop_broadcast][WARNING] Could not get child processes: {child_e}", file=sys.stderr)
                    else:
                        print(f"[stop_broadcast] Collector PID {collector_pid} 완전히 종료됨", file=sys.stderr)
                if psutil:
                    still_alive_pids = [p.info for p in psutil.process_iter(['pid', 'name']) if p.info['pid'] == collector_pid]
                    if still_alive_pids:
                        print(f"[stop_broadcast][WARNING] Still alive PIDs: {still_alive_pids}", file=sys.stderr)
                if psutil and psutil.pid_exists(collector_pid):
                    print(f"[stop_broadcast][WARNING] Collector process is still alive after SIGTERM/SIGKILL!", file=sys.stderr)
                else:
                    print(f"[stop_broadcast] Collector process is terminated.", file=sys.stderr)
                os.remove(pid_file)
            except Exception as e:
                print(f"[stop_broadcast] Collector 종료 실패: {e}", file=sys.stderr)
        else:
            print(f"[stop_broadcast] Collector PID 파일 없음: {pid_file}", file=sys.stderr)
        
        # Batch Worker 실행 (이벤트 아카이브)
        batch_worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../services/tiktoklive_batch_worker.py'))
        log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f'../tiktoklive_batch_worker.log'))
        cmd = [sys.executable, batch_worker_path, '--room_id', room_id, '--session_id', session_id]
        try:
            logging.info(f"[Broadcast] Launching batch worker: {' '.join(cmd)} | log: {log_path}")
            print(f"[stop_broadcast] batch_worker exists: {os.path.exists(batch_worker_path)}", file=sys.stderr)
            print(f"[stop_broadcast] batch_worker permissions: {oct(os.stat(batch_worker_path).st_mode)}", file=sys.stderr)
            print(f"[stop_broadcast] sys.executable: {sys.executable}", file=sys.stderr)
            with open(log_path, 'a') as log_file:
                proc = subprocess.Popen(
                    cmd,
                    stdout=log_file,
                    stderr=log_file,
                    cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')),
                )
                print(f"[stop_broadcast] Batch worker Popen PID: {proc.pid}", file=sys.stderr)
            logging.info(f"[Broadcast] Batch worker process launched successfully. PID: {proc.pid}")
        except Exception as e:
            import traceback
            print(f"[stop_broadcast] Batch worker launch error: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"Batch worker 실행 실패: {str(e)}")
        # TODO: 방송 종료 시 collector 프로세스 명시적 종료 로직 필요 (PID 관리 또는 종료 플래그 활용)
        return {"message": "방송 종료 및 이벤트 아카이브 시작", "ended_at": ended_at}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알 수 없는 오류: {str(e)}")

@router.get("/events")
async def get_broadcast_events(
    room_id: str = Query(..., description="방송 room_id"),
    session_id: str = Query(..., description="방송 session_id"),
    limit: int = Query(100, description="최대 반환 이벤트 수 (기본 100)")
) -> List[dict]:
    """
    room_id와 session_id로 MongoDB에서 방송 이벤트를 조회
    """
    if not room_id or not session_id:
        raise HTTPException(status_code=400, detail="Room ID 또는 Session ID가 누락되었습니다.")
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB")
    mongo_collection = os.getenv("MONGO_BROADCAST_COLLECTION", "broadcast_events")
    if not (mongo_uri and mongo_db):
        raise HTTPException(status_code=500, detail="MongoDB 환경변수(MONGO_URI, MONGO_DB)가 설정되어 있지 않습니다.")
    try:
        client = MongoClient(mongo_uri)
        db = client[mongo_db]
        collection = db[mongo_collection]
        query = {"room_id": room_id, "session_id": session_id}
        events = list(collection.find(query).sort("timestamp", 1).limit(limit))
        for event in events:
            event["_id"] = str(event["_id"])
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB 조회 오류: {str(e)}")

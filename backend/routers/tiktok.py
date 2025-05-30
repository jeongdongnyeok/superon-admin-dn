from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from pydantic import BaseModel
from TikTokLive import TikTokLiveClient
from TikTokLive.events import CommentEvent
from fastapi.responses import JSONResponse
import asyncio
import traceback

router = APIRouter()

# 메모리 내에 연결된 websocket 목록
websocket_clients = set()

# --- TikTokLive 세션 관리용 ---
running_clients = {}

class TikTokStartRequest(BaseModel):
    unique_id: str

@router.post("/tiktok/start")
async def start_tiktok_stream(request: TikTokStartRequest, background_tasks: BackgroundTasks):
    print(f"[BACKEND] /tiktok/start called with unique_id: {request.unique_id}")
    try:
        # 이미 실행 중인 경우 중복 실행 방지
        if request.unique_id in running_clients:
            return {"message": "이미 해당 Room ID로 TikTokLive가 실행 중입니다."}
        # 백그라운드로 리스너 실행 및 추적
        task = background_tasks.add_task(run_tiktok_listener, request.unique_id)
        running_clients[request.unique_id] = task
        return {"message": "틱톡 방송을 시작했습니다."}
    except Exception as e:
        print("틱톡 방송 시작 실패:")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"message": f"틱톡 방송 시작에 실패했습니다: {str(e)}"}
        )

class TikTokStopRequest(BaseModel):
    unique_id: str

@router.post("/tiktok/stop")
async def stop_tiktok_listener(request: Request):
    data = await request.json()
    unique_id = data.get("unique_id")
    # 실제로 TikTokLive listener를 종료하는 로직 구현
    # 예시: 백그라운드 태스크/소켓 관리 dict에서 해당 unique_id 세션 종료
    if unique_id in running_clients:
        if app and unique_id in app.state.tiktok_tasks:
            task = app.state.tiktok_tasks[unique_id]
            task.cancel()
            del app.state.tiktok_tasks[unique_id]
        del running_clients[unique_id]
        print(f"[STOP] TikTokLive listener 종료: {unique_id}")
        return {"message": f"TikTokLive listener stopped for {unique_id}"}
    else:
        print(f"[STOP] 종료 요청: 이미 종료되었거나 세션 없음: {unique_id}")
        return {"message": f"No active TikTokLive listener for {unique_id}"}

# 백그라운드에서 TikTok 채팅 수집 및 WebSocket으로 전송
import time
from websockets.exceptions import ConnectionClosedError

def run_tiktok_listener(unique_id: str, max_retries: int = 2, retry_delay: int = 5):
    print(f"[BACKEND] run_tiktok_listener started with unique_id: {unique_id}")
    retries = 0
    while retries <= max_retries:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            client = TikTokLiveClient(unique_id=unique_id)

            # 상태 전송 함수
            async def send_status_to_clients(status, detail=None):
                msg = {"type": "status", "status": status}
                if detail:
                    msg["detail"] = detail
                for ws in list(websocket_clients):
                    try:
                        asyncio.create_task(ws.send_json(msg))
                    except Exception:
                        print("WebSocket 상태 전송 중 예외:")
                        print(traceback.format_exc())

            # 연결 시도 상태 알림
            loop.run_until_complete(send_status_to_clients(
                "connecting" if retries == 0 else "reconnecting",
                f"{retries+1}번째 연결 시도 중"
            ))
            print(f"[BACKEND] TikTokLiveClient 연결 시도 ({retries+1}/{max_retries+1})")

            @client.on(CommentEvent)
            async def on_comment(event: CommentEvent):
                chat = {"user": event.user.nickname, "comment": event.comment}
                print(f"[BACKEND] 채팅 수신: {chat}")
                for ws in list(websocket_clients):
                    try:
                        asyncio.create_task(ws.send_json(chat))
                    except Exception:
                        print("WebSocket 전송 중 예외:")
                        print(traceback.format_exc())

            # 연결 성공 상태 알림
            loop.run_until_complete(send_status_to_clients("connected"))
            client.run()
            # 정상 종료 시 break
            break
        except (ConnectionClosedError, ConnectionResetError) as e:
            retries += 1
            msg = f"[BACKEND] TikTok 연결 끊김, {retries}회 재시도: {str(e)}"
            print(msg)
            loop.run_until_complete(send_status_to_clients("reconnecting", msg))
            time.sleep(retry_delay)
        except Exception as e:
            print("run_tiktok_listener 예외 발생:")
            err_msg = traceback.format_exc()
            print(err_msg)
            loop.run_until_complete(send_status_to_clients("failed", err_msg))
            break
    else:
        print("[BACKEND] TikTok 라이브 재연결 최대 횟수 초과, 포기")
        # 최종 실패 상태 알림
        asyncio.run(send_status_to_clients("failed", "최대 재연결 횟수 초과"))



import requests
from fastapi.responses import JSONResponse

def check_sign_api_health(sign_api_url: str = "https://tiktok-signature.zerody.one"):
    try:
        resp = requests.get(sign_api_url, timeout=5)
        if resp.status_code == 200:
            print(f"[HEALTH] Sign API 정상 ({sign_api_url})")
            return True
        else:
            print(f"[HEALTH] Sign API 응답 코드: {resp.status_code}")
            return False
    except Exception as e:
        print(f"[HEALTH] Sign API 예외: {str(e)}")
        return False

# 터미널에서 직접 실행: python -m routers.tiktok <unique_id>
if __name__ == "__main__":
    import sys
    import asyncio
    from TikTokLive import TikTokLiveClient
    from TikTokLive.events import CommentEvent
    from TikTokLive.client.errors import SignAPIError, UserOfflineError, SignatureRateLimitError, TikTokLiveError

    unique_id = sys.argv[1] if len(sys.argv) > 1 else None
    if not unique_id:
        print("사용법: python -m routers.tiktok <unique_id>")
        sys.exit(1)

    client = TikTokLiveClient(unique_id=unique_id)

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        chat = {"user": event.user.nickname, "comment": event.comment}
        print(f"[CHAT] {chat}")

    print(f"[RUN] TikTokLive 채팅 수집 시작: {unique_id}")
    try:
        asyncio.run(client.connect())
    except SignAPIError as e:
        print(f"[ERROR] Sign API 장애: {e}")
        sys.exit(2)
    except SignatureRateLimitError as e:
        print(f"[ERROR] Sign API Rate Limit: {e}")
        sys.exit(3)
    except UserOfflineError:
        print("[ERROR] 방송이 꺼져 있습니다.")
        sys.exit(4)
    except TikTokLiveError as e:
        print(f"[ERROR] TikTokLive 기타 에러: {e}")
        sys.exit(5)
    except Exception as e:
        print(f"[ERROR] 알 수 없는 에러: {e}")
        sys.exit(6)
    finally:
        try:
            asyncio.run(client.close())
        except:
            pass
    print("[EXIT] TikTokLive 채팅 수집 종료.")

@router.websocket("/ws/tiktok")
async def tiktok_ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()  # 클라이언트 ping/pong 용
    except WebSocketDisconnect:
        websocket_clients.remove(websocket)
    except Exception:
        websocket_clients.remove(websocket)

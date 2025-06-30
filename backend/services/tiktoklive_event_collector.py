import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from TikTokLive import TikTokLiveClient
from TikTokLive.events import Event
import redis
from dotenv import load_dotenv

load_dotenv()

# 환경 변수 또는 설정에서 Redis 연결 정보 로드
def get_redis_client():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=int(os.getenv("REDIS_DB", 0)),
        username=os.getenv("REDIS_USERNAME"),
        password=os.getenv("REDIS_PASSWORD"),
        decode_responses=True,
    )

import logging

# 로그 파일 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler("tiktoklive_collector.log"),
        logging.StreamHandler()
    ]
)

class TikTokLiveEventCollector:
    def __init__(self, room_id_or_unique_id: str, session_id: str):
        self.session_id = session_id
        self.redis_client = get_redis_client()
        # Determine if input is numeric room_id or unique_id
        if room_id_or_unique_id.isdigit():
            self.room_id = room_id_or_unique_id
            self.unique_id = None
            self.client = TikTokLiveClient(room_id=int(self.room_id))
            logging.info(f"[Collector] Connecting using numeric room_id={self.room_id}")
        else:
            self.unique_id = room_id_or_unique_id
            self.room_id = None
            self.client = TikTokLiveClient(unique_id=self.unique_id)
            logging.info(f"[Collector] Connecting using unique_id={self.unique_id}")
        self._running = False
        self._setup_event_listeners()
        self._setup_signal_handlers()

    def _on_error(self, error):
        import logging
        import sys
        if isinstance(error, (SystemExit, KeyboardInterrupt)):
            # 정상 종료 신호는 무시
            return
        logging.error(f"[Collector] Uncaught error in event loop: {error}", exc_info=True)

    def _setup_event_listeners(self):
        import TikTokLive.events
        import inspect
        import logging
        logging.info("[Collector] Registering all event listeners dynamically...")

        # Dynamically register a listener for every event type
        for name, cls in inspect.getmembers(TikTokLive.events, inspect.isclass):
            if name.endswith("Event"):
                try:
                    def make_listener(_event_name, _cls):
                        @self.client.on(_cls)
                        async def _generic_listener(event):
                            logging.info(f"[Collector][Dynamic] {_event_name} triggered: {event}")
                            self._handle_event(event)
                        logging.info(f"[Collector][Dynamic] Registered listener for event type: {_event_name}")
                    make_listener(name, cls)
                except Exception as e:
                    logging.warning(f"[Collector][Dynamic] Failed to register listener for {name}: {e}")

        # Print all available event types for debugging
        try:
            logging.info(f"[Collector] Available TikTokLive event types: {dir(TikTokLive.events)}")
        except Exception as e:
            logging.warning(f"[Collector] Could not list TikTokLive event types: {e}")

    def _setup_signal_handlers(self):
        import signal
        def handle_sigterm(signum, frame):
            logging.info(f"[Collector] Received signal {signum}. Requesting shutdown...")
            try:
                self.request_shutdown()  # Set shutdown flag only
            except Exception as e:
                logging.error(f"[Collector] Error during shutdown: {e}")
            logging.info("[Collector] SIGTERM/SIGINT handler completed.")

        signal.signal(signal.SIGTERM, handle_sigterm)
        signal.signal(signal.SIGINT, handle_sigterm)

        # Register pyee error handler if emitter exists
        try:
            emitter = getattr(self.client, 'emitter', None)
            if emitter:
                def on_emitter_error(error):
                    if isinstance(error, (SystemExit, KeyboardInterrupt)):
                        logging.info(f"[Collector] SystemExit/KeyboardInterrupt ignored in error handler: {error}")
                        return
                    logging.error(f"[Collector] Uncaught error in pyee emitter: {error}")
                emitter.on('error', on_emitter_error)
        except Exception as e:
            logging.warning(f"[Collector] Could not register pyee error handler: {e}")

    def request_shutdown(self):
        self._running = False
        logging.info("[Collector] Shutdown requested (flag set).")

    def _to_serializable(self, obj):
        import dataclasses
        if dataclasses.is_dataclass(obj):
            return {k: self._to_serializable(v) for k, v in dataclasses.asdict(obj).items() if not k.startswith('_') and v is not None}
        elif isinstance(obj, dict):
            return {k: self._to_serializable(v) for k, v in obj.items() if not str(k).startswith('_') and v is not None}
        elif isinstance(obj, (list, tuple, set)):
            return [self._to_serializable(v) for v in obj]
        elif isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        elif hasattr(obj, '__dict__'):
            # Avoid recursion on objects with problematic attributes
            try:
                return {k: self._to_serializable(v) for k, v in vars(obj).items() if not k.startswith('_') and v is not None}
            except Exception:
                return str(obj)
        else:
            try:
                return str(obj)
            except Exception:
                return None

    def _handle_event(self, event):
        if not self._running:
            logging.info("[Collector] Ignoring event after stop requested.")
            return
        event_type = type(event).__name__
        try:
            data = self._to_serializable(event)
        except Exception as e:
            logging.error(f"[Collector] Error serializing event: {e}")
            data = str(event)
        event_data = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        logging.info(f"[Collector] _handle_event called for event type: {type(event)}")
        logging.info(f"[Collector] Event received: {event_data}")
        redis_key = f"broadcast:{self.room_id or self.unique_id}:{self.session_id}:events"
        try:
            self.redis_client.rpush(redis_key, json.dumps(event_data))
            logging.info(f"[Collector] Event pushed to Redis: {event_data['event_type']} to {redis_key}")
        except Exception as e:
            logging.error(f"[Collector] Redis push error: {str(e)} | Event: {event_data}")

    async def stop(self):
        self._running = False
        logging.info("[Collector] Stop requested.")
        try:
            if hasattr(self.client, "disconnect") and callable(self.client.disconnect):
                await self.client.disconnect()
                logging.info("[Collector] TikTokLiveClient.disconnect() awaited and complete.")
        except Exception as e:
            logging.error(f"[Collector] Error during disconnect: {e}")

    async def _run_forever(self):
        import asyncio
        self._loop = asyncio.get_running_loop()
        self._running = True
        try:
            await self.client.start()
            # Block here until stop() is called (broadcast end)
            while self._running:
                await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            logging.info("[Collector] asyncio loop cancelled.")
        except Exception as e:
            logging.error(f"[Collector] Error in _run_forever: {e}")
        finally:
            logging.info("[Collector] _run_forever exiting.")

    async def run(self):
        try:
            if self.unique_id:
                logging.info(f"[Collector] Connecting to TikTokLive for unique_id={self.unique_id}")
            else:
                logging.info(f"[Collector] Connecting to TikTokLive for room_id={self.room_id}")
            logging.info(f"[Collector] asyncio event loop starting...")
            await self._run_forever()
            # After connection, log discovered room_id if unique_id was used
        except Exception as e:
            logging.error(f"[Collector] Exception in run(): {e}")
        finally:
            logging.info("[Collector] run() cleanup complete.")
            if self.unique_id:
                discovered_room_id = getattr(self.client, "room_id", None)
                logging.info(f"[Collector] Discovered room_id after connection: {discovered_room_id}")
                print(f"[Collector] Discovered room_id after connection: {discovered_room_id}")
            logging.info(f"[Collector] asyncio event loop finished.")

# 사용 예시 (방송 시작 시 호출):
# collector = TikTokLiveEventCollector(room_id="123456", session_id="abcdef")
# collector.run()

if __name__ == "__main__":
    import argparse
    import signal
    import sys
    import asyncio

    parser = argparse.ArgumentParser()
    parser.add_argument("--room_id", required=True, help="TikTok account name (unique_id) or numeric room_id")
    parser.add_argument("--session_id", required=True)
    args = parser.parse_args()

    logging.info(f"[Collector] CLI started with id={args.room_id}, session_id={args.session_id}")
    print(f"[Collector] CLI started with id={args.room_id}, session_id={args.session_id}")

    collector = TikTokLiveEventCollector(room_id_or_unique_id=args.room_id, session_id=args.session_id)
    print(f"[Collector] Started with PID {os.getpid()}")

    def handle_sigterm(signum, frame):
        logging.info(f"[Collector] Received signal {signum}. Requesting shutdown...")
        try:
            collector.request_shutdown()  # Set shutdown flag only
        except Exception as e:
            logging.error(f"[Collector] Error during shutdown: {e}")
        logging.info("[Collector] SIGTERM/SIGINT handler completed.")

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    asyncio.run(collector.run())

    logging.shutdown()

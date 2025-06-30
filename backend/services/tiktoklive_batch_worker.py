import os
import json
from typing import List
from pymongo import MongoClient
import redis
from dotenv import load_dotenv
import logging

load_dotenv()

# 환경 변수 또는 설정에서 Redis/MongoDB 연결 정보 로드

import sys
from datetime import datetime
# 로그 파일 경로를 superon-admin 루트로 고정
LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tiktoklive_batch_worker.log"))
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler(sys.stdout)
    ]
)
logging.info(f"[BATCH_WORKER] === Batch worker 시작 ===")
logging.info(f"[BATCH_WORKER] 실행 시간: {datetime.now().isoformat()}")
logging.info(f"[BATCH_WORKER] 실행 환경: {os.environ}")


def get_redis_client():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=int(os.getenv("REDIS_DB", 0)),
        username=os.getenv("REDIS_USERNAME"),
        password=os.getenv("REDIS_PASSWORD"),
        decode_responses=True,
    )

def get_mongo_client():
    return MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))

class TikTokLiveBatchWorker:
    def __init__(self, room_id: str, session_id: str):
        self.room_id = room_id
        self.session_id = session_id
        self.redis_client = get_redis_client()
        self.mongo_client = get_mongo_client()
        self.mongo_db = self.mongo_client[os.getenv("MONGO_DB", "superon")]
        self.collection = self.mongo_db[os.getenv("MONGO_BROADCAST_COLLECTION", "broadcast_logs")]

    def fetch_events_from_redis(self) -> List[dict]:
        redis_key = f"broadcast:{self.room_id}:{self.session_id}:events"
        try:
            events = self.redis_client.lrange(redis_key, 0, -1)
            logging.info(f"[BATCH_WORKER] Fetched {len(events)} events from Redis key: {redis_key}")
            return [json.loads(e) for e in events]
        except Exception as e:
            logging.error(f"[BATCH_WORKER] Failed to fetch events from Redis: {e}", exc_info=True)
            raise

    def archive_to_mongodb(self, events: List[dict]):
        if not events:
            logging.info("[BATCH_WORKER] No events to archive.")
            return
        for event in events:
            event["room_id"] = self.room_id
            event["session_id"] = self.session_id
        try:
            self.collection.insert_many(events)
            logging.info(f"[BATCH_WORKER] Archived {len(events)} events to MongoDB.")
        except Exception as e:
            logging.error(f"[BATCH_WORKER] Failed to archive events to MongoDB: {e}", exc_info=True)
            raise

    def cleanup_redis(self):
        redis_key = f"broadcast:{self.room_id}:{self.session_id}:events"
        try:
            self.redis_client.delete(redis_key)
            logging.info("[BATCH_WORKER] Cleaned up Redis buffer.")
        except Exception as e:
            logging.error(f"[BATCH_WORKER] Failed to clean up Redis: {e}", exc_info=True)
            raise

    def run(self):
        try:
            events = self.fetch_events_from_redis()
            self.archive_to_mongodb(events)
            self.cleanup_redis()
            logging.info("[BATCH_WORKER] Batch worker completed successfully.")
        except Exception as e:
            logging.error(f"[BATCH_WORKER] Batch worker failed: {e}", exc_info=True)
            import sys
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":

    import argparse
    import traceback
    parser = argparse.ArgumentParser()
    parser.add_argument("--room_id", required=True)
    parser.add_argument("--session_id", required=True)
    args = parser.parse_args()
    logging.info(f"[BATCH_WORKER] 파라미터: room_id={args.room_id}, session_id={args.session_id}")
    try:
        worker = TikTokLiveBatchWorker(room_id=args.room_id, session_id=args.session_id)
        worker.run()
        logging.info(f"[BATCH_WORKER] 정상 종료: room_id={args.room_id}, session_id={args.session_id}")
    except Exception as e:
        logging.error(f"[BATCH_WORKER] 예외 발생: {e}")
        logging.error(traceback.format_exc())
        sys.exit(1)
        print(f"Archived {len(events)} events to MongoDB.")

    def cleanup_redis(self):
        redis_key = f"broadcast:{self.room_id}:{self.session_id}:events"
        self.redis_client.delete(redis_key)
        print("Cleaned up Redis buffer.")

    def run(self):
        events = self.fetch_events_from_redis()
        self.archive_to_mongodb(events)
        self.cleanup_redis()

# 사용 예시 (방송 종료 시 호출):
# worker = TikTokLiveBatchWorker(room_id="123456", session_id="abcdef")
# worker.run()

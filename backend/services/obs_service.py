from obswebsocket import obsws, requests
from typing import Optional

class OBSService:
    """
    OBS Studio WebSocket 연동 및 제어 서비스 (obs-websocket-py 1.0 동기)
    """
    def __init__(self, host: str = 'localhost', port: int = 4455, password: str = ''):
        self.host = host
        self.port = port
        self.password = password
        self.ws: Optional[obsws] = None
        self.connected = False

    def connect(self):
        try:
            self.ws = obsws(self.host, self.port, self.password)
            self.ws.connect()
            self.connected = True
            return True
        except Exception:
            self.connected = False
            return False

    def disconnect(self):
        if self.ws and self.connected:
            try:
                self.ws.disconnect()
                self.connected = False
                return True
            except Exception:
                return False
        return False

    def start_stream(self):
        if self.ws and self.connected:
            self.ws.call(requests.StartStreaming())
            return True
        return False

    def stop_stream(self):
        if self.ws and self.connected:
            self.ws.call(requests.StopStreaming())
            return True
        return False

    def switch_scene(self, scene_name: str):
        if self.ws and self.connected:
            self.ws.call(requests.SetCurrentScene(scene_name))
            return True
        return False

    def play_tts_audio(self, source_name: str):
        # TODO: 오디오 소스 재생 (OBS에 따라 별도 구현 필요)
        pass

    def get_status(self):
        return {"connected": self.connected}

# 싱글턴 인스턴스
# 싱글턴 인스턴스 (비동기 방식)
obs_service = OBSService()

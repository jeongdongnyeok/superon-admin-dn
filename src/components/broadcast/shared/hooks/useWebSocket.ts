import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';
function getWsBaseUrl() {
  return BASE_URL.replace(/^http/, 'ws');
}
// roomIdConfirmed가 true일 때만 연결을 시도하도록 roomIdConfirmed 인자를 추가
export const useWebSocket = (roomId: string, roomIdConfirmed: boolean) => {
  // 방어: roomId가 유효하지 않으면 연결 시도하지 않음
  const isValidRoomId = (id: string) => {
    if (!id) return false;
    if (typeof id !== 'string') return false;
    if (id.trim().length === 0) return false;
    // 에러 메시지로 추정되는 한글, 영어 메시지 방지
    if (/실패|에러|오류|error|fail|not found|존재하지|없습니다|failed|forbidden|invalid/i.test(id)) return false;
    // 기타: 공백/특수문자만 있는 경우 방지
    if (!/^[a-zA-Z0-9_\-]+$/.test(id.trim())) return false;
    return true;
  };
  const [wsStatus, setWsStatus] = useState<'init' | 'open' | 'closed'>('init');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // roomIdConfirmed가 true가 아니면 연결 시도하지 않음
    if (!roomIdConfirmed) return;
    if (!isValidRoomId(roomId)) {
      console.warn('[useWebSocket] Invalid roomId, skipping WebSocket connection:', roomId);
      return;
    }
    const trimmedRoomId = roomId.trim();
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/${trimmedRoomId}`);
    wsRef.current = ws;

    setWsStatus('init'); // 연결 시도 시작 시 상태를 'init'으로 설정
    ws.onopen = () => setWsStatus('open');
    ws.onclose = () => setWsStatus('closed');
    ws.onerror = () => setWsStatus('closed');

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ChatMessage;
        setMessages(prev => [...prev, data]);
      } catch {}
    };

    ws.onmessage = handleMessage;
    return () => {
      ws.close();
      setWsStatus('closed');
    };
  }, [roomId, roomIdConfirmed]);

  // 메시지 전송 함수
  const sendMessage = (msg: string) => {
    if (wsRef.current && wsStatus === 'open') {
      wsRef.current.send(msg);
    }
  };

  return {
    wsStatus,
    messages,
    sendMessage,
    setMessages, // 외부에서 직접 업데이트 가능하도록 추가
  };
};

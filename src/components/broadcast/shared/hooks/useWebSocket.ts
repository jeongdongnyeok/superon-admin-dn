import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';
function getWsBaseUrl() {
  return BASE_URL.replace(/^http/, 'ws');
}
export const useWebSocket = (roomId: string) => {
  const [wsStatus, setWsStatus] = useState<'init' | 'open' | 'closed'>('init');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/${roomId}`);
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
  }, [roomId]);

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
  };
};

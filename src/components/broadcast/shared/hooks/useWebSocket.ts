import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '../types';

export const useWebSocket = (roomId: string) => {
  const [wsStatus, setWsStatus] = useState<'init' | 'open' | 'closed'>('init');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // 메시지 수신 핸들러를 최상위에 선언
  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as ChatMessage;
      setMessages(prev => [...prev, data]);
    } catch {}
  };

  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}`);
    wsRef.current = ws;

    setWsStatus('init'); // 연결 시도 시작 시 상태를 'init'으로 설정
    ws.onopen = () => setWsStatus('open');
    ws.onclose = () => setWsStatus('closed');
    ws.onerror = () => setWsStatus('closed');
    ws.onmessage = handleMessage;
    return () => {
      ws.close();
      setWsStatus('closed');
    };
  }, [roomId, handleMessage]);

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

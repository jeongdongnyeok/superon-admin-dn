import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

export const useWebSocket = (roomId: string) => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(`wss://your-tiktoklive-server/ws/${roomId}`);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => setWsStatus('open');
    ws.onclose = () => setWsStatus('closed');
    ws.onerror = () => setWsStatus('closed');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      } catch {}
    };
    return () => {
      ws.close();
      setWsStatus('closed');
    };
  }, [roomId]);

  // 메시지 전송 함수
  const sendMessage = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return {
    wsStatus,
    messages,
    sendMessage,
  };
};

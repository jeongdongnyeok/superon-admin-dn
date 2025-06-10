import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '../types';

export const useWebSocket = (roomId: string) => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}`);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => setWsStatus('open');
    ws.onclose = () => setWsStatus('closed');
    ws.onerror = () => setWsStatus('closed');
    const handleMessage = useCallback((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        setMessages(prev => [...prev, data as ChatMessage]);
      } catch {}
    }, []);
    ws.onmessage = handleMessage;
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

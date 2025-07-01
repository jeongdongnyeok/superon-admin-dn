import React, { useState, useCallback } from 'react';


import ChatLogs from './ChatLogs';
import { useSession } from './shared/hooks/useSession';

import { ChatMessage } from './shared/types';

import api from '../../api';



const BroadcastTab: React.FC = () => {
  // All hooks and state at the top

  const { sessionStatus, roomId, sessionId } = useSession();





  const [ttsInputLogs] = useState<{ timestamp: number, text: string }[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<ChatMessage[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState<string | null>(null); // Only declared once

  // TTS 입력/재생 상태








  // Archived event logs state


  // Fetch archived events from backend
  const fetchArchivedEvents = useCallback(async () => {
    if (!roomId) {
      setArchivedError('Room ID가 없습니다.');
      return;
    }
    setArchivedLoading(true);
    setArchivedError(null);
    try {
      const params: Record<string, string> = { room_id: roomId };
      const res = await api.get('/broadcast/events', { params });
      setArchivedEvents(res.data.events || []);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const errObj = error as { response?: { data?: { detail?: string } } };
        setArchivedError(errObj.response?.data?.detail || '이벤트 로그를 불러오지 못했습니다.');
      } else {
        setArchivedError('이벤트 로그를 불러오지 못했습니다.');
      }
    } finally {
      setArchivedLoading(false);
    }
  }, [roomId]);




  return (
    <div>
      {/* 우측: 채팅 로그 패널 */}
      <div className="chat-log-panel w-1/2 min-w-0 h-full flex flex-col">
        <h3 className="font-bold text-lg mb-2">Chat Log Panel</h3>
        <div className="chat-messages flex-1 overflow-y-auto bg-white rounded border p-2 mb-2 min-h-[120px]">
          <ChatLogs
            messages={[]}
            sessionStatus={sessionStatus}
            archivedEvents={archivedEvents}
            archivedLoading={archivedLoading}
            archivedError={archivedError}
            sessionId={sessionId ?? undefined}
            fetchArchivedEvents={fetchArchivedEvents}
          />
        </div>
        <div className="bg-gray-50 rounded border p-2 text-sm mb-2" style={{ minHeight: 60 }}>
          {ttsInputLogs.length === 0 ? (
            <div className="text-gray-400 text-center">TTS 입력 로그가 없습니다.</div>
          ) : (
            ttsInputLogs.map((log, idx) => (
              <div key={idx} className="mb-1 whitespace-pre-line">
                {'{'}{new Date(log.timestamp).toLocaleTimeString()} {'}'}\n{log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastTab;

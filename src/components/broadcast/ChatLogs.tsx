import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './shared/types';

interface ArchiveEvent {
  _id?: string;
  timestamp?: number;
  event_type?: string;
  data?: unknown;
}

interface ChatLogsProps {
  messages: ChatMessage[];
  sessionStatus?: string;
  archivedEvents?: ArchiveEvent[];
  archivedLoading?: boolean;
  archivedError?: string | null;
  sessionId?: string;
  fetchArchivedEvents?: () => void;
  reverseOrder?: boolean;
}

const ChatLogs: React.FC<ChatLogsProps> = ({
  messages,
  sessionStatus,
  archivedEvents = [],
  archivedLoading = false,
  archivedError = null,
  sessionId = '',
  fetchArchivedEvents,
  reverseOrder = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 오면 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div>
      <div
        ref={scrollRef}
        className="chat-logs p-2 h-full min-h-0 w-full overflow-y-auto bg-gray-900 border-l border-gray-700 rounded text-xs font-mono"
      >
        <div className="font-bold text-white mb-2">실시간 채팅 콘솔</div>
        <ul className="space-y-1">
          {(reverseOrder ? [...messages].reverse() : messages).map((msg, i) => (
            <li key={i} className="text-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {msg.type === 'chat' && (
                <span>
                  <span className="text-green-400">[{msg.timestamp ? new Date(msg.timestamp).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {msg.content}
                </span>
              )}
              {msg.type === 'gift' && (
                <span className="text-pink-400">
                  🎁 <b>{msg.user_nickname}</b>님이 {msg.gift_name} ({msg.gift_coin}) 선물! (x{msg.repeat_count})
                </span>
              )}
              {msg.type === 'like' && (
                <span className="text-blue-400">
                  👍 <b>{msg.user_nickname}</b>님이 좋아요를 보냈습니다
                </span>
              )}
              {/* 원하면 아래처럼 전체 메시지 JSON도 함께 출력 가능 */}
              {/* <pre className="text-gray-500">{JSON.stringify(msg, null, 1)}</pre> */}
            </li>
          ))}
        </ul>
      </div>
      {/* 방송 종료 후: 아카이브 이벤트 로그 조회 */}
      {sessionStatus === 'end' && (
        <div className="w-full px-8 py-4 bg-gray-100 border-t mt-4 rounded">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-bold text-lg">아카이브 방송 이벤트 로그</span>
            <button
              className="px-3 py-1 rounded bg-blue-500 text-white text-sm font-bold hover:bg-blue-600"
              onClick={fetchArchivedEvents}
              disabled={archivedLoading || !sessionId}
            >
              새로고침
            </button>
          </div>
          {/* 아카이브 이벤트 로그 표시 영역 */}
          {archivedLoading ? (
            <div>불러오는 중...</div>
          ) : archivedError ? (
            <div className="text-red-500">{archivedError}</div>
          ) : (
            <div>
              <ul>
                {archivedEvents.map(event => (
                  <li key={event._id || event.timestamp}>{JSON.stringify(event)}</li>
                ))}
              </ul>
              <div className="overflow-x-auto max-h-80 bg-white rounded shadow p-3 mt-2">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-2 py-1">타입</th>
                      <th className="px-2 py-1">타임스탬프</th>
                      <th className="px-2 py-1">데이터</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedEvents.map((event, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="px-2 py-1">{event.event_type}</td>
                        <td className="px-2 py-1">{event.timestamp}</td>
                        <td className="px-2 py-1 whitespace-pre-wrap max-w-xs break-all">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(event.data, null, 1)}</pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatLogs;

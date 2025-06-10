import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './shared/types';

interface ChatLogsProps {
  messages: ChatMessage[];
}

const ChatLogs: React.FC<ChatLogsProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 오면 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="chat-logs p-2 h-full overflow-y-auto bg-gray-900 border-l border-gray-700 rounded text-xs font-mono"
      style={{ minHeight: 240, maxHeight: 400 }}
    >
      <div className="font-bold text-white mb-2">실시간 채팅 콘솔</div>
      <ul className="space-y-1">
        {messages.map((msg, i) => (
          <li key={i} className="text-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {msg.type === 'chat' && (
              <span>
                <span className="text-green-400">{msg.user_nickname}:</span> {msg.content}
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
  );
};

export default ChatLogs;

import React from 'react';
import { ChatMessage } from './shared/types';

interface ChatLogsProps {
  messages: ChatMessage[];
}

const ChatLogs: React.FC<ChatLogsProps> = ({ messages }) => {
  return (
    <div className="chat-logs p-4 h-full overflow-y-auto bg-gray-50 border-l border-gray-200">
      <div className="font-bold mb-2">실시간 채팅 로그</div>
      <ul className="space-y-1 text-xs">
        {messages.map((msg, i) => (
          <li key={i}>
            {msg.type === 'chat' && (
              <span><b>{msg.user_nickname}:</b> {msg.content}</span>
            )}
            {msg.type === 'gift' && (
              <span className="text-pink-600">🎁 <b>{msg.user_nickname}</b>님이 {msg.gift_name} ({msg.gift_coin}) 선물! (x{msg.repeat_count})</span>
            )}
            {msg.type === 'like' && (
              <span className="text-blue-500">👍 <b>{msg.user_nickname}</b>님이 좋아요를 보냈습니다</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatLogs;

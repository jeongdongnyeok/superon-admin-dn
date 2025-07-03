import React from 'react';
import { Character, SessionStatus } from './shared/types';

interface SessionManagerProps {
  characters: Character[];
  selectedCharacter: Character | null;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  roomId: string;
  setRoomId: React.Dispatch<React.SetStateAction<string>>;
  roomIdConfirmed: boolean;
  setRoomIdConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  sessionStatus: SessionStatus;
  setSessionStatus: React.Dispatch<React.SetStateAction<SessionStatus>>;
  endBroadcast: () => void;
  isLive?: boolean;
  error?: string | null;
  handleRegisterRoomId: () => void;
  handleStartBroadcast: () => void;
  liveError?: string | null;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  characters,
  selectedCharacter,
  setSelectedCharacter,
  roomId,
  setRoomId,
  roomIdConfirmed,
  sessionStatus,
  endBroadcast,
  isLive,
  error,
  handleRegisterRoomId,
  handleStartBroadcast,
  liveError, 
}) => {
  return (
    <div className="session-manager flex flex-col gap-2 p-4 border-r border-gray-200 h-full">
      <div>
        <label className="block mb-1 font-semibold">캐릭터 선택</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedCharacter?.id || ''}
          onChange={e => {
            const char = characters.find(c => c.id === e.target.value);
            if (char) {
              console.log('[SessionManager] 캐릭터 선택:', char.id, char.name);
              setSelectedCharacter(char);
            }
          }}
          disabled={sessionStatus === 'start'}
        >
          <option value="">캐릭터 선택</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-semibold">Room ID</label>
        <input
          className="w-full border rounded px-2 py-1"
          type="text"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          disabled={(roomIdConfirmed && isLive) || sessionStatus === 'start'}
        />
        {(!roomIdConfirmed || (roomIdConfirmed && !isLive)) && (
          <button className="mt-1 px-3 py-1 bg-blue-500 text-white rounded" onClick={handleRegisterRoomId} disabled={!roomId || sessionStatus === 'start'}>
            등록
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="flex-1 bg-green-500 text-white px-4 py-2 rounded font-bold"
          onClick={handleStartBroadcast}
          disabled={sessionStatus === 'start' || !selectedCharacter || !roomIdConfirmed || !isLive}
        >
          방송 시작
        </button>
        {sessionStatus === 'start' && (
          <button
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded font-bold"
            onClick={endBroadcast}
          >
            방송 종료
          </button>
        )}
      </div>
      {/* 방송 감지 안내 */}
      {liveError && (
        <div className="mt-2 text-red-500 text-sm">{liveError}</div>
      )}

      <div className="mt-2 text-sm text-gray-700">
        세션 상태: {sessionStatus === 'idle' ? '대기' : sessionStatus === 'start' ? '방송 중' : '종료'}
      </div>
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
};

export default SessionManager;

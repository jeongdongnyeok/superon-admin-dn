import React from 'react';
import SessionManager from './SessionManager';
import VideoPlayer from './VideoPlayer';
import ChatLogs from './ChatLogs';
import { useSession } from './shared/hooks/useSession';
import { useMotionFiles } from './shared/hooks/useMotionFiles';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { Character } from './shared/types';

// 예시: characters 데이터는 실제 API 연동 시 props로 전달받거나 context에서 관리 가능
const dummyCharacters: Character[] = [
  { id: '1', name: '캐릭터1' },
  { id: '2', name: '캐릭터2' },
];

const BroadcastTab: React.FC = () => {
  // 세션/캐릭터/Room ID 관리
  const {
    sessionStatus,
    setSessionStatus,
    selectedCharacter,
    setSelectedCharacter,
    roomId,
    setRoomId,
    roomIdConfirmed,
    setRoomIdConfirmed,
    error,
    setError,
    startBroadcast,
    endBroadcast,
    registerRoomId,
  } = useSession();

  // 모션 파일/영상 관리
  const {
    motionFiles,
    selectedMotion,
    setMotionByTag,
    isGiftMotion,
    playNextGift,
  } = useMotionFiles(selectedCharacter?.id || null);

  // WebSocket 채팅 관리
  const { messages } = useWebSocket(roomIdConfirmed ? roomId : '');

  return (
    <div className="broadcast-tab w-full h-full flex flex-row">
      {/* Session Manager */}
      <div className="w-1/4 h-full">
        <SessionManager
          characters={dummyCharacters}
          selectedCharacter={selectedCharacter}
          onCharacterSelect={setSelectedCharacter}
          sessionStatus={sessionStatus}
          onStart={() => startBroadcast(selectedCharacter!)}
          onEnd={endBroadcast}
          roomId={roomId}
          onRoomIdChange={setRoomId}
          roomIdConfirmed={roomIdConfirmed}
          onRoomIdConfirm={() => registerRoomId(roomId)}
          error={error}
        />
      </div>
      {/* Video Player */}
      <div className="w-2/4 h-full flex flex-col">
        <VideoPlayer
          motionFiles={motionFiles}
          selectedMotion={selectedMotion}
          setMotionByTag={setMotionByTag}
          isGiftMotion={isGiftMotion}
          playNextGift={playNextGift}
        />
      </div>
      {/* Chat Logs */}
      <div className="w-1/4 h-full">
        <ChatLogs messages={messages} />
      </div>
    </div>
  );
};

export default BroadcastTab;

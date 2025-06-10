import React, { useEffect } from 'react';
import SessionManager from './SessionManager';
import VideoPlayer from './VideoPlayer';
import ChatLogs from './ChatLogs';
import { useSession } from './shared/hooks/useSession';
import { useMotionFiles } from './shared/hooks/useMotionFiles';
import { Character, GiftEvent, ChatMessage } from './shared/types';
import { useCharacters } from './shared/hooks/useCharacters';
import axios from 'axios';

const BroadcastTab: React.FC = () => {
  // 진단 로그: 컴포넌트 마운트 시
  React.useEffect(() => {
    console.log('[BroadcastTab] 컴포넌트 마운트');
  }, []);
  const { characters, isLoading: isLoadingCharacters, error: characterError } = useCharacters();

  // 진단 로그: 캐릭터 목록 로딩
  React.useEffect(() => {
    console.log('[BroadcastTab] characters:', characters);
    if (characterError) console.error('[BroadcastTab] characterError:', characterError);
  }, [characters, characterError]);

  // 세션/캐릭터/Room ID 관리
  const {
    sessionStatus,
    setSessionStatus,
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
  // 캐릭터 선택 상태를 명확하게 관리
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<string>('');

  // 진단 로그: selectedCharacterId 변경 시
  React.useEffect(() => {
    console.log('[BroadcastTab] selectedCharacterId:', selectedCharacterId);
  }, [selectedCharacterId]);
  const selectedCharacter = React.useMemo(() => {
    const found = characters.find(c => c.id === selectedCharacterId) || null;
    if (selectedCharacterId && !found) {
      console.error('[BroadcastTab] selectedCharacterId는 있지만 해당 캐릭터를 characters에서 찾지 못함:', selectedCharacterId);
    }
    if (found) {
      console.log('[BroadcastTab] selectedCharacter:', found.id, found.name);
    }
    return found;
  }, [characters, selectedCharacterId]);

  const {
    motionFiles,
    selectedMotion,
    setMotionByTag,
    isGiftMotion,
    playNextGift,
    giftQueue,
  } = useMotionFiles(selectedCharacterId || null);

  // 진단 로그: useMotionFiles에서 motionFiles, selectedMotion 등 변경 시
  React.useEffect(() => {
    console.log('[BroadcastTab] [useMotionFiles] motionFiles:', motionFiles);
    console.log('[BroadcastTab] [useMotionFiles] selectedMotion:', selectedMotion);
  }, [motionFiles, selectedMotion]);

  // TikTok 채팅 로그 및 WebSocket 관리
  const [tiktokChats, setTiktokChats] = React.useState<ChatMessage[]>([]);
  const tiktokSocketRef = React.useRef<WebSocket | null>(null);

  // Room ID 등록 시 TikTok 방송 시작 및 WebSocket 연결
  const handleStartTiktok = async () => {
    if (!roomId) return;
    try {
      await axios.post('/tiktok/start', { unique_id: roomId });
      // WebSocket 연결
      if (tiktokSocketRef.current) tiktokSocketRef.current.close();
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host.replace(/^https?:\/\//, '')}/ws/tiktok`;
      const ws = new window.WebSocket(wsUrl);
      tiktokSocketRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTiktokChats(prev => [...prev, data]);
        } catch (err) {
          console.error('[FRONTEND] WebSocket 메시지 파싱 실패:', err);
        }
      };
      ws.onclose = () => {
        tiktokSocketRef.current = null;
        console.log('[FRONTEND] WebSocket 연결 종료');
      };
    } catch (err) {
      alert('틱톡 방송 시작에 실패했습니다.');
    }
  };

  // gift 메시지 수신 시 giftQueue에 push (tiktokChats 기준)
  React.useEffect(() => {
    // 진단: tiktokChats와 giftMsgs를 무조건 출력
    console.log('[BroadcastTab] tiktokChats 전체:', tiktokChats);
    const giftMsgs = tiktokChats.filter(msg => msg.type === 'gift');
    console.log('[BroadcastTab] giftMsgs:', giftMsgs);
    if (giftMsgs.length > 0) {
      console.log('[BroadcastTab] gift 채팅 메시지 감지:', giftMsgs);
      giftMsgs.forEach(gift => {
        const motionTag = gift.motion_tag || '';
        if (!giftQueue.current.some((q: GiftEvent) => q.motion_tag === motionTag && q.count === (gift.repeat_count || 1))) {
          console.log('[BroadcastTab] giftQueue에 push:', { motion_tag: motionTag, count: gift.repeat_count || 1, gift });
          giftQueue.current.push({ motion_tag: motionTag, count: gift.repeat_count || 1 });
        } else {
          console.log('[BroadcastTab] 이미 giftQueue에 존재:', { motion_tag: motionTag, count: gift.repeat_count || 1 });
        }
      });
      if (!isGiftMotion) {
        console.log('[BroadcastTab] playNextGift 호출 (isGiftMotion=false)');
        playNextGift();
      }
    }
  }, [tiktokChats, giftQueue, isGiftMotion, playNextGift]);

  React.useEffect(() => {
    console.log('[BroadcastTab] motionFiles changed:', motionFiles);
  }, [motionFiles]);

  return (
    <>
      <div className="broadcast-tab w-full h-full flex flex-row">
      {/* Session Manager */}
      <div className="w-1/4 h-full">
        <SessionManager
          characters={characters}
          selectedCharacter={characters.find(c => c.id === selectedCharacterId) || null}
          onCharacterSelect={(character: Character) => {
            console.log('[BroadcastTab] [SessionManager] onCharacterSelect fired:', character.id, character.name);
            setSelectedCharacterId(character.id);
          }}
          sessionStatus={sessionStatus}
          onStart={() => {
            const character = characters.find(c => c.id === selectedCharacterId);
            if (character) {
              startBroadcast(character);
            }
          }}
          onEnd={endBroadcast}
          roomId={roomId}
          onRoomIdChange={setRoomId}
          roomIdConfirmed={roomIdConfirmed}
          onRoomIdConfirm={() => {
            registerRoomId(roomId);
            handleStartTiktok();
          }}
          error={error || characterError}
        />
      </div>
      {/* Video Player */}
      <div className="w-2/4 h-full flex flex-col">
        <VideoPlayer
          motionFiles={Array.isArray(motionFiles) ? motionFiles : []}
          selectedMotion={selectedMotion || ''}
          setMotionByTag={setMotionByTag}
          isGiftMotion={isGiftMotion}
          playNextGift={playNextGift}
        />
      </div>
      {/* Chat Logs */}
      <div className="w-1/4 h-full">
        <ChatLogs messages={tiktokChats} />
      </div>
    </div>
    {/* 하단 모션 파일 리스트 */}
    <div className="w-full mt-6 px-8 py-3 bg-gray-50 border-t flex flex-row flex-wrap gap-2 items-center justify-start">
      {motionFiles.length === 0 ? (
        <span className="text-gray-400 text-xs">모션 파일이 없습니다.</span>
      ) : (
        motionFiles.map(file => (
          <button
            key={file.url}
            className={`px-3 py-2 rounded flex items-center gap-2 text-xs font-mono border transition-colors duration-100 ${selectedMotion === file.url ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
            onClick={() => setMotionByTag(file.tag)}
          >
            <span>{file.name}</span>
            <span className="text-gray-400 ml-2">[{file.tag}]</span>
          </button>
        ))
      )}
    </div>
    </>
  );
};

export default BroadcastTab;

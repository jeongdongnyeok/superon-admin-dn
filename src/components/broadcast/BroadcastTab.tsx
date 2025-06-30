import React from 'react';
import SessionManager from './SessionManager';

// 이미지 URL이 상대경로일 경우 /로 시작하도록 보정(강화)
function getImageSrc(url?: string | null) {
  if (!url || typeof url !== 'string' || url.trim() === '') return '/default.png';
  if (url.startsWith('http')) return url;
  const normalized = url.startsWith('/') ? url : '/' + url;
  if (!normalized.startsWith('/')) return '/default.png';
  return normalized;
}

import VideoPlayer from './VideoPlayer';
import ChatLogs from './ChatLogs';
import { useSession } from './shared/hooks/useSession';
import { useMotionFiles } from './shared/hooks/useMotionFiles';
import { Character, GiftEvent, ChatMessage } from './shared/types';
import { useCharacters } from './shared/hooks/useCharacters';
import api from '../../api';

const BroadcastTab: React.FC = () => {

  // Archived event logs state
  const [archivedEvents, setArchivedEvents] = React.useState<any[]>([]);
  const [archivedLoading, setArchivedLoading] = React.useState(false);
  const [archivedError, setArchivedError] = React.useState<string | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

  // 진단 로그: 컴포넌트 마운트 시
  React.useEffect(() => {
    console.log('[BroadcastTab] 컴포넌트 마운트');
  }, []);
  const { characters, error: characterError } = useCharacters();

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
    startBroadcast,
    endBroadcast,
    registerRoomId,
    sessionId,
    setSessionId,
    selectedCharacter,
    setSelectedCharacter
  } = useSession();

  // 방송 가능 상태 관리
  const [isLive, setIsLive] = React.useState<boolean>(false);

  // Room ID 등록 및 방송 상태 확인
  const handleRoomIdConfirm = async () => {
    if (!roomId) return;
    try {
      const res = await api.get('/broadcast/status', { params: { room_id: roomId } });
      if (res.data.is_live) {
        setIsLive(true);
        setRoomIdConfirmed(true);
        setSessionStatus('idle'); // 방송 시작 가능 상태(allowed: 'idle', 'start', 'end')
        alert('방송이 감지되었습니다. 방송을 시작할 수 있습니다.');
      } else {
        setIsLive(false);
        setRoomIdConfirmed(false);
        setSessionStatus('idle');
        alert(res.data.detail || '입력한 Room ID에서 현재 방송이 감지되지 않습니다.');
      }
    } catch (err: any) {
      setIsLive(false);
      setRoomIdConfirmed(false);
      setSessionStatus('idle');
      // 2번: 에러 전체를 콘솔에 출력
      console.error('Room ID 등록 에러:', err, err?.response);
      alert(err?.response?.data?.detail || err?.message || '방송 상태 확인 중 오류가 발생했습니다.');
    }
  };

  // Fetch archived events from backend
  const fetchArchivedEvents = React.useCallback(async () => {
    if (!roomId) {
      setArchivedError('Room ID가 없습니다.');
      return;
    }
    setArchivedLoading(true);
    setArchivedError(null);
    try {
      // sessionId: useSession 훅에서 관리 필요 (아래는 예시, 실제 sessionId 변수명에 맞게 수정)
      const sessionId = undefined; // TODO: 세션 ID를 useSession에서 받아와야 함
      const params: Record<string, string> = { room_id: roomId };
      if (sessionId) params.session_id = sessionId;
      const res = await api.get('/broadcast/events', { params });
      setArchivedEvents(res.data.events || []);
      setShowArchived(true);
    } catch (err: any) {
      setArchivedError(err?.response?.data?.detail || '이벤트 로그를 불러오지 못했습니다.');
    } finally {
      setArchivedLoading(false);
    }
  }, [roomId, sessionId]);

  // 모션 파일/영상 관리 (selectedCharacter에서 id만 추출)
  React.useEffect(() => {
    if (selectedCharacter) {
      console.log('[BroadcastTab] selectedCharacter:', selectedCharacter.id);
    }
  }, [selectedCharacter]);

  const {
    motionFiles,
    selectedMotion,
    setMotionByTag,
    isGiftMotion,
    playNextGift,
    giftQueue,
  } = useMotionFiles(selectedCharacter ? selectedCharacter.id : null);

  // 진단 로그: useMotionFiles에서 motionFiles, selectedMotion 등 변경 시
  React.useEffect(() => {
    console.log('[BroadcastTab] [useMotionFiles] motionFiles:', motionFiles);
    console.log('[BroadcastTab] [useMotionFiles] selectedMotion:', selectedMotion);
  }, [motionFiles, selectedMotion]);

  // TikTok 채팅 로그 및 WebSocket 관리
  const [tiktokChats, setTiktokChats] = React.useState<ChatMessage[]>([]);
  const tiktokSocketRef = React.useRef<WebSocket | null>(null);

  // Room ID 등록 시 TikTok 방송 시작 및 WebSocket 연결
  // 방송중 여부 체크 함수
  const checkRoomLiveStatus = async (roomId: string) => {
    try {
      // (예시) /broadcast/status API 호출, 실제 구현에 맞게 수정 필요
      const res = await api.get('/broadcast/status', { params: { room_id: roomId } });
      return res.data.is_live;
    } catch {
      return false;
    }
  };

  // 방송 시작 버튼 핸들러
  const handleStartBroadcast = async () => {
    if (!selectedCharacter) {
      alert('캐릭터를 먼저 선택하세요.');
      return;
    }
    if (!roomId) {
      alert('Room ID를 입력하세요.');
      return;
    }
    if (!isLive) {
      alert('입력한 Room ID에서 현재 방송이 감지되지 않습니다.');
      return;
    }
    try {
      await startBroadcast(selectedCharacter); // useSession 훅의 startBroadcast 호출
      alert('방송이 시작되었습니다.');
      setSessionStatus('start');
      setShowArchived(false);
    } catch (e: any) {
      alert(e?.response?.data?.detail || '방송 시작 중 오류가 발생했습니다.');
      setShowArchived(false);
    }
  };

  // 방송 종료 버튼 핸들러 (중복 제거 및 WebSocket 해제 포함)
  const handleEndBroadcast = async () => {
    try {
      if (!roomId) {
        alert('Room ID가 없습니다.');
        return;
      }
      if (!sessionId) {
        alert('Session ID가 없습니다.');
        return;
      }
      // 반드시 await로 호출하여 서버에 /broadcast/stop API가 트리거되도록 보장
      await endBroadcast();
      alert('방송이 정상적으로 종료 및 아카이브 되었습니다.');
      // 상태 초기화
      setTiktokChats([]);
      setShowArchived(false);
      if (typeof setSessionStatus === 'function') setSessionStatus('idle');
      if (typeof setSessionId === 'function') setSessionId('');
      if (typeof setRoomId === 'function') setRoomId('');
      if (tiktokSocketRef.current) {
        tiktokSocketRef.current.close();
        tiktokSocketRef.current = null;
        console.log('[BroadcastTab] 방송 종료: WebSocket 연결 해제');
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || '방송 종료/아카이브 요청 중 오류가 발생했습니다.');
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
    <div>
      {/*
        SessionManager is responsible for rendering Room ID input and 방송 시작/종료 buttons.
        Remove duplicate controls below to prevent double rendering.
      */}
      <SessionManager
        characters={characters}
        selectedCharacter={selectedCharacter}
        onCharacterSelect={setSelectedCharacter}
        sessionStatus={sessionStatus}
        onStart={handleStartBroadcast}
        onEnd={handleEndBroadcast}
        roomId={roomId}
        onRoomIdChange={setRoomId}
        roomIdConfirmed={roomIdConfirmed}
        // Room ID 등록 버튼 클릭 시 방송 상태 API 호출
        onRoomIdConfirm={handleRoomIdConfirm}
        isLive={isLive}
        error={characterError}
        // 방송 시작 버튼 활성화 조건: isLive && sessionStatus !== 'start' && selectedCharacter
        // 방송 종료 버튼 활성화 조건: sessionStatus === 'start' && roomId && sessionId
      />

      {/* Removed duplicate Room ID input and 방송 시작/종료 버튼 here */}

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
        <ChatLogs
          messages={tiktokChats}
          sessionStatus={sessionStatus}
          archivedEvents={archivedEvents}
          archivedLoading={archivedLoading}
          archivedError={archivedError}
          sessionId={sessionId ?? undefined}
          fetchArchivedEvents={fetchArchivedEvents}
        />
      </div>
    </div>
  );
}

export default BroadcastTab;

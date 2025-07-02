import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './shared/hooks/useWebSocket';
import SessionManager from './SessionManager';
import VideoPlayer from './VideoPlayer';
import ChatLogs from './ChatLogs';
import TTSInput from './TTSInput';


import { useSession } from './shared/hooks/useSession';
import { useCharacters } from './shared/hooks/useCharacters';
import { useMotionFiles } from './shared/hooks/useMotionFiles';
import { ChatMessage } from './shared/types';
import api from '../../api';

const BroadcastTab: React.FC = () => {
  // 세션, 캐릭터, 모션 등 상태 관리
  const session = useSession();
  const { characters } = useCharacters();
  const {
    motionFiles,
    selectedMotion,
    setMotionByTag,
    setSelectedMotion,
    isGiftMotion,
    playNextGift,
  } = useMotionFiles(session.selectedCharacter?.id || null);

  // 채팅 로그 상태
  const [archivedEvents, setArchivedEvents] = useState<ChatMessage[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState<string | null>(null);

  // 실시간 채팅(WebSocket)
  // roomIdConfirmed가 true일 때만 WebSocket 연결
  const { messages, sendMessage, setMessages } = useWebSocket(session.roomId, session.roomIdConfirmed);

  // --- Gift 이벤트 발생 시 모션 재생 처리 ---
  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    // Gift 이벤트 감지
    if (lastMsg.type === 'gift' && lastMsg.motion_tag) {
      // motion_tag 예: 'gift_level_1', 'gift_level_2', ...
      // useMotionFiles의 giftQueue에 push하고 playNextGift 호출
      // (giftQueue는 내부적으로 관리되므로, setMotionByTag로 직접 재생)
      setMotionByTag(lastMsg.motion_tag, 'gift_event');
    }
  }, [messages, setMotionByTag]);

  // TTS 입력 핸들러 (샘플)
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

  const handleTtsSend = async (text: string) => {
    setTtsLoading(true);
    try {
      // PlaygroundTab 구조와 동일하게 /tts/stream 호출, Blob 재생
      // (voice_id, provider 등은 필요시 확장)
      const res = await fetch(`${FASTAPI_BASE_URL}/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        let errMsg = 'TTS 변환 실패';
        try {
          const err = await res.json();
          if (err.detail?.message) errMsg = err.detail.message;
          else if (err.detail) errMsg = err.detail;
        } catch {}
        throw new Error(errMsg);
      }
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setMotionByTag('talking');
      setTtsLoading(false);
      setTtsPlaying(true);

      // 입력 텍스트를 채팅 메시지로도 전송 (타임스탬프 포함)
      const msgObj = {
        type: 'chat' as const,
        content: text,
        timestamp: Date.now(),
        user_nickname: '나',
      };
      sendMessage(JSON.stringify(msgObj));
      setMessages(prev => [...prev, msgObj]);

      const audio = new window.Audio(audioUrl);
      audio.onended = () => {
        setTtsPlaying(false);
        setMotionByTag('neutral');
      };
      audio.onerror = (event) => {
        setTtsPlaying(false);
        setMotionByTag('neutral');
        // 오류 로그 출력
        console.error('[TTS] 오디오 재생 실패:', event, audio);
      };
      audio.play();
    } catch (e) {
      setTtsLoading(false);
      setTtsPlaying(false);
      setMotionByTag('neutral');
      // 오류 처리
      console.error('[TTS] 변환/재생 오류:', e);
    }
  };

  // Archived event logs fetch
  const fetchArchivedEvents = useCallback(async () => {
    if (!session.roomId) {
      setArchivedError('Room ID가 없습니다.');
      return;
    }
    setArchivedLoading(true);
    setArchivedError(null);
    try {
      const params: Record<string, string> = { room_id: session.roomId };
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
  }, [session.roomId]);

  // --- isLive 상태 관리 ---
  const [isLive, setIsLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // roomId 등록 시 1회만 방송 상태 체크
  const handleRegisterRoomId = async () => {
    setLiveError(null);
    if (!session.roomId) return;
    try {
      const res = await api.get('/broadcast/status', { params: { room_id: session.roomId } });
      const live = !!res.data.is_live;
      setIsLive(live);
      if (!live) {
        setLiveError('방송이 감지되지 않습니다. 올바른 Room ID를 입력하세요.');
        // roomIdConfirmed를 false로 유지 (등록 불가)
        session.setRoomIdConfirmed(false);
        return;
      }
      // 정상: roomIdConfirmed true로 설정
      session.setRoomIdConfirmed(true);
    } catch {
      setIsLive(false);
      setLiveError('방송 상태 확인에 실패했습니다.');
      session.setRoomIdConfirmed(false);
    }
  };

  // 방송 시작 버튼 클릭 시 한 번 더 체크
  const handleStartBroadcast = async () => {
    setLiveError(null);
    if (!session.roomId || !session.selectedCharacter) return;
    try {
      const res = await api.get('/broadcast/status', { params: { room_id: session.roomId } });
      const live = !!res.data.is_live;
      setIsLive(live);
      if (!live) {
        setLiveError('방송이 감지되지 않습니다. 올바른 Room ID를 입력하세요.');
        session.setRoomIdConfirmed(false);
        return;
      }
      // 정상: 방송 시작
      await session.startBroadcast(session.selectedCharacter);
    } catch {
      setIsLive(false);
      setLiveError('방송 상태 확인에 실패했습니다.');
      session.setRoomIdConfirmed(false);
    }
  };


  return (
    <div className="flex flex-row w-full h-full min-h-screen bg-gray-50">
      {/* 좌측: 세션/캐릭터 관리 */}
      <div className="w-80 min-w-[320px] bg-white border-r flex flex-col">
        <SessionManager
          characters={characters}
          selectedCharacter={session.selectedCharacter}
          setSelectedCharacter={session.setSelectedCharacter}
          roomId={session.roomId}
          setRoomId={session.setRoomId}
          roomIdConfirmed={session.roomIdConfirmed}
          setRoomIdConfirmed={session.setRoomIdConfirmed}
          sessionStatus={session.sessionStatus}
          setSessionStatus={session.setSessionStatus}
          endBroadcast={session.endBroadcast}
          sessionId={session.sessionId}
          isLive={isLive}
          error={session.error}
          handleRegisterRoomId={handleRegisterRoomId}
          handleStartBroadcast={handleStartBroadcast}
          liveError={liveError}
        />
      </div>

      {/* 중앙: 비디오 플레이어 및 모션 파일 목록 */}
      <div className="flex flex-col flex-1 items-center justify-start p-6">
        <div className="w-full flex flex-col items-center">
          <VideoPlayer
            motionFiles={motionFiles}
            selectedMotion={selectedMotion}
            setMotionByTag={setMotionByTag}
            setSelectedMotion={setSelectedMotion}
            isGiftMotion={isGiftMotion}
            playNextGift={playNextGift}
            motionTag={session.sessionStatus === 'start' ? (ttsPlaying ? 'talking' : 'neutral') : 'neutral'}
            characterImage={session.selectedCharacter?.image_url || ''}
          />
        </div>
        {/* 모션 파일 목록 등 추가 UI가 필요하다면 여기에 */}
      </div>

      {/* 우측: 채팅 로그 및 TTS 입력 */}
      <div className="w-[420px] min-w-[320px] flex flex-col h-full bg-white border-l">
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-bold text-lg mb-2">Chat Log Panel</h3>
          <ChatLogs
            messages={messages}
            sessionStatus={session.sessionStatus}
            archivedEvents={archivedEvents}
            archivedLoading={archivedLoading}
            archivedError={archivedError}
            sessionId={session.sessionId ?? undefined}
            fetchArchivedEvents={fetchArchivedEvents}
          />
        </div>
        <div className="p-4 border-t bg-gray-50">
          <TTSInput
            onSend={handleTtsSend}
            loading={ttsLoading}
            playing={ttsPlaying}
          />
        </div>
      </div>
    </div>
  );
};

export default BroadcastTab;

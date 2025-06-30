import { useState, useCallback } from 'react';
import api from '../../../../api';
import { SessionStatus, Character } from '../types';

export const useSession = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [roomIdConfirmed, setRoomIdConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null); // 추가: 세션 ID

  // 방송 시작
  const startBroadcast = useCallback(async (character: Character) => {
    setSelectedCharacter(character);
    setSessionStatus('start');
    setError(null);
    if (!roomId) {
      setError('Room ID가 없습니다.');
      return;
    }
    if (!character || !character.id) {
      setError('캐릭터를 선택해주세요.');
      return;
    }
    try {
      // api 인스턴스 사용 (baseURL 적용)
      const res = await api.post('/broadcast/start', { room_id: roomId, character_id: character.id });
      const data = res.data;
      console.log('[Broadcast] /broadcast/start 응답:', data);
      if (data.session_id) {
        setSessionId(data.session_id);
        console.log('[Broadcast] 받은 sessionId:', data.session_id);
      } else if (data.detail) {
        setError(data.detail);
        console.warn('[Broadcast] session_id 없음, 전체 응답:', data);
      } else {
        setError('Session ID를 받아오지 못했습니다.');
        console.warn('[Broadcast] session_id 없음, 전체 응답:', data);
      }
    } catch (e: any) {
      // axios 에러 처리
      setError(e?.response?.data?.detail || e?.message || '방송 시작에 실패했습니다.');
      console.error('[Broadcast] /broadcast/start 호출 에러:', e);
    }
  }, [roomId]);

  // 방송 종료
  const endBroadcast = useCallback(async () => {
    if (!roomId || !sessionId) {
      setError('Room ID 또는 Session ID가 없습니다.');
      return;
    }
    try {
      await api.post('/broadcast/stop', { room_id: roomId, session_id: sessionId });
      setSessionStatus('end');
      setRoomId('');
      setRoomIdConfirmed(false);
      setSelectedCharacter(null);
      setSessionId(null);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || '방송 종료에 실패했습니다.');
      console.error('[Broadcast] /broadcast/stop 호출 에러:', e);
    }
    // TODO: 소켓 정리 및 상태 초기화
  }, [roomId, sessionId]);

  // Room ID 등록
  const registerRoomId = useCallback((id: string) => {
    setRoomId(id);
    setRoomIdConfirmed(true);
    setError(null);
    // TODO: Room ID 등록 및 검증 로직
  }, []);

  return {
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
    sessionId,
    setSessionId,
  };
};

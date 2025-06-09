import { useState, useCallback } from 'react';
import { SessionStatus, Character } from '../types';

export const useSession = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [roomIdConfirmed, setRoomIdConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 방송 시작
  const startBroadcast = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setSessionStatus('start');
    setError(null);
    // TODO: API 연동 및 초기화 로직
  }, []);

  // 방송 종료
  const endBroadcast = useCallback(() => {
    setSessionStatus('end');
    setRoomId('');
    setRoomIdConfirmed(false);
    setSelectedCharacter(null);
    setError(null);
    // TODO: 소켓 정리 및 상태 초기화
  }, []);

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
  };
};

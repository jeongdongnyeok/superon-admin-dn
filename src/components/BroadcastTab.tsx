import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';
import { Character, MotionFile } from './broadcast/shared/types';
import RoomIdModal from './RoomIdModal';
import StatusMessage from './StatusMessage';
import SessionControls from './SessionControls';

const BroadcastTab: React.FC = () => {
  // Utility for tag normalization
  const normalizeTag = (tag: string) => tag.trim().toLowerCase();

  // Set motion by tag
  const setMotionByTag = (tag: string) => {
    const normTag = normalizeTag(tag);
    const file = motionFiles.find(f => normalizeTag(f.tag) === normTag);
    if (file) {
      setSelectedMotion(file.url);
    }
    setIsGiftMotion(normTag !== 'neutral');
  };

  // Character selection
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  // Session and Room ID
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'start' | 'end'>('idle');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [roomIdStatus, setRoomIdStatus] = useState<string>('');
  // Error handling
  const [error, setError] = useState<string | null>(null);
  // Motion files
  const [motionFiles, setMotionFiles] = useState<MotionFile[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string>('');
  const [isGiftMotion, setIsGiftMotion] = useState<boolean>(false);
  const [showRoomIdInput, setShowRoomIdInput] = useState<boolean>(false);
  const giftQueue = useRef<{ motion_tag: string }[]>([]);
  const isPlayingGift = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch character list on mount
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await axios.get('/api/character');
        setCharacters(response.data || []);
      } catch (err) {
        let msg = '캐릭터 목록을 불러오는 중 오류가 발생했습니다.';
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      }
    };
    fetchCharacters();
  }, []);

  // Fetch motion files when character changes
  useEffect(() => {
    const fetchMotionFiles = async () => {
      if (!selectedCharacterId) {
        setMotionFiles([]);
        setSelectedMotion('');
        return;
      }
      try {
        const response = await axios.get(`/backend/${selectedCharacterId}/motion/list.json`);
        setMotionFiles(response.data.files || []);
        // Auto-select the first motion file if available
        if (response.data.files?.length > 0) {
          setSelectedMotion(response.data.files[0].url);
        }
      } catch (err) {
        setMotionFiles([]);
        setSelectedMotion('');
        let msg = '모션 파일을 불러오는 중 오류가 발생했습니다.';
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      }
    };
    fetchMotionFiles();
  }, [selectedCharacterId]);

  // Handler to end broadcast
  const handleEndBroadcast = async () => {
    try {
      if (currentSessionId) {
        await axios.post('/tiktok/stop', { unique_id: roomId });
      }
      setCurrentSessionId(null);
      setShowRoomIdInput(false);
      setRoomId('');
      setRoomIdInput('');
    } catch (err) {
      let msg = '방송 종료 중 오류가 발생했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  // Handler for motion file selection
  const handleMotionSelect = (motionUrl: string) => {
    setSelectedMotion(motionUrl);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  // Play next gift motion (dummy for now)
  const playNextGift = () => {
    if (giftQueue.current.length > 0) {
      const next = giftQueue.current.shift();
      if (next) setMotionByTag(next.motion_tag);
    } else {
      setMotionByTag('neutral');
    }
  };

  const handleStartBroadcast = async () => {
    setError(null);
    if (!selectedCharacterId) {
      setError('캐릭터를 먼저 선택하세요.');
      return;
    }
    try {
      const { data, error: insertError } = await supabase
        .from('live_sessions')
        .insert({
          character_id: selectedCharacterId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setCurrentSessionId(data.id);
      setMotionByTag('neutral');
      setShowRoomIdInput(true); // 방송 시작 후 room id 입력창 자동 노출
    } catch (err: unknown) {
      let msg = '방송 시작에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  const handleRoomIdRegister = async () => {
    setRoomIdStatus("");
    if (!roomIdInput) return;
    try {
      console.log('[TikTok API] /tiktok/start 호출:', { unique_id: roomIdInput });
      const res = await axios.post("/tiktok/start", { unique_id: roomIdInput });
      console.log('[TikTok API] /tiktok/start 응답:', res.data);
      setRoomId(roomIdInput);
      setRoomIdStatus(res.data?.message || "Room ID 등록 및 TikTok 연동 성공");
      setShowRoomIdInput(false);
      setRoomIdInput("");
    } catch (err: unknown) {
      let msg = "Room ID 등록 또는 TikTok 연동에 실패했습니다.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      alert(msg);
      setRoomIdInput("");
    }
  };

  // Room ID가 등록된 경우, 상단에 표시
  function renderRoomIdInfo() {
    return roomId ? (
      <div className="mb-2 text-sm text-green-700 font-semibold">현재 Room ID: <span className="font-mono">{roomId}</span></div>
    ) : null;
  }

  return (
    <div className="broadcast-tab-container w-full h-full flex flex-col">
      {/* 캐릭터 선택 */}
      <div>
        <select value={selectedCharacterId} onChange={e => setSelectedCharacterId(e.target.value)}>
          <option value="">캐릭터 선택</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {/* Room ID 정보 */}
      {renderRoomIdInfo()}
      {/* 에러 메시지 */}
      <StatusMessage type="error" message={error || ''} />
      <StatusMessage type="info" message={roomIdStatus || ''} />
      {/* Room ID 입력 모달 */}
      <RoomIdModal
        show={showRoomIdInput}
        inputValue={roomIdInput}
        onInputChange={e => setRoomIdInput(e.target.value)}
        onRegister={handleRoomIdRegister}
        onCancel={() => {
          if (roomId) {
            try {
              axios.post('/tiktok/stop', { unique_id: roomId });
            } catch {}
          }
          setRoomId("");
          setRoomIdInput("");
          setShowRoomIdInput(false);
        }}
      />
      {/* 세션 상태 및 버튼 그룹 */}
      <SessionControls
        sessionStatus={sessionStatus}
        onStart={handleStartBroadcast}
        onEnd={handleEndBroadcast}
        currentSessionId={currentSessionId}
      />
      {/* 본문: 비디오/오디오/모션 파일 리스트 */}
      <div className="flex flex-row flex-1 w-full">
        {/* Left: Video Player - 50% */}
        <div className="flex items-center justify-center p-4 h-full relative">
          {/* 현재 재생중인 파일명 오버레이 */}
          {(() => {
            const playing = motionFiles.find(f => f.url === selectedMotion);
            if (!playing) return null;
            return (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded z-10 pointer-events-none shadow">
                {playing?.name} <span className="text-gray-300">[{playing?.tag}]</span>
              </div>
            );
          })()}
          <video
            ref={videoRef}
            style={{ width: 360, maxWidth: '100%' }}
            className="h-full"
            src={selectedMotion || undefined}
            autoPlay
            loop={!!(motionFiles.find(f => f.url === selectedMotion)?.tag === 'neutral')}
            controls
            onEnded={() => {
              const found = motionFiles.find(f => f.url === selectedMotion);
              console.log('[onEnded] fired. isGiftMotion:', isGiftMotion, 'selectedMotion:', selectedMotion, 'tag:', found?.tag, 'giftQueue:', JSON.stringify(giftQueue.current));
              // gift-triggered 영상이 끝난 경우에만 다음 gift 재생
              if (isGiftMotion) {
                isPlayingGift.current = false;
                playNextGift();
              } else {
                // gift가 아니고 neutral도 아니면 fallback
                if (found && found.tag !== 'neutral') {
                  setMotionByTag('neutral');
                }
              }
            }}
          />
          <audio
            ref={audioRef}
            className="w-full h-full"
            autoPlay
          />
        </div>
        {/* Right: Motion File List - 50% */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 flex flex-col items-end">
          {(selectedCharacterId && motionFiles.length > 0) ? (
            motionFiles.map((file) => (
              <div
                key={file.path}
                className={`p-3 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedMotion === file.url
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : 'border border-gray-200 hover:border-blue-100'
                }`}
                onClick={() => handleMotionSelect(file.url)}
                style={{ minWidth: 0, maxWidth: '100%' }}
              >
                <div className="font-mono text-sm truncate">
                  {file.path} {file.tag}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              {selectedCharacterId ? "등록된 모션 파일이 없습니다." : "캐릭터를 먼저 선택하세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default BroadcastTab;

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

// MotionFile now allows 'NULL' as a display-only tag value for clarity
// All tag normalization is handled via normalizeTag helper below

type MotionFile = {
  name: string;
  path: string;
  url: string;
  tag: 'neutral' | 'talking' | 'reaction' | 'NULL'; // 'NULL' for display if missing/empty
};

/**
 * Normalizes a tag value for display.
 * If tag is missing, empty, or whitespace, returns 'NULL'.
 * Otherwise, returns the tag as-is.
 */
// tag: unknown -> string, but only allow known tags
function normalizeTag(tag: unknown): 'neutral' | 'talking' | 'reaction' | 'NULL' {
  if (typeof tag === 'string' && tag.trim() !== '') {
    if (['neutral','talking','reaction','NULL'].includes(tag)) {
      return tag as 'neutral' | 'talking' | 'reaction' | 'NULL';
    }
  }
  return 'NULL';
}




type Character = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  status: string;
};

function BroadcastTab() {
  // 상태 변수 및 ref 선언 (중복 없이)
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'start' | 'end'>('idle');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [showRoomIdInput, setShowRoomIdInput] = useState<boolean>(false);
  const [roomIdStatus, setRoomIdStatus] = useState<string>("");
  const [roomIdInput, setRoomIdInput] = useState<string>("");
  const [roomIdConfirmed, setRoomIdConfirmed] = useState<boolean>(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [motionFiles, setMotionFiles] = useState<MotionFile[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await axios.get('/api/character');
        setCharacters(response.data || []);
      } catch (err) {
        let msg = '캐릭터 목록을 불러오는 중 오류가 발생했습니다.';
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          msg = err.response.data.message;
        }
        console.error(msg);
      }
    };
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (!selectedCharacterId) {
      setMotionFiles([]);
      setSelectedMotion("");
      return;
    }
    const fetchMotionFiles = async () => {
  try {
    const response = await axios.get(`/backend/${selectedCharacterId}/motion/list.json`);
    // Use tag from JSON; if missing/empty/whitespace, set to 'NULL' for display
    // This is the only place tag normalization should occur
    type RawMotionFile = { name: string; path: string; url: string; tag?: unknown };
    const filesWithTag = (response.data.files || []).map((f: RawMotionFile) => ({
      ...f,
      tag: normalizeTag(f.tag),
    }));
    setMotionFiles(filesWithTag);
  } catch (err: unknown) {
    let msg = '모션 파일을 불러오는 중 오류가 발생했습니다.';
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      msg = err.response.data.message;
    }
    console.error(msg);
    setMotionFiles([]);
  }
};
    fetchMotionFiles();
  }, [selectedCharacterId]);

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
      setSessionStatus('start');
      setCurrentSessionId(data.id);
      setMotionByTag('neutral');
      setShowRoomIdInput(true); // 방송 시작 후 room id 입력창 자동 노출
    } catch (err: unknown) {
      let msg = '방송 시작에 실패했습니다.';
      if (err instanceof Error) msg = err.message;
      setError(msg);
    }
  };

  const handleEndBroadcast = async () => {
  setError(null);
  if (!currentSessionId) {
    setError('진행 중인 방송 세션이 없습니다.');
    return;
  }
  try {
    const { error: updateError } = await supabase
      .from('live_sessions')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('id', currentSessionId);
    if (updateError) throw updateError;
    if (roomId) {
      try {
        await axios.post('/tiktok/stop', { unique_id: roomId });
      } catch { // error intentionally ignored
        // Ignore error (already stopped, etc.)
      }
    }
  } catch (err: unknown) {
    let msg = '방송 종료에 실패했습니다.';
    if (err instanceof Error) msg = err.message;
    setError(msg);
  } finally {
    // TikTokLive 소켓 종료 및 roomId 초기화 (항상)
    setSessionStatus('end');
    setRoomId("");
    setRoomIdStatus("");
    setRoomIdInput("");
    setRoomIdConfirmed(false);
    setShowRoomIdInput(false);
  }
};

  // 비디오/오디오 에러 핸들러 (미사용, 삭제)


  const handleMotionSelect = (url: string) => {
    if (selectedMotion !== url) setSelectedMotion(url);
  };

  const setMotionByTag = (tag: string) => {
  const literalTag = normalizeTag(tag);
  const found = motionFiles.find(f => f.tag === literalTag);
  if (found && selectedMotion !== found.url) setSelectedMotion(found.url);
};

  const handleRoomIdRegister = async () => {
    setRoomIdStatus("");
    if (!roomIdInput) return;
    try {
      const res = await axios.post("/tiktok/start", { unique_id: roomIdInput });
      setRoomId(roomIdInput);
      setRoomIdConfirmed(true);
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
      setRoomIdConfirmed(false);
    }
  };

  // Room ID가 등록된 경우, 상단에 표시
const renderRoomIdInfo = () => (
  roomIdConfirmed && roomId ? (
    <div className="mb-2 text-sm text-green-700 font-semibold">현재 Room ID: <span className="font-mono">{roomId}</span></div>
  ) : null
);

  return (
    <div className="broadcast-tab-container w-full h-full flex flex-col">
      {/* 여기에 기존 정상 JSX만 남기고, 불필요/중복 JSX 및 닫히지 않은 태그 모두 제거 */}
      <div>
        <select value={selectedCharacterId} onChange={e => setSelectedCharacterId(e.target.value)}>
          <option value="">캐릭터 선택</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {/* 기타 UI ... */}
      {renderRoomIdInfo()}
      {error && (
        <div className="text-red-500 mb-2">{error}</div>
      )}
      {roomIdStatus && (
        <div className="text-blue-500 mb-2">{roomIdStatus}</div>
      )}
      {/* Room ID 입력 모달/팝업 (간단히 prompt 사용) */}
      {showRoomIdInput && sessionStatus === 'start' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
            <div className="mb-2 font-semibold">TikTok Room ID를 입력하세요</div>
            <input
              className="border px-2 py-1 rounded mb-2"
              type="text"
              placeholder="Room ID"
              value={roomIdInput}
              onChange={e => setRoomIdInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleRoomIdRegister();
                }
              }}
              autoFocus
              disabled={roomIdConfirmed}
            />
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded mb-1"
              onClick={handleRoomIdRegister}
              disabled={!roomIdInput || roomIdConfirmed}
            >
              등록
            </button>
            <button
              className="mt-1 text-gray-500 underline"
              onClick={async () => {
                // Room ID 초기화 및 백엔드 종료 요청
                if (roomId) {
                  try { await axios.post('/tiktok/stop', { unique_id: roomId }); } catch {}
                }
                setRoomId("");
                setRoomIdInput("");
                setRoomIdConfirmed(false);
                setShowRoomIdInput(false);
              }}
            >
              취소
            </button>
            {/* roomIdConfirmed && ... 블록 제거: 불필요한 열림 괄호 삭제 */}
          </div>
        </div>
      )}
      <span className="text-gray-700 font-semibold">
        세션 상태: {sessionStatus === 'idle' ? '대기' : sessionStatus === 'start' ? '방송 중' : '종료'}
      </span>
      {currentSessionId && (
        <span className="text-xs text-gray-500">Session ID: {currentSessionId}</span>
      )}
      {/* 버튼 그룹 */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className="rounded px-4 py-2 font-bold text-white bg-green-500"
          onClick={handleStartBroadcast}
        >
          방송 시작
        </button>
        {sessionStatus === 'start' && (
          <>
            <button
              className="rounded px-4 py-2 font-bold text-white bg-red-500"
              onClick={handleEndBroadcast}
            >
              방송 종료
            </button>
          </>
        )}
      </div>
      {/* 본문: 비디오 + 모션 파일 목록 */}
      <div className="flex flex-row flex-1 w-full">
        {/* Left: Video Player - 50% */}
        <div className="flex items-center justify-center p-4 h-full">
          <video
            ref={videoRef}
            style={{ width: 720, maxWidth: '100%' }}
            className="h-full"
            src={selectedMotion || undefined}

            autoPlay
            loop
            controls
          />
          <audio
            ref={audioRef}
            className="w-full h-full"

            autoPlay
            controls
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

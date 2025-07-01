// src/components/PlaygroundTab.tsx
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

// 캐릭터 타입 정의
type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
  created_at?: string
  style: string
  perspective: string
  tone: string
  world: string
  voice_id?: string // 추가: voice_id가 있을 수 있음
}

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

type ExampleQA = { user: string; character: string };

// 이미지 URL이 상대경로일 경우 /로 시작하도록 보정(강화)
function getImageSrc(url?: string | null) {
  console.log('[getImageSrc] input:', url);
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.log('[getImageSrc] output: /default.png');
    return '/default.png';
  }
  if (url.startsWith('http')) {
    console.log('[getImageSrc] output:', url);
    return url;
  }
  const normalized = url.startsWith('/') ? url : '/' + url;
  if (!normalized.startsWith('/')) {
    console.error('[getImageSrc] next/image src runtime error: invalid src', url, normalized);
    return '/default.png';
  }
  console.log('[getImageSrc] output:', normalized);
  return normalized;
}

export default function Playground() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCharacterImageUrl, setSelectedCharacterImageUrl] = useState<string>('/default.png');
  const [prompt, setPrompt] = useState('')
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ type: 'user' | 'bot' | 'loading' | 'info'; content: string; emotion?: string }[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null); // 세션 ID 상태 추가
  type CharacterSettings = { instruction: string; examples: ExampleQA[]; voice_id?: string };
const [characterSettings, setCharacterSettings] = useState<CharacterSettings | null>(null);
  
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsError, setTTSError] = useState<string | null>(null);
  // TTS provider selection
  const [ttsProvider, setTTSProvider] = useState<'elevenlabs' | 'gemini'>('elevenlabs');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 텍스트를 TTS로 변환해 자동 재생하는 함수 (전체 mp3 다운로드 방식)
  async function playTTSFromText(text: string, voice_id?: string, provider: 'elevenlabs' | 'gemini' = 'elevenlabs') {
    setIsPlayingTTS(true);
    setTTSError(null);
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id, provider }), // provider 전달
      });
      if (!res.ok) {
        let errMsg = 'TTS 변환 실패';
        try {
          const err = await res.json();
          if (err.detail?.message) {
            errMsg = err.detail.message;
          } else if (err.detail) {
            errMsg = err.detail;
          }
        } catch {}
        throw new Error(errMsg);
      }
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new window.Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingTTS(false);
      audio.onerror = (event) => {
        setIsPlayingTTS(false);
        setTTSError('TTS 오디오 재생 실패');
        console.error('[TTS] 오디오 재생 실패:', event, audio);
      };
      audio.play();
    } catch (e: unknown) {
      let errorMsg = 'TTS 변환/재생 오류';
      if (e instanceof Error) errorMsg = e.message;
      else if (typeof e === 'string') errorMsg = e;
      setTTSError(errorMsg);
      setIsPlayingTTS(false);
    }
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching characters:', error)
        setChatHistory([{ type: 'info', content: `캐릭터 목록 로딩 실패: ${error.message}` }]);
        return
      }
      setCharacters(data as Character[])
    }
    fetchCharacters()
  }, [])

  const handleCharacterChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!event || !event.target) return;
    const target = event.target as HTMLSelectElement;
    const characterId = target.value;
    if (!characterId) {
      setSelectedCharacter(null);
      setSelectedCharacterImageUrl('/default.png');
      setIsSessionActive(false);
      setChatHistory([]);
      setCharacterSettings(null);
      return;
    }
    const char = characters.find((c) => c.id === characterId);
    if (char) {
      setSelectedCharacter(char);
      // 이미지 URL 처리: supabase storage 경로면 signed URL 생성
      let imgUrl = char.image_url || '';
      if (imgUrl && !imgUrl.startsWith('http')) {
        try {
          const storagePath = imgUrl.replace(/^\//, '');
          const { data, error } = await supabase.storage
            .from('character-assets')
            .createSignedUrl(storagePath, 60 * 60);
          if (error || !data?.signedUrl) {
            imgUrl = '/default.png';
          } else {
            imgUrl = data.signedUrl;
          }
        } catch {
          imgUrl = '/default.png';
        }
      }
      setSelectedCharacterImageUrl(imgUrl);
      setIsSessionActive(false);
      setChatHistory([{ type: 'info', content: `'${char.name}'님과 대화를 시작하려면 "대화 시작" 버튼을 눌러주세요.` }]);
      try {
        const res = await fetch(`${FASTAPI_BASE_URL}/characters/${char.id}/profile`);
        if (!res.ok) throw new Error('캐릭터 프로필을 불러오지 못했습니다.');
        const data = await res.json();
        setCharacterSettings({
          instruction: data.instruction || '',
          examples: Array.isArray(data.examples) ? data.examples : [],
          voice_id: data.voice_id // 있을 경우만
        });
        setChatHistory((prev) => [...prev, { type: 'info', content: '캐릭터 프로필(instruction/예시) 불러오기 성공.' }]);
      } catch {
        setCharacterSettings(null);
        setChatHistory((prev) => [...prev, { type: 'info', content: '캐릭터 프로필(instruction/예시) 불러오기 실패.' }]);
      }
    }

  };

  // 프로필 편집 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [editExamples, setEditExamples] = useState<ExampleQA[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 프로필 편집 시작
  const handleEditProfile = () => {
    setEditInstruction(characterSettings?.instruction || '');
    setEditExamples(characterSettings?.examples ? [...characterSettings.examples] : []);
    setIsEditingProfile(true);
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!selectedCharacter) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/characters/${selectedCharacter.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: editInstruction,
          examples: editExamples
        })
      });
      if (!res.ok) throw new Error('프로필 저장 실패');
      setCharacterSettings({ instruction: editInstruction, examples: editExamples });
      setIsEditingProfile(false);
      setChatHistory((prev) => [...prev, { type: 'info', content: '프로필 저장 성공!' }]);
    } catch {
      setChatHistory((prev) => [...prev, { type: 'info', content: '프로필 저장 실패.' }]);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 예시 추가/수정/삭제 함수
  const handleExampleChange = (idx: number, field: 'user' | 'character', value: string) => {
    setEditExamples((prev) => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };
  const handleAddExample = () => setEditExamples((prev) => [...prev, { user: '', character: '' }]);
  const handleRemoveExample = (idx: number) => setEditExamples((prev) => prev.filter((_, i) => i !== idx));


  const handleStartSession = async () => {
    if (!selectedCharacter) return;
    setIsLoadingCharacter(true);
    setChatHistory([{ type: 'loading', content: `'${selectedCharacter.name}'님을 불러오는 중...` }]);
    try {
      // PlaygroundTab에서는 세션 생성 없이 바로 LLM 안내 메시지 출력
      setChatHistory([{ type: 'bot', content: `'${selectedCharacter.name}'님과의 대화가 시작되었습니다. 무엇이 궁금하세요?` }]);
      setIsSessionActive(true);
      setSessionId(null); // Playground에서는 세션 없음
    } catch {
      console.error('Error starting session:');
      setChatHistory([{ type: 'bot', content: '캐릭터 세션 시작 실패.' }]);
      setIsSessionActive(false);
      setSessionId(null);
    }
    setIsLoadingCharacter(false);
  };


  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${FASTAPI_BASE_URL}/end_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (selectedCharacter) {
        setChatHistory(prev => [...prev, { type: 'info', content: `'${selectedCharacter.name}'님과의 대화가 종료되었습니다.` }]);
      }
      setSelectedCharacter(null);
      setIsSessionActive(false);
      setSessionId(null);
      setPrompt('');
    } catch { 
      setChatHistory(prev => [...prev, { type: 'info', content: '세션 종료 중 오류가 발생했습니다.' }]);
    }
  };

  const handleSendPrompt = async () => {
    if (!selectedCharacter || !prompt.trim() || isAsking || !isSessionActive) {
      if (!selectedCharacter) setChatHistory(prev => [...prev, { type: 'info', content: '먼저 캐릭터를 선택해주세요.' }]);
      else if (!isSessionActive) setChatHistory(prev => [...prev, { type: 'info', content: '대화 시작 버튼을 눌러주세요.' }]);
      else if (!prompt.trim()) setChatHistory(prev => [...prev, { type: 'info', content: '메시지를 입력해주세요.' }]);
      return;
    }

    const currentPrompt = prompt;
    setChatHistory(prev => [...prev, { type: 'user', content: currentPrompt }]);
    setPrompt('');
    setIsAsking(true);
    setChatHistory(prev => [...prev, { type: 'loading', content: '답변 생성 중...' }]);

    try {
      // 프롬프트 조합: instruction, examples, user_input 모두 백엔드에 전달
      const requestBody = {
        id: selectedCharacter.id,
        session_id: sessionId || `playground-${Date.now()}`,
        viewer_id: 'playground-user',
        history: [
          ...chatHistory
            .filter(msg => msg.type === 'user' || msg.type === 'bot')
            .map(msg => ({
              role: msg.type === 'user' ? 'user' : 'ai',
              content: msg.content
            })),
          { role: 'user', content: currentPrompt }
        ],
        profile: {
          instruction: characterSettings?.instruction || '',
          examples: (characterSettings?.examples || []).map(qa => ({
            user: qa.user,
            character: qa.character
          }))
        }
      };
      console.log('[PlaygroundTab] requestBody:', requestBody);

      // Call the LangGraph-based endpoint
      const res = await fetch(`${FASTAPI_BASE_URL}/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Parse the response once
      let responseData;
      try {
        responseData = await res.json();
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error(`응답 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
      }

      if (!res.ok) {
        // 오류 응답의 상세 정보를 추출하여 사용자에게 보여줍니다.
        const errorDetail = responseData.detail || responseData.message || '알 수 없는 오류';
        const errorMessage = typeof errorDetail === 'object' 
          ? JSON.stringify(errorDetail, null, 2) 
          : errorDetail;
        throw new Error(`서버 오류 (${res.status}): ${errorMessage}`);
      }
      
      // Update chat history with the response
      setChatHistory(prev => [
        ...prev.filter(msg => msg.type !== 'loading'),
        { 
          type: 'bot', 
          content: responseData.response || 'No response content', 
          emotion: responseData.emotion || 'neutral' 
        }
      ]);
      // LLM 응답 오면 TTS progressive streaming 자동 재생
      if (responseData.response) {
        // 캐릭터별 voice_id를 profile에서 추출하거나 기본값 사용
        let voice_id = undefined;
        if (characterSettings && typeof characterSettings.voice_id === 'string') {
          voice_id = characterSettings.voice_id;
        } else if (selectedCharacter && typeof selectedCharacter.voice_id === 'string') {
          voice_id = selectedCharacter.voice_id;
        }
        // '[감정 :'로 시작하는 감정 태그 부분은 TTS에서 제외
        let ttsText = responseData.response;
        if (ttsText) {
          const idx = ttsText.indexOf('[감정 :');
          if (idx > -1) {
            ttsText = ttsText.slice(0, idx).trim();
          }
        }
        await playTTSFromText(ttsText, voice_id, ttsProvider);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      setChatHistory(prev => [
        ...prev.filter(msg => msg.type !== 'loading'),
        { 
          type: 'info',
          content: `오류가 발생했습니다: ${errorMessage}`
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4 md:p-6 space-y-4">
      <header className="mb-2 md:mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800">🧠 캐릭터 Playground</h1>
      </header>
      {/* 캐릭터 선택 */}
      <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow">
        <select
          onChange={handleCharacterChange}
          value={selectedCharacter?.id || ''}
          className="border p-3 w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-lg"
          disabled={isLoadingCharacter || isAsking || (isSessionActive && !!selectedCharacter)}
        >
          <option value="">캐릭터를 선택하세요</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {/* 선택된 캐릭터 정보 및 세션 관리 버튼 */}
      {selectedCharacter && (
        <div className="flex-shrink-0 p-4 border rounded-lg shadow-md bg-white space-y-3">
          <div className="flex items-center gap-4">
            <Image
              src={getImageSrc(selectedCharacterImageUrl)}
              alt={selectedCharacter.name}
              width={80}
              height={80}
              className="rounded object-cover"
            />
            <div>
              <h2 className="text-xl font-bold">{selectedCharacter.name}</h2>
              <p className="text-gray-600 text-sm">{selectedCharacter.description}</p>
            </div>
          </div>

          {/* 캐릭터 프롬프트/예시 표시 */}
          {/* 프로필 편집/저장 UI */}
          {characterSettings && !isEditingProfile && (
            <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
              <div className="mb-2">
                <span className="font-semibold text-gray-700">프롬프트(Instruction):</span>
                <div className="whitespace-pre-line text-gray-800 bg-white rounded p-2 border mt-1 text-sm">
                  {characterSettings.instruction || <span className="text-gray-400">(설정 없음)</span>}
                </div>
              </div>
              <div>
                <span className="font-semibold text-gray-700">예시 문답:</span>
                {characterSettings.examples && characterSettings.examples.length > 0 ? (
                  <ul className="space-y-1 mt-1">
                    {characterSettings.examples.map((ex, i) => (
                      <li key={i} className="text-sm bg-white rounded p-2 border">
                        <span className="text-blue-700">Q. {ex.user}</span><br/>
                        <span className="text-green-700">A. {ex.character}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400 text-sm">(예시 없음)</div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleEditProfile} disabled={isSessionActive}>프로필 수정</button>
              </div>
            </div>
          )}
          {isEditingProfile && (
            <div className="mt-4 p-3 bg-yellow-50 border rounded-lg">
              <div className="mb-2">
                <span className="font-semibold text-gray-700">프롬프트(Instruction):</span>
                <textarea
                  className="w-full border rounded p-2 mt-1 text-sm"
                  value={editInstruction}
                  onChange={e => setEditInstruction(e.target.value)}
                  rows={3}
                  disabled={isSavingProfile}
                />
              </div>
              <div>
                <span className="font-semibold text-gray-700">예시 문답:</span>
                {editExamples.length > 0 ? (
                  <ul className="space-y-2 mt-1">
                    {editExamples.map((ex, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input
                          className="border rounded p-1 text-sm flex-1"
                          placeholder="Q. 예시 질문"
                          value={ex.user}
                          onChange={e => handleExampleChange(i, 'user', e.target.value)}
                          disabled={isSavingProfile}
                        />
                        <input
                          className="border rounded p-1 text-sm flex-1"
                          placeholder="A. 예시 답변"
                          value={ex.character}
                          onChange={e => handleExampleChange(i, 'character', e.target.value)}
                          disabled={isSavingProfile}
                        />
                        <button className="text-red-600 text-xs" onClick={() => handleRemoveExample(i)} disabled={isSavingProfile}>삭제</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400 text-sm">(예시 없음)</div>
                )}
                <button className="bg-gray-300 text-xs px-2 py-1 rounded mt-2" onClick={handleAddExample} disabled={isSavingProfile}>예시 추가</button>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={handleSaveProfile} disabled={isSavingProfile}>저장</button>
                <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>취소</button>
              </div>
            </div>
          )}

          {/* TTS Provider Selection UI */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-4 mb-2">
              <label className="font-semibold text-gray-700">음성 변환 엔진:</label>
              <select
                className="border rounded px-2 py-1"
                value={ttsProvider}
                onChange={e => setTTSProvider(e.target.value as 'elevenlabs' | 'gemini')}
                disabled={isSessionActive}
              >
                <option value="elevenlabs">ElevenLabs</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            {!isSessionActive && (
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={handleStartSession}
                disabled={isLoadingCharacter}
              >
                대화 시작
              </button>
            )}
            {isSessionActive && (
              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={handleEndSession}
                disabled={isLoadingCharacter}
              >
                대화 종료
              </button>
            )}
          </div>
          {/* 안내문구 */}
          {!isSessionActive && characterSettings && (
            <div className="mt-2 text-xs text-gray-500">※ 대화 시작 시 위 프롬프트와 예시가 LLM 컨텍스트로 활용됩니다.</div>
          )}
        </div>
      )}
      {/* 채팅창 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4" ref={chatContainerRef}>
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-400">캐릭터와 대화를 시작해보세요!</div>
        ) : (
          chatHistory.map((msg, idx) => {
            let prefix = '';
            if (msg.type === 'user') {
              prefix = msg.content.trim().toLowerCase().startsWith('q:') ? '' : 'Q: ';
            } else if (msg.type === 'bot') {
              prefix = msg.content.trim().toLowerCase().startsWith('a:') ? '' : 'A: ';
            }
            return (
              <div key={idx} className={`my-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                <span
                  className={
                    msg.type === 'user'
                      ? 'inline-block bg-blue-100 text-blue-900 rounded px-3 py-2'
                      : msg.type === 'bot'
                      ? 'inline-block bg-gray-200 text-gray-800 rounded px-3 py-2 border-l-4 border-blue-400'
                      : msg.type === 'loading'
                      ? 'inline-block bg-yellow-100 text-yellow-800 rounded px-3 py-2'
                      : 'inline-block bg-gray-100 text-gray-500 rounded px-3 py-2'
                  }
                >
                  <strong>{prefix}</strong>{msg.content}
                  {msg.type === 'bot' && msg.emotion && (
                    <span className="ml-2 text-xs text-pink-600">[{msg.emotion}]</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
      {/* 입력창 */}
      <div className="flex gap-2 mt-2 items-center">
        <input
          type="text"
          className="flex-1 border rounded px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="질문을 입력하세요"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSendPrompt();
          }}
          disabled={!isSessionActive || isAsking}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSendPrompt}
          disabled={!isSessionActive || isAsking}
        >
          전송
        </button>
        {/* TTS 상태/에러 표시 */}
        {isPlayingTTS && (
          <span className="ml-2 text-xs text-blue-600 animate-pulse">음성 재생 중...</span>
        )}
        {ttsError && (
          <span className="ml-2 text-xs text-red-500">{ttsError}</span>
        )}
      </div>
    </div>
  );
}
// src/components/PlaygroundTab.tsx
import { useEffect, useState, ChangeEvent, useRef } from 'react'
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
}

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

export default function Playground() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ type: 'user' | 'bot' | 'loading' | 'info'; content: string }[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null); // 세션 ID 상태 추가
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      setCharacters((data as Character[]) || [])
    }
    fetchCharacters()
  }, [])

  const handleCharacterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const characterId = event.target.value;
    if (!characterId) {
      setSelectedCharacter(null);
      setIsSessionActive(false);
      setChatHistory([]);
      return;
    }
    const char = characters.find((c) => c.id === characterId);
    if (char) {
      setSelectedCharacter(char);
      setIsSessionActive(false);
      setChatHistory([{ type: 'info', content: `'${char.name}'님과 대화를 시작하려면 "대화 시작" 버튼을 눌러주세요.` }]);
    }
  };

  const handleStartSession = async () => {
    if (!selectedCharacter) return;
    setIsLoadingCharacter(true);
    setChatHistory([{ type: 'loading', content: `'${selectedCharacter.name}'님을 불러오는 중...` }]);
    try {
      // 1. 세션 생성 (FastAPI)
      const sessionRes = await fetch(`${FASTAPI_BASE_URL}/start_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: selectedCharacter.id }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.session_id) {
        throw new Error(sessionData.detail || sessionData.message || '세션 생성 실패');
      }
      setSessionId(sessionData.session_id);
      // 2. 캐릭터 로딩 (기존과 동일)
      const requestBody = {
        id: selectedCharacter.id,
        world: selectedCharacter.world,
        profile: {
          name: selectedCharacter.name,
          style: selectedCharacter.style ?? '',
          perspective: selectedCharacter.perspective ?? '',
          tone: selectedCharacter.tone ?? '',
        },
      };
      const res = await fetch(`${FASTAPI_BASE_URL}/load_character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || '캐릭터 로딩에 실패했습니다.');
      }
      setChatHistory([{ type: 'bot', content: `'${selectedCharacter.name}'님과의 대화가 시작되었습니다. 무엇이 궁금하세요?` }]);
      setIsSessionActive(true);
    } catch (error: unknown) {
      console.error('Error starting session or loading character:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setChatHistory([{ type: 'bot', content: `캐릭터 세션 시작 실패: ${errorMessage}` }]);
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
    } catch (e) {
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

    if (!sessionId) {
      setChatHistory(prev => [...prev, { type: 'info', content: '세션이 존재하지 않습니다. 대화를 시작해주세요.' }]);
      return;
    }

    const currentPrompt = prompt;
    setChatHistory(prev => [...prev, { type: 'user', content: currentPrompt }]);
    setPrompt('');
    setIsAsking(true);
    setChatHistory(prev => [...prev, { type: 'loading', content: '답변 생성 중...' }]);

    try {
      if (!sessionId) {
        setChatHistory(prev => [...prev, { type: 'info', content: '세션이 존재하지 않습니다. 대화를 시작해주세요.' }]);
        setIsAsking(false);
        return;
      }
      const res = await fetch(`${FASTAPI_BASE_URL}/ask_character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCharacter.id,
          session_id: sessionId,
          viewer_id: 'playground-user',
          history: [
            ...chatHistory
              .filter((msg) => msg.type === 'user' || msg.type === 'bot')
              .map((msg) => ({
                role: msg.type === 'user' ? 'user' : 'ai',
                content: msg.content,
              })),
            { role: 'user', content: currentPrompt },
          ]
        }),
      });

      const data = await res.json();
      setChatHistory(prev => prev.filter(msg => msg.type !== 'loading'));

      if (!res.ok) {
        const errorMessage = data?.detail || data?.message || '질문에 대한 답변을 가져오는데 실패했습니다.';
        throw new Error(errorMessage);
      }
      setChatHistory(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch (error: unknown) {
      console.error('Error asking character:', error);
      const errorMessage = error instanceof Error ? error.message : '질문 처리 중 알 수 없는 오류가 발생했습니다.';
      setChatHistory(prev => [...prev.filter(msg => msg.type !== 'loading'), { type: 'bot', content: `오류: ${errorMessage}` }]);
    }
    setIsAsking(false);
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
            {selectedCharacter.image_url && (
              <Image
                src={selectedCharacter.image_url}
                alt={selectedCharacter.name}
                width={80}
                height={80}
                className="rounded object-cover"
              />
            )}
            <div>
              <h2 className="text-xl font-bold">{selectedCharacter.name}</h2>
              <p className="text-gray-600 text-sm">{selectedCharacter.description}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
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
        </div>
      )}
      {/* 채팅창 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4" ref={chatContainerRef}>
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-400">캐릭터와 대화를 시작해보세요!</div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className={`my-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
              <span
                className={
                  msg.type === 'user'
                    ? 'inline-block bg-blue-100 text-blue-900 rounded px-3 py-2'
                    : msg.type === 'bot'
                    ? 'inline-block bg-gray-200 text-gray-800 rounded px-3 py-2'
                    : msg.type === 'loading'
                    ? 'inline-block bg-yellow-100 text-yellow-800 rounded px-3 py-2'
                    : 'inline-block bg-gray-100 text-gray-500 rounded px-3 py-2'
                }
              >
                {msg.content}
              </span>
            </div>
          ))
        )}
      </div>
      {/* 입력창 */}
      <div className="flex gap-2 mt-2">
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
      </div>
    </div>
  );
}
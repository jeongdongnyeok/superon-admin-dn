// src/components/PlaygroundTab.tsx
import { useEffect, useState, ChangeEvent, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
  world: string
}

// 백엔드 API 기본 URL
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

export default function Playground() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ type: 'user' | 'bot' | 'loading' | 'info'; content: string }[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 채팅 기록 변경 시 맨 아래로 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, description, image_url, world')
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
      console.log(`Loading character: ${selectedCharacter.name} (ID: ${selectedCharacter.id}) with world: ${selectedCharacter.world.substring(0,50)}...`);
      const res = await fetch(`${FASTAPI_BASE_URL}/load_character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCharacter.id, world: selectedCharacter.world }),
      });
      
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || '캐릭터 로딩에 실패했습니다.');
      }
      console.log('Character loaded:', resData);
      setChatHistory([{ type: 'bot', content: `'${selectedCharacter.name}'님과의 대화가 시작되었습니다. 무엇이 궁금하세요?` }]);
      setIsSessionActive(true);
    } catch (error: unknown) {
      console.error('Error loading character:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setChatHistory([{ type: 'bot', content: `캐릭터 로드 실패: ${errorMessage}` }]);
      setIsSessionActive(false);
    }
    setIsLoadingCharacter(false);
  };

  const handleEndSession = () => {
    if (selectedCharacter) {
      setChatHistory(prev => [...prev, { type: 'info', content: `'${selectedCharacter.name}'님과의 대화가 종료되었습니다.` }]);
    }
    setSelectedCharacter(null); // 캐릭터 선택 드롭다운을 초기화하기 위해
    setIsSessionActive(false);
    setPrompt('');
    // chatHistory는 유지하거나, 필요시 setChatHistory([]); 로 초기화
  };

  const handleSendPrompt = async () => {
    if (!selectedCharacter || !prompt.trim() || isAsking || !isSessionActive) {
      if(!selectedCharacter) setChatHistory(prev => [...prev, {type: 'info', content: '먼저 캐릭터를 선택해주세요.'}]);
      else if (!isSessionActive) setChatHistory(prev => [...prev, {type: 'info', content: '대화 시작 버튼을 눌러주세요.'}]);
      else if(!prompt.trim()) setChatHistory(prev => [...prev, {type: 'info', content: '메시지를 입력해주세요.'}]);
      return
    }

    const currentPrompt = prompt;
    setChatHistory(prev => [...prev, { type: 'user', content: currentPrompt }]);
    setPrompt(''); 
    setIsAsking(true);
    setChatHistory(prev => [...prev, { type: 'loading', content: '답변 생성 중...' }]);

    try {
      console.log(`Asking character (ID: ${selectedCharacter.id}): ${currentPrompt}`);
      const res = await fetch(`${FASTAPI_BASE_URL}/ask_character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCharacter.id, question: currentPrompt }),
      });
      
      const data = await res.json();
      setChatHistory(prev => prev.filter(msg => msg.type !== 'loading'));

      if (!res.ok) {
        // FastAPI HTTPException의 경우 data.detail에 메시지가 담겨옴
        throw new Error(data.detail || data.message || '질문에 대한 답변을 가져오는데 실패했습니다.');
      }
      setChatHistory(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch (error: unknown) {
      console.error('Error asking character:', error)
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
          disabled={isLoadingCharacter || isAsking || (isSessionActive && !!selectedCharacter)} // 세션 중에는 캐릭터 변경 불가
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
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                {selectedCharacter.image_url && (
                <Image
                    src={selectedCharacter.image_url}
                    alt={selectedCharacter.name}
                    width={80} 
                    height={80}
                    className="rounded-full object-cover border-2 border-indigo-200"
                />
                )}
                <div className="text-center sm:text-left">
                <p className="text-xl font-semibold text-indigo-700">{selectedCharacter.name}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedCharacter.description}</p>
                <p className="text-xs text-gray-500 italic mt-1">World: {selectedCharacter.world.substring(0,100)}{selectedCharacter.world.length > 100 ? '...' : ''}</p>
                </div>
            </div>
            <div className="flex space-x-2">
                {!isSessionActive ? (
                    <button
                        onClick={handleStartSession}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoadingCharacter || isAsking}
                    >
                        대화 시작
                    </button>
                ) : (
                    <button
                        onClick={handleEndSession}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-md shadow-sm disabled:opacity-50"
                        disabled={isLoadingCharacter || isAsking}
                    >
                        대화 종료
                    </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* 채팅 기록 영역 */}
      <div ref={chatContainerRef} className="flex-grow bg-white p-4 rounded-lg shadow-inner overflow-y-auto space-y-3">
        {chatHistory.length === 0 && !selectedCharacter && (
          <p className="text-center text-gray-500">먼저 상단에서 캐릭터를 선택해주세요.</p>
        )}
        {chatHistory.length === 0 && selectedCharacter && !isSessionActive && !isLoadingCharacter && (
           <p className="text-center text-gray-500">'{selectedCharacter.name}'님과 대화를 시작하려면 "대화 시작" 버튼을 눌러주세요.</p>
        )}
         {chatHistory.length === 0 && selectedCharacter && isSessionActive && !isLoadingCharacter && (
           <p className="text-center text-gray-500">메시지를 입력하여 '{selectedCharacter.name}'님과의 대화를 시작하세요.</p>
        )}
        {chatHistory.map((chat, index) => (
          <div key={index} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
            {chat.type === 'loading' ? (
              <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg inline-block text-sm italic">
                {chat.content}
              </span>
            ) : chat.type === 'info' ? (
              <span className="text-center text-gray-500 text-sm italic w-full">
                {chat.content}
              </span>
            ) : (
              <>
                {chat.type === 'user' && (
                  <div className={`max-w-[70%] md:max-w-[60%] p-0.5 rounded-lg bg-blue-500`}>
                    <span className={`px-3 py-2 rounded-lg inline-block break-words text-white`}>
                      {chat.content}
                    </span>
                  </div>
                )}
                {chat.type === 'bot' && selectedCharacter && (
                  <div className="flex flex-col items-start max-w-[70%] md:max-w-[60%]">
                    <span className="text-xs text-gray-500 ml-2 mb-0.5 font-semibold">{selectedCharacter.name}</span>
                    <div className={`p-0.5 rounded-lg bg-slate-200 inline-block`}>
                      <span className={`px-3 py-2 rounded-lg inline-block break-words text-gray-800`}>
                        {chat.content}
                      </span>
                    </div>
                  </div>
                )}
              </>

            )}
          </div>
        ))}
      </div>

      {/* 채팅 입력 영역 */}
      {selectedCharacter && (
        <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow">
          <div className="flex space-x-2 items-center">
            <textarea
              className="border p-3 w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm md:text-base"
              placeholder={isSessionActive ? "캐릭터에게 메시지를 보내세요..." : "대화를 시작해주세요."}
              value={prompt}
              rows={2} 
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isAsking && prompt.trim() && selectedCharacter && isSessionActive) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              disabled={isAsking || isLoadingCharacter || !selectedCharacter || !isSessionActive}
            />
            <button
              onClick={handleSendPrompt}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3 rounded-md shadow-sm disabled:opacity-50 text-sm md:text-base h-full"
              disabled={isAsking || isLoadingCharacter || !prompt.trim() || !selectedCharacter || !isSessionActive}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
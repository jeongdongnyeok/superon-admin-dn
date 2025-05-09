// src/components/PlaygroundTab.tsx
import { useEffect, useState, ChangeEvent } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
  world: string // world 속성 추가
}

// 백엔드 API 기본 URL (Render 배포 주소 또는 로컬 주소)
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

export default function Playground() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [prompt, setPrompt] = useState('')
  // const [response, setResponse] = useState<string | null>(null) // 채팅 기록으로 대체
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase.from('characters').select('id, name, description, image_url, world') // 명시적으로 컬럼 지정
      if (error) {
        console.error('Error fetching characters:', error)
        alert('캐릭터 불러오기 실패: ' + error.message)
        return
      }
      setCharacters((data as Character[]) || [])
    }

    fetchCharacters()
  }, [])

  const handleCharacterChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const characterId = event.target.value;
    const char = characters.find((c) => c.id === characterId);
    if (char) {
      setSelectedCharacter(char);
      // setResponse(null); // 이전 응답 초기화 (채팅 기록 사용으로 불필요)
      setChatHistory([]); // 캐릭터 변경 시 채팅 기록 초기화
      setIsLoadingCharacter(true);
      try {
        console.log(`Loading character: ${char.name} (ID: ${char.id}) with world: ${char.world.substring(0,50)}...`);
        const res = await fetch(`${FASTAPI_BASE_URL}/load_character`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: char.id, world: char.world }),
        });
        
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || '캐릭터 로딩에 실패했습니다.');
        }
        console.log('Character loaded:', resData);
        alert(`'${char.name}' 캐릭터가 로드되었습니다! 대화를 시작하세요.`);
      } catch (error: unknown) {
        console.error('Error loading character:', error)
        if (error instanceof Error) {
          alert('캐릭터 로드 실패: ' + error.message)
        } else {
          alert('알 수 없는 오류가 발생했습니다.')
        }
      }
      setIsLoadingCharacter(false);
    } else {
      setSelectedCharacter(null);
    }
  };

  const handleSendPrompt = async () => {
    if (!selectedCharacter || !prompt.trim()) {
      alert('캐릭터를 선택하고 프롬프트를 입력해주세요.')
      return
    }

    setIsAsking(true);
    const currentPrompt = prompt;
    setPrompt(''); // 입력 필드 초기화

    try {
      console.log(`Asking character (ID: ${selectedCharacter.id}): ${currentPrompt}`);
      const res = await fetch(`${FASTAPI_BASE_URL}/ask_character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedCharacter.id, question: currentPrompt }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '질문에 대한 답변을 가져오는데 실패했습니다.');
      }
      // setResponse(data.response); // 채팅 기록으로 대체
      setChatHistory(prev => [...prev, { user: currentPrompt, bot: data.response }]);
    } catch (error: unknown) {
      console.error('Error asking character:', error)
      if (error instanceof Error) {
        alert('질문 실패: ' + error.message)
      } else {
        alert('질문 처리 중 알 수 없는 오류가 발생했습니다.')
      }
    }
    setIsAsking(false);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto"> {/* 너비 약간 확장 */}
      <h1 className="text-3xl font-bold text-center mb-8">🧠 캐릭터 Playground</h1>

      <select
        onChange={handleCharacterChange}
        value={selectedCharacter?.id || ''}
        className="border p-3 w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg" // 폰트 크기 증가
        disabled={isLoadingCharacter || isAsking}
      >
        <option value="">캐릭터 선택</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {isLoadingCharacter && <p className="text-center text-gray-600 py-4">캐릭터 로딩 중...</p>}

      {selectedCharacter && !isLoadingCharacter && (
        <div className="p-5 border rounded-lg shadow-md bg-white space-y-3">
          <div className="flex items-center space-x-4"> {/* 간격 조정 */}
            {selectedCharacter.image_url && (
              <Image
                src={selectedCharacter.image_url}
                alt={selectedCharacter.name}
                width={100} // 이미지 크기 증가
                height={100}
                className="rounded-full object-cover border-2 border-indigo-200" // 테두리 추가
              />
            )}
            <div>
              <p className="text-2xl font-semibold text-indigo-700">{selectedCharacter.name}</p> {/* 스타일 변경 */}
              <p className="text-md text-gray-700 mt-1">{selectedCharacter.description}</p> {/* 스타일 변경 */}
              <p className="text-sm text-gray-500 italic mt-1">세계관: {selectedCharacter.world.substring(0,100)}{selectedCharacter.world.length > 100 ? '...' : ''}</p> {/* 길이 제한 및 ... 추가 */}
            </div>
          </div>
        </div>
      )}

      {/* 채팅 기록 표시 */}
      {selectedCharacter && ( // 로딩 중이 아니어도 이전 채팅 기록은 보이도록
        <div className="mt-6 space-y-4 h-72 overflow-y-auto p-4 border rounded-lg bg-gray-50 shadow-inner"> {/* 높이 증가 및 스타일 변경 */}
          {chatHistory.length === 0 && !isAsking && (
             <p className="text-center text-gray-500">대화를 시작해보세요.</p>
          )}
          {chatHistory.map((chat, index) => (
            <div key={index} className="mb-3"> {/* 간격 조정 */}
              <div className="flex justify-end mb-1">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block max-w-xs md:max-w-md break-words shadow"> {/* 스타일 변경 */}
                  {chat.user}
                </span>
              </div>
              <div className="flex justify-start">
                <span className="bg-slate-200 text-gray-800 px-4 py-2 rounded-lg inline-block max-w-xs md:max-w-md break-words shadow"> {/* 스타일 변경 */}
                  {chat.bot}
                </span>
              </div>
            </div>
          ))}
          {isAsking && ( // 질문 전송 중일 때 로딩 표시
             <div className="flex justify-start">
                <span className="bg-slate-200 text-gray-800 px-4 py-2 rounded-lg inline-block">답변 생성 중...</span>
             </div>
          )}
        </div>
      )}

      {selectedCharacter && !isLoadingCharacter && (
        <div className="mt-6 flex space-x-3 items-center"> {/* 간격 조정 */}
          <textarea
            className="border p-4 w-full h-24 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none text-md" // 스타일 변경
            placeholder="캐릭터에게 메시지를 보내세요..."
            value={prompt}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isAsking && prompt.trim()) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            disabled={isAsking || !selectedCharacter} // 캐릭터 선택 안됐을 때도 비활성화
          />
          <button
            onClick={handleSendPrompt}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-4 rounded-md shadow-sm disabled:opacity-50 h-24 text-lg" // 스타일 변경
            disabled={isAsking || !prompt.trim() || !selectedCharacter}
          >
            {isAsking ? '전송 중' : '전송'}
          </button>
        </div>
      )}
    </div>
  )
}
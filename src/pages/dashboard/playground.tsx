// src/pages/dashboard/playground.tsx
import { useEffect, useState, ChangeEvent } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
}

export default function Playground() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase.from('characters').select('*')
      if (error) {
        alert('캐릭터 불러오기 실패')
        return
      }
      setCharacters((data as Character[]) || [])
    }

    fetchCharacters()
  }, [])

  const selected = characters.find((c) => c.id === selectedId)

  const handleSendPrompt = async () => {
    if (!selectedId || !prompt) {
      alert('캐릭터와 프롬프트를 입력해주세요.')
      return
    }

    // TODO: 실제 LangChain/OpenAI 응답 연결 예정
    setResponse(`"${selected?.name}" 캐릭터가 이렇게 말했을 거예요: "${prompt}" 🤖`)
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">🧠 캐릭터 Playground</h1>

      <select
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)}
        className="border p-2 w-full"
      >
        <option value="">캐릭터 선택</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {selected && (
        <div className="p-4 border rounded space-y-2">
          {selected.image_url && (
            <Image
              src={selected.image_url}
              alt={selected.name}
              width={160}
              height={160}
              className="rounded h-40 object-cover"
            />
          )}
          <p className="font-bold">{selected.name}</p>
          <p className="text-sm text-gray-500">{selected.description}</p>
        </div>
      )}

      <textarea
        className="border p-2 w-full h-24"
        placeholder="프롬프트 입력..."
        value={prompt}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
      />

      <button onClick={handleSendPrompt} className="border px-4 py-2 rounded">
        전송
      </button>

      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded shadow">
          <p>{response}</p>
        </div>
      )}
    </div>
  )
}
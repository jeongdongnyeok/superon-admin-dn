import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'

type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
  status: string
  character_id: string
  created_at?: string
}

export default function CharacterTab() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCharacters = async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching characters:', error)
      alert('캐릭터 불러오기 실패: ' + error.message)
    } else {
      setCharacters(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('characters').delete().eq('id', id)
      if (error) {
        alert('삭제 실패: ' + error.message)
      } else {
        setCharacters((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (e) {
      alert('삭제 중 오류 발생')
    }
    setDeletingId(null)
  }

  const handleStartSession = async (char: Character) => {
    try {
      const res = await axios.post('http://localhost:8000/start_session', {
        character_id: char.character_id,
      })
      if (res.data?.session_id) {
        await fetchCharacters()
      }
    } catch (e) {
      console.error('라이브 시작 실패:', e)
      alert('라이브 시작 실패')
    }
  }

  const handleEndSession = async (char: Character) => {
    try {
      const res = await supabase
        .from('live_sessions')
        .select('id')
        .eq('character_id', char.character_id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      const session_id = res.data?.id
      if (!session_id) return alert('세션 ID를 찾을 수 없습니다.')

      await axios.post('http://localhost:8000/end_session', {
        session_id,
      })

      await fetchCharacters()
    } catch (e) {
      console.error('라이브 종료 실패:', e)
      alert('라이브 종료 실패')
    }
  }

  if (loading) return <p>불러오는 중...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">🧙 캐릭터 목록</h2>
        <Link href="/dashboard/character/new">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            + 캐릭터 생성
          </button>
        </Link>
      </div>

      {characters.length === 0 ? (
        <p>등록된 캐릭터가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div key={char.id} className="border rounded p-4 shadow-sm relative">
              {char.image_url && (
                <Image
                  src={char.image_url}
                  alt={char.name}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover mb-2 rounded"
                />
              )}
              <h3 className="text-xl font-semibold">{char.name}</h3>
              <p className="text-sm text-gray-600">{char.description}</p>

              <p className="mt-2 text-sm">
                상태: <strong>{char.status}</strong>
              </p>

              <div className="mt-2 flex gap-2">
                {char.status === '대기' && (
                  <button
                    onClick={() => handleStartSession(char)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    라이브 시작
                  </button>
                )}
                {char.status === '라이브중' && (
                  <button
                    onClick={() => handleEndSession(char)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    라이브 종료
                  </button>
                )}
                <Link
                  href={`/dashboard/character/${char.id}`}
                  className="text-blue-500 underline text-sm mt-1"
                >
                  ✏️ 수정
                </Link>
              </div>

              <button
                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                onClick={() => handleDelete(char.id)}
                disabled={deletingId === char.id}
              >
                {deletingId === char.id ? '삭제중...' : '삭제'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
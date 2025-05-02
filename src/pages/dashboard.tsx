// src/pages/dashboard.tsx
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const { tab } = router.query

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/auth')
    }
    check()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">🧩 Admin Dashboard</h1>

      <nav className="flex gap-4 border-b pb-2 mb-4">
        <Link href="/dashboard?tab=character">캐릭터 관리</Link>
        <Link href="/dashboard?tab=user">사용자 관리</Link>
      </nav>

      <main>
        {tab === 'character' && <CharacterTab />}
        {tab === 'user' && <UserTab />}
        {!tab && <p>탭을 선택해주세요.</p>}
      </main>
    </div>
  )
}

function CharacterTab() {
  const [characters, setCharacters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCharacters = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert('캐릭터 불러오기 실패: ' + error.message)
    } else {
      setCharacters(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 캐릭터를 삭제하시겠습니까?')) return
    setDeletingId(id)
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setCharacters((prev) => prev.filter((char) => char.id !== id))
    }
    setDeletingId(null)
  }

  if (loading) return <p>불러오는 중...</p>
  if (characters.length === 0) return <p>등록된 캐릭터가 없습니다.</p>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">🧙 캐릭터 목록</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => (
          <div key={char.id} className="border rounded p-4 shadow-sm relative">
            {char.image_url && (
              <img src={char.image_url} alt={char.name} className="w-full h-48 object-cover mb-2 rounded" />
            )}
            <h3 className="text-xl font-semibold">{char.name}</h3>
            <p className="text-sm text-gray-600">{char.description}</p>
            <Link href={`/dashboard/character/${char.id}`} className="text-blue-500 underline">
  ✏️ 수정
</Link>
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
    </div>
  )
}

function UserTab() {
  return <p>사용자 관리 페이지 예정</p>
}
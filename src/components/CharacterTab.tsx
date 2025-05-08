import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'

type Character = {
  id: string
  name: string
  description: string
  image_url: string | null
  created_at?: string
}

export default function CharacterTab() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase.from('characters').select('*').order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching characters:', error)
        alert('캐릭터 불러오기 실패: ' + error.message) // Keep alert for user feedback
      }
      else setCharacters(data || [])
      setLoading(false)
    }

    fetchCharacters()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return 
    setDeletingId(id)
    try {
      const { error } = await supabase.from('characters').delete().eq('id', id)
      if (error) {
        console.error('Error deleting character:', error)
        alert('캐릭터 삭제 실패: ' + error.message)
      } else {
        setCharacters((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Unexpected error deleting character:', error)
      alert('캐릭터 삭제 중 예기치 않은 오류가 발생했습니다.')
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
              <Image src={char.image_url} alt={char.name} width={400} height={192} className="w-full h-48 object-cover mb-2 rounded" />
            )}
            <h3 className="text-xl font-semibold">{char.name}</h3>
            <p className="text-sm text-gray-600">{char.description}</p>
            <Link href={`/dashboard/character/${char.id}`} className="text-blue-500 underline">✏️ 수정</Link>
            <button className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              onClick={() => handleDelete(char.id)} disabled={deletingId === char.id}>
              {deletingId === char.id ? '삭제중...' : '삭제'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
// pages/dashboard/character/new.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'
import { loadCharacterToRAG } from '@/lib/apiClient'

export default function NewCharacter() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [world, setWorld] = useState('')

const handleSubmit = async () => {
  setLoading(true)

  let imageUrl = null

  if (file) {
    const filePath = `characters/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('character-images')
      .upload(filePath, file)

    if (error) {
      alert('이미지 업로드 실패: ' + error.message)
      setLoading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('character-images').getPublicUrl(filePath)

    imageUrl = publicUrl
  }

  const { data, error: insertError } = await supabase
    .from('characters')
    .insert({
      name,
      description,
      image_url: imageUrl,
      world, // 아래에서 정의된 상태값
    })
    .select()
    .single()

  if (insertError || !data) {
    alert('캐릭터 생성 실패: ' + insertError?.message)
    setLoading(false)
    return
  }

  try {
    await loadCharacterToRAG(data.id, world)
  } catch (err: any) {
    alert('RAG 서버 등록 실패: ' + err.message)
    // 여긴 실패해도 UI 이동은 가능
  }

  alert('캐릭터 생성 완료!')
  router.push('/dashboard?tab=character')
  setLoading(false)
}

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold">새 캐릭터 생성</h1>

      <input type="text" placeholder="캐릭터 이름" value={name}
             onChange={(e) => setName(e.target.value)}
             className="border p-2 w-full" />

      <textarea placeholder="설명" value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border p-2 w-full h-24" />
      <textarea
                placeholder="세계관 설명을 입력하세요"
                value={world}
                onChange={(e) => setWorld(e.target.value)}
                className="border p-2 w-full h-32" />

      <input type="file" accept="image/*"
             onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <button onClick={handleSubmit}
              className="border px-4 py-2 rounded"
              disabled={loading}>
        {loading ? '생성 중...' : '캐릭터 생성'}
      </button>
    </div>
  )
}
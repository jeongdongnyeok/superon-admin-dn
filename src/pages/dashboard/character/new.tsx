import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'
import { loadCharacterToRAG } from '@/lib/apiClient'

export default function NewCharacter() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [description, setDescription] = useState('')
  const [world, setWorld] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔽 새로 추가되는 프로필 항목들
  const [style, setStyle] = useState('')
  const [perspective, setPerspective] = useState('')
  const [tone, setTone] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    let imageUrl: string | null = null

    if (file) {
      const filePath = `characters/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, file)

      if (uploadError) {
        alert('이미지 업로드 실패: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('character-images')
        .getPublicUrl(filePath)

      imageUrl = publicUrlData.publicUrl
    }

    const { error: insertError, data: inserted } = await supabase
      .from('characters')
      .insert({
        name,
        character_id: characterId,
        description,
        image_url: imageUrl,
        world,
        style,
        perspective,
        tone,
        status: '대기'
      })
      .select()
      .single()

    if (insertError || !inserted) {
      alert('캐릭터 생성 실패: ' + insertError?.message)
      setLoading(false)
      return
    }

    try {
      await loadCharacterToRAG(inserted.character_id, world, {
        name,
        style,
        perspective,
        tone
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert('RAG 서버 등록 실패: ' + err.message)
      } else {
        alert('RAG 서버 등록 실패: 알 수 없는 에러')
      }
    }

    alert('캐릭터 생성 완료!')
    router.push('/dashboard?tab=character')
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold">새 캐릭터 생성</h1>

      <input
        type="text"
        placeholder="캐릭터 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full"
      />

      <input
        type="text"
        placeholder="영문 character_id (API 식별자)"
        value={characterId}
        onChange={(e) => setCharacterId(e.target.value)}
        className="border p-2 w-full"
      />

      <textarea
        placeholder="설명"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 w-full h-24"
      />

      <textarea
        placeholder="세계관 설명을 입력하세요"
        value={world}
        onChange={(e) => setWorld(e.target.value)}
        className="border p-2 w-full h-32"
      />

      {/* 🔽 프로필 세부 항목 입력 */}
      <input
        type="text"
        placeholder="스타일 (ex. 차가운, 활기찬)"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        className="border p-2 w-full"
      />
      <input
        type="text"
        placeholder="관점 (ex. 미래에 대한 시각)"
        value={perspective}
        onChange={(e) => setPerspective(e.target.value)}
        className="border p-2 w-full"
      />
      <input
        type="text"
        placeholder="말투 (ex. 건조하고 직설적)"
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        className="border p-2 w-full"
      />

      <input
        type="file"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFile(e.target.files?.[0] || null)
        }
      />

      <button
        onClick={handleSubmit}
        className="border px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? '생성 중...' : '캐릭터 생성'}
      </button>
    </div>
  )
}
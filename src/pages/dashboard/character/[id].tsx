import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import axios from 'axios'

export default function CharacterEditPage() {
  const router = useRouter()
  const { id } = router.query
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  // ✅ 성격 관련 필드
  const [style, setStyle] = useState('')
  const [perspective, setPerspective] = useState('')
  const [tone, setTone] = useState('')

  useEffect(() => {
    if (!id) return

    const fetchCharacter = async () => {
      const result = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single()

      if (result.error || !result.data) {
        alert('캐릭터 불러오기 실패')
      } else {
        const character = result.data
        setName(character.name)
        setDescription(character.description)
        setImageUrl(character.image_url)
        setStyle(character.style || '')
        setPerspective(character.perspective || '')
        setTone(character.tone || '')
      }
    }

    fetchCharacter()
  }, [id])

  const handleUpdate = async () => {
    let newImageUrl = imageUrl

    if (file) {
      const filePath = `characters/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('character-images')
        .upload(filePath, file)

      if (uploadError) {
        alert('이미지 업로드 실패: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('character-images')
        .getPublicUrl(filePath)

      newImageUrl = publicUrl
    }

    const { error: updateError } = await supabase
      .from('characters')
      .update({
        name,
        description,
        image_url: newImageUrl,
        style,
        perspective,
        tone,
      })
      .eq('id', id)

    if (updateError) {
      alert('업데이트 실패: ' + updateError.message)
    } else {
      alert('수정 완료!')
      router.push('/dashboard?tab=character')
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold">캐릭터 수정</h1>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full"
        placeholder="캐릭터 이름"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 w-full h-24"
        placeholder="캐릭터 설명"
      />

      {/* ✅ 성격 관련 입력 */}
      <input
        type="text"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        className="border p-2 w-full"
        placeholder="스타일 (예: 시크하고 논리적인)"
      />
      <input
        type="text"
        value={perspective}
        onChange={(e) => setPerspective(e.target.value)}
        className="border p-2 w-full"
        placeholder="관점 (예: 미래에 대한 냉철한 시각)"
      />
      <input
        type="text"
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        className="border p-2 w-full"
        placeholder="말투 (예: 건조하고 직설적)"
      />

      {imageUrl && (
        <Image
          src={imageUrl}
          alt="업로드된 캐릭터 이미지"
          width={160}
          height={160}
          className="mb-2 rounded object-cover"
        />
      )}
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpdate} className="border px-4 py-2 rounded">
        수정하기
      </button>
    </div>
  )
}
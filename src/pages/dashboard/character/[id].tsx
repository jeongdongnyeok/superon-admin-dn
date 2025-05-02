import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'


export default function CharacterEditPage() {
  const router = useRouter()
  const { id } = router.query
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchCharacter = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        alert('캐릭터 불러오기 실패')
      } else {
        setName(data.name)
        setDescription(data.description)
        setImageUrl(data.image_url)
      }
    }

    fetchCharacter()
  }, [id])

  const handleUpdate = async () => {
    let newImageUrl = imageUrl

    if (file) {
      const filePath = `characters/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('character-images')
        .upload(filePath, file)

      if (error) {
        alert('이미지 업로드 실패: ' + error.message)
        return
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from('character-images').getPublicUrl(filePath)

      newImageUrl = publicUrl
    }

    const { error } = await supabase
      .from('characters')
      .update({
        name,
        description,
        image_url: newImageUrl
      })
      .eq('id', id)

    if (error) {
      alert('업데이트 실패: ' + error.message)
    } else {
      alert('수정 완료!')
      router.push('/dashboard?tab=character')
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold">캐릭터 수정</h1>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 w-full" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 w-full h-24" />
      {imageUrl && <img src={imageUrl} className="h-40 mb-2 rounded" />}
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpdate} className="border px-4 py-2 rounded">수정하기</button>
    </div>
  )
}
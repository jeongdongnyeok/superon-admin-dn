// src/lib/apiClient.ts
export const loadCharacter = async (id: string, world: string) => {
    await fetch('http://localhost:8000/load_character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, world }),
    })
  }
  
  export const askCharacter = async (id: string, question: string) => {
    const res = await fetch('http://localhost:8000/ask_character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, question }),
    })
    return res.json()
  }

 // LangChain API 호출 유틸 추가 수정
 export const loadCharacterToRAG = async (
  id: string,
  world: string,
  profile: {
    name: string
    style: string
    perspective: string
    tone: string
  }
) => {
  const res = await fetch("http://localhost:8000/load_character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, world, profile }),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error("LangChain 연동 실패: " + msg)
  }
}
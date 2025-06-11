// src/lib/apiClient.ts

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';
function getWsBaseUrl() {
  return BASE_URL.replace(/^http/, 'ws');
}

export const loadCharacter = async (id: string, world: string) => {
    await fetch(`${BASE_URL}/load_character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, world }),
    })
  }
  
  export const askCharacter = async (id: string, question: string) => {
    const res = await fetch(`${BASE_URL}/ask_character`, {
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
  const res = await fetch(`${BASE_URL}/load_character`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, world, profile }),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error("LangChain 연동 실패: " + msg)
  }
}
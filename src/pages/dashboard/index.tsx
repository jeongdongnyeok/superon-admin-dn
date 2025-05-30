// src/pages/dashboard/index.tsx
import withAuth from '@/lib/withAuth'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Link from 'next/link'

import CharacterTab from '@/components/CharacterTab'
import UserTab from '@/components/UserTab'
import PlaygroundTab from '@/components/PlaygroundTab'
import ChatLogsTab from '@/components/ChatLogsTab'
import BroadcastTab from '@/components/BroadcastTab'

function DashboardPage() {
  const router = useRouter()
  const { tab } = router.query

  useEffect(() => {
    // 로그인 체크는 withAuth에서 이미 함 → 여기선 tab 없는 경우만 처리
    if (!tab || typeof tab !== 'string') {
      router.replace('/dashboard?tab=character')
    }
  }, [router, tab])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">🧩 Admin Dashboard</h1>

      <nav className="flex gap-4 border-b pb-2 mb-4 overflow-x-auto">
        <Link 
          href="/dashboard?tab=character" 
          className={`whitespace-nowrap px-3 py-1 rounded ${tab === 'character' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          캐릭터 관리
        </Link>
        <Link 
          href="/dashboard?tab=user" 
          className={`whitespace-nowrap px-3 py-1 rounded ${tab === 'user' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          사용자 관리
        </Link>
        <Link 
          href="/dashboard?tab=playground" 
          className={`whitespace-nowrap px-3 py-1 rounded ${tab === 'playground' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          🧠 Playground
        </Link>
        <Link 
          href="/dashboard?tab=chatlogs" 
          className={`whitespace-nowrap px-3 py-1 rounded ${tab === 'chatlogs' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          채팅 로그
        </Link>
        <Link 
          href="/dashboard?tab=broadcast" 
          className={`whitespace-nowrap px-3 py-1 rounded ${tab === 'broadcast' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          🎥 방송 관리
        </Link>
      </nav>

      <main className={tab === 'broadcast' ? 'flex flex-row w-full h-[calc(100vh-180px)]' : ''}>
        {tab === 'character' && <CharacterTab />}
        {tab === 'user' && <UserTab />}
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'chatlogs' && <ChatLogsTab />}
        {tab === 'broadcast' && <BroadcastTab />}
        {!tab && <p>탭을 선택해주세요.</p>}
      </main>
    </div>
  )
}

export default withAuth(DashboardPage)

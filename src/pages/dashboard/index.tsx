// src/pages/dashboard/index.tsx
import withAuth from '@/lib/withAuth'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Link from 'next/link'

import CharacterTab from '@/components/CharacterTab'
import UserTab from '@/components/UserTab'
import PlaygroundTab from '@/components/PlaygroundTab'

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

      <nav className="flex gap-4 border-b pb-2 mb-4">
        <Link href="/dashboard?tab=character" className="hover:underline">캐릭터 관리</Link>
        <Link href="/dashboard?tab=user" className="hover:underline">사용자 관리</Link>
        <Link href="/dashboard?tab=playground" className="hover:underline">🧠 Playground</Link>
      </nav>

      <main>
        {tab === 'character' && <CharacterTab />}
        {tab === 'user' && <UserTab />}
        {tab === 'playground' && <PlaygroundTab />}
        {!tab && <p>탭을 선택해주세요.</p>}
      </main>
    </div>
  )
}

export default withAuth(DashboardPage)

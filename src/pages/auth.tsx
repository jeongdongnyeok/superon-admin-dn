// pages/auth.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('회원가입 완료!')
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else alert('로그인 완료!')
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold">관리자 로그인</h1>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full" />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full" />
      <div className="flex gap-4">
        <button onClick={handleSignup} className="p-2 border rounded">회원가입</button>
        <button onClick={handleLogin} className="p-2 border rounded">로그인</button>
      </div>
    </div>
  )
}
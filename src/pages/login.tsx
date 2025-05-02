import { useRouter } from 'next/router'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  return (
    <div className="p-8 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">로그인</h1>
      <input className="border p-2 w-full" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 w-full" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button className="border px-4 py-2 mt-2" onClick={handleLogin}>로그인</button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
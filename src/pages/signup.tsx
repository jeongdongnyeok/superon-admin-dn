import { useRouter } from 'next/router'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else {
      alert('회원가입 완료! 로그인 해주세요.')
      router.push('/login')
    }
  }

  return (
    <div className="p-8 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <input className="border p-2 w-full" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 w-full" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button className="border px-4 py-2 mt-2" onClick={handleSignup}>회원가입</button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
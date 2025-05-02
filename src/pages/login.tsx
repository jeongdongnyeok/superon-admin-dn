import { useRouter } from 'next/router'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else {
      alert('회원가입 성공! 로그인해주세요.')
      setIsSignup(false)
    }
  }

  return (
    <div className="p-8 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">{isSignup ? '회원가입' : '로그인'}</h1>

      <input
        className="border p-2 w-full"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        value={email}
      />
      <input
        className="border p-2 w-full"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        value={password}
      />

      <button
        className="border px-4 py-2 mt-2 w-full"
        onClick={isSignup ? handleSignup : handleLogin}
      >
        {isSignup ? '회원가입' : '로그인'}
      </button>

      <p className="text-sm text-gray-600">
        {isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}{' '}
        <button
          className="text-blue-500 underline"
          onClick={() => {
            setIsSignup(!isSignup)
            setError('')
          }}
        >
          {isSignup ? '로그인하기' : '회원가입하기'}
        </button>
      </p>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
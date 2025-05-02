// src/lib/withAuth.tsx
import { useEffect } from "react"
import { useRouter } from "next/router"
import { supabase } from "@/lib/supabaseClient"

export default function withAuth(Component: React.FC) {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter()

    useEffect(() => {
      const checkAuth = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login")
        }
      }

      checkAuth()
    }, [])

    return <Component {...props} />
  }
}
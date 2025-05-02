// src/lib/withAuth.tsx
import React, { JSX, useEffect } from "react"
import { useRouter } from "next/router"
import { supabase } from "@/lib/supabaseClient"

export default function withAuth<P extends JSX.IntrinsicAttributes = {}>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter()

    useEffect(() => {
      const checkAuth = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) router.push("/login")
      }

      checkAuth()
    }, [router])

    return <Component {...props} />
  }
}
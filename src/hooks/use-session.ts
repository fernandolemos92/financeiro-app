"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/api/auth"

export function useSession() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: session } = await authClient.getSession()
        if (!session) {
          router.push("/login")
        } else {
          setIsAuthenticated(true)
        }
      } catch {
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  return { isLoading, isAuthenticated }
}
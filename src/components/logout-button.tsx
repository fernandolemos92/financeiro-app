"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/api/auth"

export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await authClient.signOut()
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  )
}
"use client"

import { useSession } from "@/hooks/use-session"
import { AppShell } from "@/components/app-shell"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useSession()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
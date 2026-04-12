"use client"

import { AppShell } from "@/components/app-shell"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
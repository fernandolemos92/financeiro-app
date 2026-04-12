import { AppLayout } from "@/components/app-layout"

export default function PlannedVsActualLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
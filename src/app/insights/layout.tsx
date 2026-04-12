import { AppLayout } from "@/components/app-layout"

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
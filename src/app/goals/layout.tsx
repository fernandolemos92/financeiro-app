import { AppLayout } from "@/components/app-layout"

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
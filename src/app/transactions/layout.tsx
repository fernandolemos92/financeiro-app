import { AppLayout } from "@/components/app-layout"

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
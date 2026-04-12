import { AppLayout } from "@/components/app-layout"

export default function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
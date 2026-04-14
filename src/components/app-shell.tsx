"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { useTransactionModal } from "@/contexts/transaction-modal-context"
import { Plus, X as XIcon, List, House, CurrencyDollar, Target, Crosshair, ChartLine, Bank } from "phosphor-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: House },
  { name: "Transações", href: "/transactions", icon: CurrencyDollar },
  { name: "Metas", href: "/goals", icon: Target },
  { name: "Planejado vs Realizado", href: "/planned-vs-actual", icon: Crosshair },
  { name: "Insights", href: "/insights", icon: ChartLine },
  { name: "Investimentos", href: "/investments", icon: Bank },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const { openModal } = useTransactionModal()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  React.useEffect(() => {
    closeMobileMenu()
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Pular para o conteúdo principal
      </a>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={toggleMobileMenu}
            className="p-2 -ml-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <XIcon size={24} weight="bold" />
            ) : (
              <List size={24} weight="bold" />
            )}
          </button>
          <span className="font-heading text-xl font-semibold text-primary ml-2">Financeiro</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openModal}>
          <Plus size={16} weight="bold" />
          <span className="text-xs">Nova</span>
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar flex-col">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <span className="font-heading text-xl font-semibold text-primary">Financeiro</span>
        </div>

        <div className="p-4">
          <Button className="w-full gap-2 min-h-[44px]" size="lg" onClick={openModal}>
            <Plus size={20} weight="bold" />
            Nova Transação
          </Button>
        </div>

        <nav className="flex flex-col gap-1 px-4 flex-1 mt-8" role="navigation" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar min-h-[44px]",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon size={20} weight="bold" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={cn(
          "lg:hidden fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <span className="font-heading text-xl font-semibold text-primary">Financeiro</span>
        </div>

        <nav className="flex flex-col gap-1 p-4" role="navigation" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar min-h-[44px]",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon size={20} weight="bold" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Button className="w-full gap-2 min-h-[44px]" size="lg" onClick={openModal}>
            <Plus size={20} weight="bold" />
            Nova Transação
          </Button>
          <LogoutButton />
        </div>
      </div>

      {/* Main content */}
      <main 
        id="main-content" 
        className={cn(
          "lg:pl-64 pt-16 lg:pt-0"
        )}
      >
        <div className="min-h-screen p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
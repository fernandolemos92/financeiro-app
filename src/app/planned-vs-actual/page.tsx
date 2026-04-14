"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { CloseButton } from "@/components/ui/close-button"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  useTransactions,
  usePlannedAmounts,
  calculateExpenseBreakdown,
  calculatePlannedVsActual,
  checkAllOnTrack,
  expenseCategories,
  ExpenseNature,
  PlannedVsActualItem,
  Transaction,
} from "@/hooks/use-transactions"
import { formatInputValue, parseInputValue } from "@/hooks/use-goals"
import { formatCurrency, formatDate, getMonthName, formatMonthYear } from "@/lib/formatting"
import { formatCurrencyDisplay } from "@/lib/monetary-formatting"
import { Money, House, Confetti, TrendUp } from "@phosphor-icons/react"

const NATURE_OPTIONS: { value: ExpenseNature; label: string; color: string }[] = [
  { value: "debt", label: "Dívidas", color: "text-red-400" },
  { value: "cost_of_living", label: "Custo de Vida", color: "text-orange-400" },
  { value: "pleasure", label: "Prazer", color: "text-purple-400" },
  { value: "application", label: "Alocações", color: "text-blue-400" },
]

function getNatureIcon(nature: string, size: number = 24) {
  switch (nature) {
    case "debt":
      return <Money size={size} weight="bold" />
    case "cost_of_living":
      return <House size={size} weight="bold" />
    case "pleasure":
      return <Confetti size={size} weight="bold" />
    case "application":
      return <TrendUp size={size} weight="bold" />
    default:
      return <Money size={size} weight="bold" />
  }
}


type NatureStatus = 
  | "sem_planejamento_e_sem_realizado"
  | "sem_planejamento_com_gasto"
  | "sem_gasto_realizado"
  | "dentro_do_planejado"
  | "acima_do_planejado"

function getNatureStatus(planned: number, actual: number): NatureStatus {
  if (planned === 0 && actual === 0) return "sem_planejamento_e_sem_realizado"
  if (planned === 0 && actual > 0) return "sem_planejamento_com_gasto"
  if (planned > 0 && actual === 0) return "sem_gasto_realizado"
  if (planned > 0 && actual <= planned) return "dentro_do_planejado"
  return "acima_do_planejado"
}

function DiscardChangesModal({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Descartar alterações?
          </h2>
          <CloseButton onClick={onCancel} className="" />
        </div>

        <p className="text-sm text-foreground">
          Você fez mudanças no planejamento deste mês e elas ainda não foram salvas.
          Se continuar, essas alterações serão perdidas.
        </p>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Continuar editando
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            Descartar e continuar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function getNatureStatusLabel(status: NatureStatus): string {
  switch (status) {
    case "sem_planejamento_e_sem_realizado": return "Sem planejamento e sem realizado"
    case "sem_planejamento_com_gasto": return "Sem planejamento, com gasto realizado"
    case "sem_gasto_realizado": return "Sem gasto realizado"
    case "dentro_do_planejado": return "Dentro do planejado"
    case "acima_do_planejado": return "Acima do planejado"
  }
}

function getNatureStatusColor(status: NatureStatus): string {
  switch (status) {
    case "sem_planejamento_e_sem_realizado": return "text-muted-foreground"
    case "sem_planejamento_com_gasto": return "text-yellow-400"
    case "sem_gasto_realizado": return "text-green-400"
    case "dentro_do_planejado": return "text-green-400"
    case "acima_do_planejado": return "text-red-400"
  }
}

function formatPercentage(percentage: number): string {
  if (percentage === 0) return "0%"
  if (percentage > 0 && percentage < 10) return `${percentage.toFixed(1)}%`
  return `${Math.round(percentage)}%`
}

function getAvailableOrExceeded(status: NatureStatus, planned: number, actual: number) {
  if (status === "dentro_do_planejado") {
    return {
      label: "Disponível para gastar",
      value: planned - actual,
      color: "text-green-400",
      sign: "+",
    }
  }
  if (status === "acima_do_planejado") {
    return {
      label: "Acima do planejado",
      value: actual - planned,
      color: "text-red-400",
      sign: "-",
    }
  }
  return null
}

function NatureDetailModal({
  isOpen,
  onClose,
  item,
  transactions,
  monthName,
  monthKey,
}: {
  isOpen: boolean
  onClose: () => void
  item: PlannedVsActualItem
  transactions: Transaction[]
  monthName: string
  monthKey: string
}) {
  const status = getNatureStatus(item.planned, item.actual)
  const difference = item.actual - item.planned

  const natureTransactions = React.useMemo(() => {
    // Filter by nature AND by the selected month
    return transactions
      .filter((t) => {
        const transactionMonth = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`
        return transactionMonth === monthKey && t.type === "expense" && t.expense_nature === item.nature
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, item.nature, monthKey])

  // Helper to get the best label for a transaction
  const getTransactionLabel = (transaction: Transaction): string => {
    // Priority 1: description if it's useful (not just the category name repeated)
    if (transaction.description && transaction.description !== transaction.category) {
      return transaction.description
    }
    // Priority 2: subcategory if it exists
    if (transaction.subcategory) {
      // Capitalize first letter
      return transaction.subcategory.charAt(0).toUpperCase() + transaction.subcategory.slice(1)
    }
    // Priority 3: category name (from expenseCategories list)
    const cat = expenseCategories.find(c => c.id === transaction.category)
    return cat?.name || transaction.category
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {item.natureLabel} - {monthName}
            </h3>
            <p className={`text-sm ${getNatureStatusColor(status)}`}>
              {getNatureStatusLabel(status)}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Planejado</p>
            <p className="font-amount text-lg font-medium text-foreground">
              {formatCurrency(item.planned)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Realizado</p>
            <p className="font-amount text-lg font-medium text-foreground">
              {formatCurrency(item.actual)}
            </p>
          </div>
          {(() => {
            const available = getAvailableOrExceeded(status, item.planned, item.actual)
            if (available) {
              return (
                <div>
                  <p className="text-xs text-muted-foreground">{available.label}</p>
                  <p className={`font-amount text-lg font-medium ${available.color}`}>
                    {available.sign}{formatCurrency(available.value)}
                  </p>
                </div>
              )
            }
            return null
          })()}
          <div>
            <p className="text-xs text-muted-foreground">Percentual</p>
            <p className={`font-amount text-lg font-medium ${status === "acima_do_planejado" ? "text-red-400" : status === "dentro_do_planejado" ? "text-green-400" : "text-muted-foreground"}`}>
              {item.planned > 0 ? formatPercentage(item.percentage) : "-"}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Transações do mês</h4>
          {natureTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transação nesta natureza neste mês.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {natureTransactions.map((t) => (
                <div key={t.id} className="flex justify-between items-center px-4 py-3 rounded bg-muted/50">
                  <div>
                    <p className="text-sm text-foreground">{getTransactionLabel(t)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                  </div>
                  <p className="font-amount text-sm text-red-400">
                    {formatCurrency(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      </div>
    </Modal>
  )
}

function NatureCard({ 
  item, 
  onClick,
}: { 
  item: PlannedVsActualItem
  onClick: () => void
}) {
  const status = getNatureStatus(item.planned, item.actual)
  const difference = item.actual - item.planned
  const percentage = item.planned > 0 ? (item.actual / item.planned) * 100 : 0
  const barWidth = Math.min(percentage, 100)

  const natureOption = NATURE_OPTIONS.find((n) => n.value === item.nature)

  return (
    <Card
      role="button"
      tabIndex={0}
      className="cursor-pointer hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{natureOption?.icon}</span>
            <CardTitle className="text-base">{item.natureLabel}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Planejado</p>
            <p className="font-amount text-foreground">{formatCurrency(item.planned)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Realizado</p>
            <p className="font-amount text-foreground">{formatCurrency(item.actual)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                status === "acima_do_planejado" ? "bg-red-400" : 
                status === "sem_planejamento_com_gasto" ? "bg-yellow-400" :
                "bg-green-400"
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {item.planned > 0 ? formatPercentage(percentage) : "-"}
          </div>
        </div>

        <div className="flex justify-between text-xs pt-4">
          <span className="text-muted-foreground">
            {getNatureStatusLabel(status)}
          </span>
          {(() => {
            const available = getAvailableOrExceeded(status, item.planned, item.actual)
            if (available) {
              return (
                <span className={available.color}>
                  {available.sign}{formatCurrency(available.value)}
                </span>
              )
            }
            return <span className="text-muted-foreground"></span>
          })()}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlannedVsActualPage() {
  const router = useRouter()
  const { transactions, isLoaded } = useTransactions()

  // Page controls its own selectedMonth state
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  // Pass selectedMonth to hook so it syncs correctly
  const {
    plannedAmounts,
    isLoaded: isPlannedLoaded,
    isInitialized,
    updatePlannedAmount,
    updateMultiplePlannedAmounts,
    currentMonthKey,
    setMonth,
  } = usePlannedAmounts(selectedMonth)

  const [selectedNature, setSelectedNature] = React.useState<PlannedVsActualItem | null>(null)
  const [inputValues, setInputValues] = React.useState<Record<ExpenseNature, string>>(() => {
    const initial: Record<ExpenseNature, string> = {
      debt: "",
      cost_of_living: "",
      pleasure: "",
      application: "",
    }
    return initial
  })
  const [hasPendingChanges, setHasPendingChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Modal de descarte para navegação interna
  const [showDiscardModal, setShowDiscardModal] = React.useState(false)
  const [pendingNavigation, setPendingNavigation] = React.useState<{
    type: "month" | "route"
    destination?: string
  } | null>(null)

  const [year, month] = React.useMemo(() => {
    const [y, m] = selectedMonth.split("-")
    return [parseInt(y), parseInt(m)]
  }, [selectedMonth])

  const handleMonthChange = (value: string) => {
    if (hasPendingChanges) {
      setPendingNavigation({ type: "month", destination: value })
      setShowDiscardModal(true)
      return
    }
    setSelectedMonth(value || selectedMonth)
  }

  const handleConfirmDiscard = () => {
    if (pendingNavigation?.type === "month") {
      setHasPendingChanges(false)
      setSelectedMonth(pendingNavigation.destination || selectedMonth)
    } else if (pendingNavigation?.type === "route") {
      setHasPendingChanges(false)
      router.push(pendingNavigation.destination || "/")
    }
    setShowDiscardModal(false)
    setPendingNavigation(null)
  }

  const handleCancelDiscard = () => {
    setShowDiscardModal(false)
    setPendingNavigation(null)
  }

  // Sync page's selectedMonth with hook when month changes
  React.useEffect(() => {
    if (isInitialized && selectedMonth !== currentMonthKey) {
      setMonth(selectedMonth)
    }
  }, [selectedMonth, currentMonthKey, isInitialized, setMonth])

  // Proteção contra saída do navegador (apenas beforeunload para saída real)
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasPendingChanges])

  // Interceptação de navegação interna via cliques em links
  React.useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target || !hasPendingChanges) return

      const href = target.getAttribute("href")
      // Verificar se é navegação interna (começa com /)
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        // Não interceptar se já está em planned-vs-actual (é um link interno da página)
        if (href === "/planned-vs-actual" || href === "/planned-vs-actual/") return

        e.preventDefault()
        setPendingNavigation({ type: "route", destination: href })
        setShowDiscardModal(true)
      }
    }

    document.addEventListener("click", handleLinkClick, true)
    return () => document.removeEventListener("click", handleLinkClick, true)
  }, [hasPendingChanges])

  const availableMonths = React.useMemo(() => {
    const months: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: formatMonthYear(d.getMonth(), d.getFullYear()),
      })
    }
    return months
  }, [])

  const expenseBreakdownByMonth = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) {
      return { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }
    }

    const breakdown = { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }

    const filtered = transactions
      .filter((t) => {
        const transactionMonth = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`
        return transactionMonth === selectedMonth && t.type === "expense"
      })

    filtered.forEach((t) => {
      const nature = t.expense_nature as ExpenseNature
      if (nature in breakdown) {
        breakdown[nature] += t.amount
      }
    })

    return breakdown
  }, [transactions, isLoaded, selectedMonth])

  const plannedVsActualItems = React.useMemo(() => {
    if (!isInitialized || !plannedAmounts) return []
    return calculatePlannedVsActual(plannedAmounts, expenseBreakdownByMonth)
  }, [plannedAmounts, expenseBreakdownByMonth, isInitialized])

  const totalPlanned = React.useMemo(() => {
    return plannedVsActualItems.reduce((sum, item) => sum + item.planned, 0)
  }, [plannedVsActualItems])

  const totalActual = React.useMemo(() => {
    return plannedVsActualItems.reduce((sum, item) => sum + item.actual, 0)
  }, [plannedVsActualItems])

  const totalDifference = totalActual - totalPlanned

  const getOverallStatus = (): string => {
    if (totalPlanned === 0 && totalActual === 0) return "Sem planejamento definido"
    if (totalPlanned === 0 && totalActual > 0) return "Gasto sem planejamento"
    if (totalActual <= totalPlanned) return "Dentro do planejado"
    return "Acima do planejado"
  }

  const getOverallStatusColor = (): string => {
    if (totalPlanned === 0 && totalActual === 0) return "text-muted-foreground"
    if (totalPlanned === 0 && totalActual > 0) return "text-yellow-400"
    if (totalActual <= totalPlanned) return "text-green-400"
    return "text-red-400"
  }

  React.useEffect(() => {
    if (isInitialized && plannedAmounts) {
      const values: Record<ExpenseNature, string> = {
        debt: plannedAmounts.debt ? formatInputValue(plannedAmounts.debt.toString()) : "",
        cost_of_living: plannedAmounts.cost_of_living ? formatInputValue(plannedAmounts.cost_of_living.toString()) : "",
        pleasure: plannedAmounts.pleasure ? formatInputValue(plannedAmounts.pleasure.toString()) : "",
        application: plannedAmounts.application ? formatInputValue(plannedAmounts.application.toString()) : "",
      }
      setInputValues(values)
    }
  }, [isInitialized, plannedAmounts, selectedMonth])

  const handleInputChange = (nature: ExpenseNature, value: string) => {
    const formatted = formatInputValue(value)
    setInputValues((prev) => ({ ...prev, [nature]: formatted }))
    setHasPendingChanges(true)
  }

  const handleInputBlur = (nature: ExpenseNature, value: string) => {
    const rawValue = parseInputValue(value)
    const numValue = parseFloat(rawValue.replace(",", ".")) || 0
    const sanitized = Math.max(0, numValue)
    setInputValues((prev) => ({ ...prev, [nature]: formatInputValue(sanitized.toString()) }))
  }

  const handleSavePlanned = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const updates = {
        debt: parseFloat(parseInputValue(inputValues.debt).replace(",", ".")) || 0,
        cost_of_living: parseFloat(parseInputValue(inputValues.cost_of_living).replace(",", ".")) || 0,
        pleasure: parseFloat(parseInputValue(inputValues.pleasure).replace(",", ".")) || 0,
        application: parseFloat(parseInputValue(inputValues.application).replace(",", ".")) || 0,
      }

      // Validate values before saving
      const maxValue = 999999999.99
      const invalidValues = Object.entries(updates).filter(
        ([, amount]) => amount > maxValue
      )

      if (invalidValues.length > 0) {
        const fieldNames = invalidValues
          .map(([nature]) => {
            const opt = NATURE_OPTIONS.find((n) => n.value === nature)
            return opt?.label || nature
          })
          .join(", ")
        setSaveError(`Valores muito altos em: ${fieldNames}. Máximo permitido: ${formatCurrencyDisplay(999_999_999.99)}`)
        toast.error(`Valor muito alto para: ${fieldNames}`)
        return
      }

      // Save all values in a single request (prevents race conditions)
      await updateMultiplePlannedAmounts(updates)

      setHasPendingChanges(false)
      toast.success("Planejamento salvo com sucesso")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar"
      setSaveError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isLoaded || !isPlannedLoaded || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const monthName = getMonthName(month - 1)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Planejado vs Realizado</h1>
          <p className="mt-1 text-muted-foreground">Compare seus gastos planejados com o realizado</p>
        </div>

        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ===== BLOCO DE ACOMPANHAMENTO EXECUTIVO ===== */}
      <section className="space-y-4">
        {/* Macro Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Planejado</p>
                <p className="font-amount text-xl font-bold text-foreground">
                  {formatCurrency(totalPlanned)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Realizado</p>
                <p className="font-amount text-xl font-bold text-foreground">
                  {formatCurrency(totalActual)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {totalActual <= totalPlanned ? "Disponível para gastar" : "Acima do planejado"}
                </p>
                <p className={`font-amount text-xl font-bold ${totalActual <= totalPlanned ? "text-green-400" : "text-red-400"}`}>
                  {totalActual <= totalPlanned
                    ? `+${formatCurrency(totalPlanned - totalActual)}`
                    : `-${formatCurrency(totalActual - totalPlanned)}`
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`font-amount text-xl font-bold ${getOverallStatusColor()}`}>
                  {getOverallStatus()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===== BLOCO DE ACOMPANHAMENTO DETALHADO ===== */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">Acompanhamento por Categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plannedVsActualItems.map((item) => (
            <NatureCard
              key={item.nature}
              item={item}
              onClick={() => setSelectedNature(item)}
            />
          ))}
        </div>
      </section>

      {/* ===== BLOCO DE CONFIGURAÇÃO (SECUNDÁRIO) ===== */}
      <section className="space-y-4 pt-6 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Configuração do Planejamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste os limites de gastos para cada categoria</p>
          </div>
          {hasPendingChanges && (
            <p className="text-sm text-yellow-400">Você tem alterações não salvas</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definir Planejado - {monthName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {saveError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Erro ao salvar</p>
                    <p className="text-sm text-muted-foreground mt-1">{saveError}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Defina quanto você planeja gastar em cada categoria neste mês:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NATURE_OPTIONS.map((nature) => (
                <div key={nature.value} className="space-y-2">
                  <Label htmlFor={`planned-${nature.value}`} className="flex items-center gap-2">
                    <div className={nature.color}>
                      {getNatureIcon(nature.value, 18)}
                    </div>
                    <span className={nature.color}>{nature.label}</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      id={`planned-${nature.value}`}
                      type="text"
                      inputMode="numeric"
                      value={inputValues[nature.value] || ""}
                      onChange={(e) => handleInputChange(nature.value, e.target.value)}
                      onBlur={(e) => handleInputBlur(nature.value, e.target.value)}
                      placeholder="0,00"
                      className="pl-10 font-amount"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t border-border/30">
              <Button
                onClick={handleSavePlanned}
                disabled={!hasPendingChanges || isSaving}
                className="flex-1"
              >
                {isSaving ? "Salvando..." : "Salvar planejamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {selectedNature && (
        <NatureDetailModal
          isOpen={true}
          onClose={() => setSelectedNature(null)}
          item={selectedNature}
          transactions={transactions.filter((t) => {
            const transactionMonth = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`
            return transactionMonth === selectedMonth
          })}
          monthName={monthName}
          monthKey={selectedMonth}
        />
      )}

      <DiscardChangesModal
        isOpen={showDiscardModal}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  )
}
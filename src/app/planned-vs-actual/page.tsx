"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  useTransactions, 
  usePlannedAmounts, 
  calculateExpenseBreakdown, 
  calculatePlannedVsActual, 
  checkAllOnTrack, 
  formatCurrency, 
  formatDate,
  ExpenseNature, 
  PlannedVsActualItem,
  Transaction,
} from "@/hooks/use-transactions"
import { formatInputValue, parseInputValue } from "@/hooks/use-goals"

const NATURE_OPTIONS: { value: ExpenseNature; label: string; icon: string; color: string }[] = [
  { value: "debt", label: "Dívidas", icon: "💸", color: "text-red-400" },
  { value: "cost_of_living", label: "Custo de Vida", icon: "🏠", color: "text-orange-400" },
  { value: "pleasure", label: "Prazer", icon: "🎉", color: "text-purple-400" },
  { value: "application", label: "Alocações", icon: "📈", color: "text-blue-400" },
]

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function getMonthName(month: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  return months[month - 1]
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

function NatureDetailModal({
  isOpen,
  onClose,
  item,
  transactions,
  monthName,
}: {
  isOpen: boolean
  onClose: () => void
  item: PlannedVsActualItem
  transactions: Transaction[]
  monthName: string
}) {
  const status = getNatureStatus(item.planned, item.actual)
  const difference = item.actual - item.planned

  const natureTransactions = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense" && t.expense_nature === item.nature)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, item.nature])

  if (!isOpen) return null

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-lg">
      <div className="p-4 border-b border-border">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {item.natureLabel} - {monthName}
        </h3>
        <p className={`text-sm ${getNatureStatusColor(status)}`}>
          {getNatureStatusLabel(status)}
        </p>
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
          <div>
            <p className="text-xs text-muted-foreground">Diferença</p>
            <p className={`font-amount text-lg font-medium ${difference >= 0 ? "text-red-400" : "text-green-400"}`}>
              {difference >= 0 ? "+" : ""}{formatCurrency(difference)}
            </p>
          </div>
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
                <div key={t.id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <div>
                    <p className="text-sm text-foreground">{t.description || t.category}</p>
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

      <div className="p-4 border-t border-border">
        <Button 
          className="w-full text-muted-foreground" 
          style={{ backgroundColor: 'color-mix(in oklab, var(--input) 30%, transparent)' }}
          onClick={onClose}
        >
          Fechar
        </Button>
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
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
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
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Planejado</p>
            <p className="font-amount text-foreground">{formatCurrency(item.planned)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Realizado</p>
            <p className="font-amount text-foreground">{formatCurrency(item.actual)}</p>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              status === "acima_do_planejado" ? "bg-red-400" : 
              status === "sem_planejamento_com_gasto" ? "bg-yellow-400" :
              "bg-green-400"
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className={getNatureStatusColor(status)}>
            {getNatureStatusLabel(status)}
          </span>
          <span className="font-amount text-muted-foreground">
            {item.planned > 0 ? formatPercentage(percentage) : "-"}
          </span>
        </div>

        {item.planned > 0 && (
          <p className={`text-xs text-right ${difference >= 0 ? "text-red-400" : "text-green-400"}`}>
            {difference >= 0 ? "+" : ""}{formatCurrency(difference)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function MonthNavigator({ 
  currentDate, 
  onPrevious, 
  onNext 
}: { 
  currentDate: { year: number; month: number }
  onPrevious: () => void
  onNext: () => void
}) {
  const monthName = getMonthName(currentDate.month)
  
  return (
    <div className="flex items-center justify-start gap-4">
      <Button variant="ghost" size="icon" onClick={onPrevious}>
        <ChevronLeftIcon className="h-5 w-5" />
      </Button>
      <div className="text-center min-w-[140px]">
        <p className="font-heading text-lg font-semibold text-foreground">
          {monthName}
        </p>
        <p className="text-sm text-muted-foreground">
          {currentDate.year}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onNext}>
        <ChevronRightIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}

export default function PlannedVsActualPage() {
  const { transactions, isLoaded } = useTransactions()
  const { 
    plannedAmounts, 
    isLoaded: isPlannedLoaded, 
    currentDate,
    updatePlannedAmount,
    goToPreviousMonth,
    goToNextMonth,
  } = usePlannedAmounts()

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

  const expenseBreakdownByMonth = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) {
      return { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }
    }

    const monthKey = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}`
    
    const breakdown = { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }
    
    transactions
      .filter((t) => {
        const transactionMonth = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`
        return transactionMonth === monthKey && t.type === "expense"
      })
      .forEach((t) => {
        const nature = t.expense_nature as ExpenseNature
        if (nature in breakdown) {
          breakdown[nature] += t.amount
        }
      })
    
    return breakdown
  }, [transactions, isLoaded, currentDate])

  const plannedVsActualItems = React.useMemo(() => {
    if (!isPlannedLoaded) return []
    return calculatePlannedVsActual(plannedAmounts, expenseBreakdownByMonth)
  }, [plannedAmounts, expenseBreakdownByMonth, isPlannedLoaded])

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
    if (isPlannedLoaded) {
      const values: Record<ExpenseNature, string> = {
        debt: plannedAmounts.debt ? formatInputValue(plannedAmounts.debt.toString()) : "",
        cost_of_living: plannedAmounts.cost_of_living ? formatInputValue(plannedAmounts.cost_of_living.toString()) : "",
        pleasure: plannedAmounts.pleasure ? formatInputValue(plannedAmounts.pleasure.toString()) : "",
        application: plannedAmounts.application ? formatInputValue(plannedAmounts.application.toString()) : "",
      }
      setInputValues(values)
    }
  }, [isPlannedLoaded, plannedAmounts])

  const handleInputChange = (nature: ExpenseNature, value: string) => {
    const formatted = formatInputValue(value)
    setInputValues((prev) => ({ ...prev, [nature]: formatted }))
  }

  const handleInputBlur = (nature: ExpenseNature, value: string) => {
    const rawValue = parseInputValue(value)
    const numValue = parseFloat(rawValue.replace(",", ".")) || 0
    const sanitized = Math.max(0, numValue)
    updatePlannedAmount(nature, sanitized)
    setInputValues((prev) => ({ ...prev, [nature]: formatInputValue(sanitized.toString()) }))
  }

  if (!isLoaded || !isPlannedLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const monthName = getMonthName(currentDate.month)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Planejado vs Realizado</h1>
        <p className="mt-1 text-muted-foreground">Compare seus gastos planejados com o realizado</p>
      </div>

      <div className="flex items-center gap-4">
        <MonthNavigator 
          currentDate={currentDate}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />
      </div>

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
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className={`font-amount text-xl font-bold ${totalDifference >= 0 ? "text-red-400" : "text-green-400"}`}>
                {totalDifference >= 0 ? "+" : ""}{formatCurrency(totalDifference)}
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

      {/* Planned Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Definir Planejado - {monthName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina quanto você planeja gastar em cada categoria neste mês:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NATURE_OPTIONS.map((nature) => (
              <div key={nature.value} className="space-y-2">
                <Label htmlFor={`planned-${nature.value}`} className="flex items-center gap-2">
                  <span>{nature.icon}</span>
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
        </CardContent>
      </Card>

      {/* Nature Cards */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">Comparação por Categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plannedVsActualItems.map((item) => (
            <NatureCard 
              key={item.nature} 
              item={item}
              onClick={() => setSelectedNature(item)}
            />
          ))}
        </div>
      </div>

      {selectedNature && (
        <NatureDetailModal
          isOpen={true}
          onClose={() => setSelectedNature(null)}
          item={selectedNature}
          transactions={transactions.filter((t) => {
            const transactionMonth = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, "0")}`
            const currentMonth = `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}`
            return transactionMonth === currentMonth
          })}
          monthName={monthName}
        />
      )}
    </div>
  )
}
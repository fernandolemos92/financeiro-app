"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GoalModal } from "@/components/goal-modal"
import { CloseButton } from "@/components/ui/close-button"
import { Modal, ModalLarge } from "@/components/ui/modal"
import { MetricCard } from "@/components/ui/metric-card"
import { Chips } from "@/components/chips"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowUpIcon, ArrowDownIcon, ChartLineUpIcon, InfoIcon, ArrowRight, Money, House, Confetti, TrendUp } from "@phosphor-icons/react"
import { PeriodFilter } from "@/components/period-filter"
import { BalanceHero } from "@/components/balance-hero"
import { useTransactions, calculateFinancialSummary, calculateIncomeBreakdown, calculateExpenseBreakdown, formatCurrency, formatDate, FinancialSummary, IncomeBreakdown, ExpenseBreakdown, categories } from "@/hooks/use-transactions"
import { usePlannedAmounts, calculatePlannedVsActual, PlannedVsActualItem } from "@/hooks/use-planned-amounts"
import { useGoals } from "@/hooks/use-goals"

type Period = "day" | "week" | "month"

const periods: { value: Period; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
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

export default function DashboardPage() {
  const router = useRouter()
  const [period, setPeriod] = React.useState<Period>("month")
  const [selectedNature, setSelectedNature] = React.useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = React.useState<string | null>(null)
  const [contributionAmount, setContributionAmount] = React.useState("")
  const [isGoalModalOpen, setIsGoalModalOpen] = React.useState(false)
  const { transactions, isLoaded, addTransaction } = useTransactions()
  const { plannedAmounts, isLoaded: isPlannedLoaded } = usePlannedAmounts()
  const { goals, updateGoalAmount, addGoal } = useGoals()

  const financialSummary: FinancialSummary = React.useMemo(() => {
    // Calcular reservedInGoals separadamente - metas ativas
    const activeGoals = goals?.filter(g => g.status === "active") || []
    const reservedInGoals = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0)
    
    // Base: se não tem transactions, usar valores padrão
    let base: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      committedExpenses: 0,
      applications: 0,
      availableBalance: 0,
      balanceState: "positive",
      isAllAllocated: false,
      monthlyProvisionedTotal: 0,
    }
    
    if (isLoaded && transactions.length > 0) {
      base = calculateFinancialSummary(transactions)
    }
    
    // disponível livre = disponível bruto - reservado em metas
    const availableFreeBalance = base.availableBalance - reservedInGoals
    
    // Composition com campos derivados do Dashboard
    return {
      ...base,
      reservedInGoals,
      availableFreeBalance,
    }
  }, [transactions, isLoaded, goals])

  const incomeBreakdown: IncomeBreakdown = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) {
      return { fixed: 0, variable: 0, oscillating: 0 }
    }
    return calculateIncomeBreakdown(transactions)
  }, [transactions, isLoaded])

  const expenseBreakdown: ExpenseBreakdown = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) {
      return { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }
    }
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const filtered = transactions.filter(t => {
      const date = new Date(t.date)
      return date >= start && date <= end && t.type === "expense"
    })
    
    const breakdown = { debt: 0, cost_of_living: 0, pleasure: 0, application: 0 }
    filtered.forEach((t) => {
      const nature = t.expense_nature
      if (nature && nature in breakdown) {
        breakdown[nature] += t.amount
      }
    })
    
    return breakdown
  }, [transactions, isLoaded])

  const plannedVsActual: PlannedVsActualItem[] = React.useMemo(() => {
    if (!isPlannedLoaded) return []
    return calculatePlannedVsActual(plannedAmounts, expenseBreakdown)
  }, [plannedAmounts, expenseBreakdown, isPlannedLoaded])

  const getPeriodDates = (p: Period) => {
    const now = new Date()
    let start: Date
    let end: Date
    
    if (p === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (p === "week") {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      start = new Date(now.getFullYear(), now.getMonth(), diff)
      end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    
    return { start, end }
  }

  const transactionsByNature = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) return {}
    
    const { start, end } = getPeriodDates(period)
    
    const periodTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= start && date <= end && t.type === "expense"
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const result: Record<string, { 
      id: string
      category: string
      subcategory?: string
      description: string
      date: string
      amount: number 
    }[]> = {}
    
    const natures = ["debt", "cost_of_living", "pleasure", "application"]
    natures.forEach((nature) => {
      result[nature] = periodTransactions
        .filter((t) => t.expense_nature === nature)
        .map((t) => ({
          id: t.id,
          category: t.category,
          subcategory: t.subcategory,
          description: t.description || t.category,
          date: t.date,
          amount: t.amount,
        }))
    })
    
    return result
  }, [transactions, isLoaded, period])

  const natureDetails = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) return {}
    
    const { start, end } = getPeriodDates(period)
    
    const periodTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= start && date <= end && t.type === "expense"
    })

    const details: Record<string, { subcategories: Record<string, number>; total: number; transactionCount: number }> = {}
    
    const natures: Record<string, string> = {
      debt: "Dívidas",
      cost_of_living: "Custo de Vida",
      pleasure: "Prazer",
      application: "Alocações",
    }

    Object.keys(natures).forEach((nature) => {
      const natureTransactions = periodTransactions.filter((t) => t.expense_nature === nature)
      const subcategories: Record<string, number> = {}
      
      natureTransactions.forEach((t) => {
        const cat = t.category || "Outros"
        subcategories[cat] = (subcategories[cat] || 0) + t.amount
      })

      const sortedSubcats = Object.entries(subcategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      details[nature] = {
        subcategories: Object.fromEntries(sortedSubcats),
        total: natureTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: natureTransactions.length,
      }
    })

    return details
  }, [transactions, isLoaded, period])

  const getInsight = (item: PlannedVsActualItem) => {
    if (!item.planned || item.planned === 0) {
      return "Sem meta definida para este mês"
    }
    if (item.deviationState === "on_track") {
      return "Dentro do orçamento - continue assim!"
    }
    if (item.deviationState === "deviation_warning") {
      const diff = item.actual - item.planned
      return `${formatCurrency(diff)} acima do planejado - monitore`
    }
    const diff = item.actual - item.planned
    return `${formatCurrency(diff)} acima do planejado - revisão necessária`
  }

  const getGoalStatus = (goal: { currentAmount: number; targetAmount: number }) => {
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
    if (progress >= 100) return { label: "Concluída", color: "text-green-400" }
    if (progress >= 75) return { label: "Quase lá", color: "text-green-400" }
    if (progress >= 25) return { label: "No ritmo", color: "text-muted-foreground" }
    return { label: "Começando", color: "text-muted-foreground" }
  }

  const getBalanceMessage = () => {
    if (financialSummary.balanceState === "zero_allocation") {
      return "Tudo allocated!"
    }
    if (financialSummary.balanceState === "overspent") {
      return "Ultrapassado"
    }
    return "Disponível"
  }

  const getBalanceColor = () => {
    if (financialSummary.balanceState === "overspent") {
      return "text-red-400"
    }
    return "text-primary"
  }

  const getFinancialInterpretation = () => {
    if (!isLoaded || transactions.length === 0) {
      return null
    }
    
    const savingsRate = financialSummary.totalIncome > 0 
      ? ((financialSummary.availableBalance / financialSummary.totalIncome) * 100)
      : 0

    if (financialSummary.balanceState === "overspent") {
      return { text: "Despesas superando receitas", color: "text-red-400" }
    }

    if (savingsRate >= 30) {
      return { text: "Taxa de economia: " + savingsRate.toFixed(0) + "%", color: "text-green-400" }
    }

    if (savingsRate >= 10) {
      return { text: "Economia positiva", color: "text-muted-foreground" }
    }

    return null
  }

  const getTemporalContext = () => {
    if (!isLoaded || transactions.length === 0) return null
    if (period !== "month") return null

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const lastMonthStart = new Date(lastMonthYear, lastMonth, 1)
    const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0)

    const lastMonthTransactions = transactions.filter(t => {
      const transDate = new Date(t.date)
      return transDate >= lastMonthStart && transDate <= lastMonthEnd
    })

    if (lastMonthTransactions.length === 0) return null

    const lastMonthIncome = lastMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const lastMonthCommitted = lastMonthTransactions
      .filter(t => t.type === "expense" && t.expense_nature !== "application")
      .reduce((sum, t) => sum + t.amount, 0)

    const currentIncome = financialSummary.totalIncome
    const currentCommitted = financialSummary.committedExpenses

    if (currentIncome === 0 || lastMonthIncome === 0) return null
    if (currentCommitted === 0 && lastMonthCommitted === 0) return null

    const incomeDiff = currentIncome - lastMonthIncome
    const committedDiff = currentCommitted - lastMonthCommitted

    if (incomeDiff !== 0) {
      const direction = incomeDiff > 0 ? "acima" : "abaixo"
      return { text: `Receitas ${direction} do mês anterior`, color: incomeDiff > 0 ? "text-green-400" : "text-red-400" }
    }

    if (committedDiff !== 0) {
      const direction = committedDiff > 0 ? "acima" : "abaixo"
      return { text: `Comprometido ${direction} do mês anterior`, color: committedDiff > 0 ? "text-orange-400" : "text-green-400" }
    }

    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Caixa do mês</h1>
          <p className="mt-1 text-muted-foreground">Orçamento, gasto e margem disponível</p>
        </div>
      </div>

      {/* Period Filter - Reduzido visualmente */}
      <div className="opacity-70">
        <PeriodFilter
          periods={periods}
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        />
      </div>

      {/* Balance Hero - Financial Planning Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BalanceHero summary={financialSummary} plannedVsActual={plannedVsActual} />

        {/* Active Goals Progress - Premium Support Card */}
        <Card className="border-border/60 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Metas em progresso</CardTitle>
              {goals.filter(g => !g.completedAt).length > 0 && (
                <button
                  onClick={() => router.push('/goals')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Ver todas</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            {goals.filter(g => !g.completedAt).length > 0 ? (
              (() => {
                const activeGoals = goals.filter(g => !g.completedAt).slice(0, 5)
                const isSingleGoal = activeGoals.length === 1
                return activeGoals.map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0
                  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
                  return (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedGoal(goal.id)}
                      className="w-full text-left space-y-3 p-3.5 rounded-lg bg-card border border-border hover:border-border/80 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{goal.name}</span>
                          <span className="text-xs font-semibold text-secondary">{progress}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-secondary/80 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {isSingleGoal && (
                        <div className="flex items-center justify-between text-xs">
                          {remaining > 0 && (
                            <span className="text-muted-foreground">
                              Faltam {formatCurrency(remaining)}
                            </span>
                          )}
                          {goal.deadline && (
                            <span className="text-muted-foreground">
                              Prazo: {formatDate(goal.deadline)}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })
              })()
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-4">Nenhuma poupança ativa</p>
                <Button
                  onClick={() => setIsGoalModalOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  Criar poupança
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Nature Cards - Rich Cards with Planned vs Actual */}
      <div className="pt-6 mt-6 border-t border-border/30">
        <h2 className="text-sm font-semibold text-foreground">Onde o orçamento está sendo pressionado</h2>
        <p className="text-xs text-muted-foreground mt-1">Por categoria: planejado vs gasto</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plannedVsActual.map((item) => {
              const totalOfExpenses = financialSummary.totalExpenses
              const percentOfTotal = totalOfExpenses > 0 ? (item.actual / totalOfExpenses) * 100 : 0
              const hasPlanned = item.planned > 0
              const details = natureDetails[item.nature]

              const config: Record<string, { barColor: string; textColor: string; accentColor: string }> = {
                debt: { barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                cost_of_living: { barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                pleasure: { barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                application: { barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
              }
              const configItem = config[item.nature] || config.cost_of_living

              return (
                <button
                  key={item.nature}
                  onClick={() => setSelectedNature(item.nature)}
                  className="p-4 rounded-lg bg-card border border-border text-left hover:border-border/80 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Header: Icon + Label */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="text-foreground/80">
                      {getNatureIcon(item.nature, 20)}
                    </div>
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {item.natureLabel}
                    </span>
                  </div>

                  {/* Valor principal */}
                  <div className="mb-3">
                    <div className={`font-heading text-2xl font-bold ${configItem.textColor}`}>
                      {formatCurrency(item.actual)}
                    </div>
                    {hasPlanned && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.actual > item.planned
                          ? `${formatCurrency(item.actual - item.planned)} acima do planejado`
                          : `${formatCurrency(item.planned - item.actual)} abaixo do planejado`
                        }
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {hasPlanned && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${configItem.barColor}`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Meta: {formatCurrency(item.planned)}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

      {/* Support Section: Temporal Context + Composição de Receitas */}
      <div className="space-y-4 border-t border-border/30 pt-4">
        {/* Temporal Context */}
        {getTemporalContext() && (
          <div className="flex items-center gap-1.5 text-xs">
            {getTemporalContext()?.color === "text-red-400" ? (
              <ArrowDownIcon className="h-3 w-3 text-red-400/70" weight="bold" />
            ) : (
              <ArrowUpIcon className={`h-3 w-3 ${getTemporalContext()?.color}/70`} weight="bold" />
            )}
            <span className={`text-xs ${getTemporalContext()?.color}`}>{getTemporalContext()?.text}</span>
          </div>
        )}

        {/* Income Breakdown - Mini Block with Title */}
        <div className="space-y-2 max-w-md">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Composição das receitas</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Fixa</span>
              <span className="font-semibold text-foreground whitespace-nowrap">{formatCurrency(incomeBreakdown.fixed)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Variável</span>
              <span className="font-semibold text-foreground whitespace-nowrap">{formatCurrency(incomeBreakdown.variable)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Oscilante</span>
              <span className="font-semibold text-foreground whitespace-nowrap">{formatCurrency(incomeBreakdown.oscillating)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nature Detail Modal */}
      {selectedNature && (() => {
        const item = plannedVsActual.find(p => p.nature === selectedNature)
        if (!item) return null
        
        const details = natureDetails[selectedNature]
        const totalOfExpenses = financialSummary.totalExpenses
        const percentOfTotal = totalOfExpenses > 0 ? (item.actual / totalOfExpenses) * 100 : 0
        const natureTransactions = transactionsByNature[selectedNature] || []

        const configModal: Record<string, { textColor: string; accentColor: string; barColor: string }> = {
          debt: { textColor: "text-red-400", accentColor: "bg-red-500/10 text-red-400", barColor: "bg-red-500" },
          cost_of_living: { textColor: "text-orange-400", accentColor: "bg-orange-500/10 text-orange-400", barColor: "bg-orange-500" },
          pleasure: { textColor: "text-purple-400", accentColor: "bg-purple-500/10 text-purple-400", barColor: "bg-purple-500" },
          application: { textColor: "text-blue-400", accentColor: "bg-blue-500/10 text-blue-400", barColor: "bg-blue-500" },
        }
        const configModalItem = configModal[item.nature] || configModal.cost_of_living

        const periodLabel = period === "day" ? "dia" : period === "week" ? "semana" : "mês"

        return (
          <ModalLarge isOpen={true} onClose={() => setSelectedNature(null)}>
            <div>
              <CloseButton onClick={() => setSelectedNature(null)} />

              <div className="flex items-center gap-3 mb-6">
                <div className="text-blue-400">
                  {getNatureIcon(item.nature, 32)}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">{item.natureLabel}</h2>
                  <p className="text-sm text-muted-foreground">Resumo do {periodLabel}</p>
                </div>
              </div>
              
              <div className="space-y-5">
              {/* Topo - Valores principais */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  label={`Total do ${periodLabel}`} 
                  value={formatCurrency(item.actual)} 
                  subValue={`${percentOfTotal.toFixed(1)}% do total gasto`}
                />
{item.planned > 0 ? (
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-lg font-heading font-bold text-foreground">
                      {item.deviationState === "on_track" ? "Dentro do esperado" : item.deviationState === "deviation_warning" ? "Atenção" : "Acima"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${configModalItem.barColor}`} style={{ width: `${Math.min((item.actual / item.planned) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                    </div>
                    {item.deviationState !== "on_track" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.deviationState === "deviation_warning" 
                          ? `${formatCurrency(item.actual - item.planned)} acima do planejado - monitore`
                          : `${formatCurrency(item.actual - item.planned)} acima do planejado - revisão necessária`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-lg font-heading font-bold text-muted-foreground">Sem meta</p>
                    <p className="text-xs text-muted-foreground mt-1">Defina um planejado</p>
                  </div>
                )}
                </div>
                
                {/* Miolo - Composição por categoria (visual principal) */}
                {details && Object.keys(details.subcategories).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Composição por categoria</h3>
                    <div className="space-y-2">
                      {Object.entries(details.subcategories).map(([cat, value]) => {
                        const catInfo = categories.find(c => c.id === cat)
                        const catName = catInfo?.name || cat
                        const catPercent = item.actual > 0 ? (value / item.actual) * 100 : 0
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-foreground">{catName}</span>
                                <span className="text-sm font-medium text-foreground">{formatCurrency(value)}</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${configModalItem.barColor}`} style={{ width: `${catPercent}%` }} />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{catPercent.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Base - Transações do período */}
                {natureTransactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      O que compôs este valor ({natureTransactions.length} transações)
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {natureTransactions.slice(0, 10).map((t) => {
                        const catInfo = categories.find(c => c.id === t.category)
                        const catName = catInfo?.name || t.category
                        const subcatInfo = t.subcategory ? catInfo?.subcategories?.find(s => s.id === t.subcategory) : null
                        const subcatName = subcatInfo?.name || t.subcategory
                        const dateObj = new Date(t.date)
                        const day = dateObj.getDate()
                        const month = dateObj.toLocaleDateString("pt-BR", { month: "short" })
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{catInfo?.name || t.category}</p>
                              {subcatName && (
                                <p className="text-xs text-muted-foreground">
                                  {subcatName.charAt(0).toUpperCase() + subcatName.slice(1)}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {day} {month}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-foreground ml-3">{formatCurrency(t.amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                    {natureTransactions.length > 10 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        + {natureTransactions.length - 10} transações não mostradas
                      </p>
                    )}
                  </div>
                )}
                
                {/* Empty state se não houver transações */}
                {natureTransactions.length === 0 && item.actual > 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma transação encontrada no período.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O valor pode ser de período anterior.
                    </p>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    setSelectedNature(null)
                    router.push(`/transactions?nature=${item.nature}`)
                  }}
                  className="flex items-center justify-center gap-1"
                >
                  <span>Ver todas as transações</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </ModalLarge>
        )
      })()}

      {selectedGoal && (() => {
        const goal = goals.find(g => g.id === selectedGoal)
        if (!goal) return null
        
        const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0
        const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
        const status = getGoalStatus(goal)
        
        return (
          <ModalLarge isOpen={true} onClose={() => setSelectedGoal(null)}>
            <div>
              {/* Header com X */}
              <div className="flex items-start justify-between pb-4 mb-4 border-b border-border">
                <h3 className="text-lg font-heading font-semibold text-foreground">Detalhes da Meta</h3>
                <CloseButton onClick={() => setSelectedGoal(null)} className="" />
              </div>

              {/* Status */}
              <p className={`text-sm font-medium mb-6 ${status.color}`}>{status.label}</p>

              {/* Título da meta */}
              <h2 className="text-2xl font-heading font-bold text-foreground mb-6">{goal.name}</h2>

              <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="text-foreground font-medium">{progress}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-muted-foreground/40 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <MetricCard 
                  label="Valor atual" 
                  value={formatCurrency(goal.currentAmount)} 
                />
                <MetricCard 
                  label="Valor alvo" 
                  value={formatCurrency(goal.targetAmount)} 
                />
              </div>

              {remaining > 0 && goal.deadline && (() => {
                const now = new Date()
                const deadlineDate = new Date(goal.deadline)
                const monthsRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                const monthlyNeeded = monthsRemaining > 0 ? remaining / monthsRemaining : remaining
                return monthsRemaining > 0 && (
                  <MetricCard 
                    label="Contribuição mensal"
                    value={formatCurrency(monthlyNeeded)}
                    subValue={`${monthsRemaining} meses para atingir`}
                  />
                )
              })()}
              
              <MetricCard 
                label="Quanto falta" 
                value={formatCurrency(remaining)}
                subValue={remaining > 0 
                  ? `Faltando ${formatCurrency(remaining)} para atingir sua meta`
                  : "Meta atingida! 🎉"}
              />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Adicionar aporte</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="R$ 0,00"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="h-10"
                    />
                    <Button 
                      size="lg"
                      onClick={() => {
                        const value = parseFloat(contributionAmount.replace(",", "."))
                        if (value > 0 && value <= remaining) {
                          updateGoalAmount(goal.id, value)
                          setContributionAmount("")
                        }
                      }}
                      disabled={remaining <= 0}
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {remaining <= 0 
                      ? "Meta atingida! 🎉"
                      : "Adicione um valor para contribuir com essa meta"}
                  </p>
                </div>
              </div>
            </div>
          </ModalLarge>
        )
      })()}

      {/* Monthly Provisioning Preview */}
      {financialSummary.monthlyProvisionedTotal > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-blue-400">Provisão Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Despesas anuais e ocasionais distribuídas mensalmente:
            </p>
            <p className="font-heading text-3xl font-bold text-blue-400 mt-2">
              {formatCurrency(financialSummary.monthlyProvisionedTotal)}
              <span className="text-sm font-normal text-muted-foreground ml-2">/mês</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onAdd={(data) => {
          addGoal(data)
          setIsGoalModalOpen(false)
        }}
      />
    </div>
  )
}
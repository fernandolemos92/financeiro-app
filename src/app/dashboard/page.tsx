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
import { ArrowUpIcon, ArrowDownIcon, ChartLineUpIcon, InfoIcon } from "@phosphor-icons/react"
import { useTransactions, calculateFinancialSummary, calculateIncomeBreakdown, calculateExpenseBreakdown, formatCurrency, formatDate, FinancialSummary, IncomeBreakdown, ExpenseBreakdown, categories } from "@/hooks/use-transactions"
import { usePlannedAmounts, calculatePlannedVsActual, PlannedVsActualItem } from "@/hooks/use-planned-amounts"
import { useGoals } from "@/hooks/use-goals"

type Period = "day" | "week" | "month"

const periods: { value: Period; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
]

export default function DashboardPage() {
  const router = useRouter()
  const [period, setPeriod] = React.useState<Period>("month")
  const [selectedNature, setSelectedNature] = React.useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = React.useState<string | null>(null)
  const [contributionAmount, setContributionAmount] = React.useState("")
  const [isGoalModalOpen, setIsGoalModalOpen] = React.useState(false)
  const { transactions, isLoaded, addTransaction } = useTransactions()
  const { plannedAmounts, isLoaded: isPlannedLoaded } = usePlannedAmounts()
  const { goals, isLoaded: isGoalsLoaded, updateGoalAmount, addGoal } = useGoals()

  const financialSummary: FinancialSummary = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        committedExpenses: 0,
        applications: 0,
        availableBalance: 0,
        balanceState: "positive",
        isAllAllocated: false,
        monthlyProvisionedTotal: 0,
      }
    }
    return calculateFinancialSummary(transactions)
  }, [transactions, isLoaded])

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
    return calculateExpenseBreakdown(transactions)
  }, [transactions, isLoaded])

  const plannedVsActual: PlannedVsActualItem[] = React.useMemo(() => {
    if (!isPlannedLoaded) return []
    return calculatePlannedVsActual(plannedAmounts, expenseBreakdown)
  }, [plannedAmounts, expenseBreakdown, isPlannedLoaded])

  const recentTransactionsByNature = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) return {}
    
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= start && date <= end && t.type === "expense" && t.planning_status !== "planned"
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const result: Record<string, { id: string; category: string; description: string; date: string; amount: number }[]> = {}
    
    const natures = ["debt", "cost_of_living", "pleasure", "application"]
    natures.forEach((nature) => {
      result[nature] = monthTransactions
        .filter((t) => t.expense_nature === nature)
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          category: t.category,
          description: t.description || t.category,
          date: t.date,
          amount: t.amount,
        }))
    })
    
    return result
  }, [transactions, isLoaded])

  const natureDetails = React.useMemo(() => {
    if (!isLoaded || transactions.length === 0) return {}
    
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= start && date <= end && t.type === "expense" && t.planning_status !== "planned"
    })

    const details: Record<string, { subcategories: Record<string, number>; total: number; transactionCount: number }> = {}
    
    const natures: Record<string, string> = {
      debt: "Dívidas",
      cost_of_living: "Custo de Vida",
      pleasure: "Prazer",
      application: "Alocações",
    }

    Object.keys(natures).forEach((nature) => {
      const natureTransactions = monthTransactions.filter((t) => t.expense_nature === nature)
      const subcategories: Record<string, number> = {}
      
      natureTransactions.forEach((t) => {
        const cat = t.category || "Outros"
        subcategories[cat] = (subcategories[cat] || 0) + t.amount
      })

      const sortedSubcats = Object.entries(subcategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      details[nature] = {
        subcategories: Object.fromEntries(sortedSubcats),
        total: natureTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: natureTransactions.length,
      }
    })

    return details
  }, [transactions, isLoaded])

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
      return transDate >= lastMonthStart && transDate <= lastMonthEnd && t.planning_status !== "planned"
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
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Resumo financeiro do mês</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2" role="tablist" aria-label="Filtrar por período">
        {periods.map((p) => (
          <button
            key={p.value}
            role="tab"
            aria-selected={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Temporal Context */}
      {getTemporalContext() && (
        <div className="flex items-center gap-2 text-sm">
          {getTemporalContext()?.color === "text-red-400" ? (
            <ArrowDownIcon className="h-4 w-4 text-red-400" weight="bold" />
          ) : (
            <ArrowUpIcon className={getTemporalContext()?.color} weight="bold" />
          )}
          <span className={getTemporalContext()?.color}>{getTemporalContext()?.text}</span>
        </div>
      )}

      {/* Income Breakdown - Chips */}
      <Chips
        items={[
          { label: "R$ Fixa:", value: formatCurrency(incomeBreakdown.fixed), color: "green" },
          { label: "R$ Variável:", value: formatCurrency(incomeBreakdown.variable), color: "green" },
          { label: "R$ Oscilante:", value: formatCurrency(incomeBreakdown.oscillating), color: "green" },
        ]}
      />

      {/* Balance Hero - Financial Planning Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card className="bg-gradient-to-br from-card to-surface-overlay border-none">
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-muted-foreground">{getBalanceMessage()}</p>
                <Tooltip>
                  <TooltipTrigger>
                    <span suppressHydrationWarning className="inline-flex items-center justify-center w-4 h-4 cursor-help">
                      <InfoIcon className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground" weight="bold" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={4}>
                    <p>Mostra quanto sobra no período para uso, considerando o comprometido, a provisão e o que já foi separado em alocações.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className={`font-heading text-5xl font-bold mt-2 ${getBalanceColor()}`}>
                {formatCurrency(financialSummary.availableBalance)}
              </p>
              {getFinancialInterpretation() && (
                <p className={`text-sm mt-2 ${getFinancialInterpretation()?.color}`}>
                  {getFinancialInterpretation()?.text}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpIcon className="h-4 w-4 text-green-400" weight="bold" />
                <span>Receitas: {formatCurrency(financialSummary.totalIncome)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDownIcon className="h-4 w-4 text-red-400" weight="bold" />
                <span>Comprometido: {formatCurrency(financialSummary.committedExpenses)}</span>
              </div>
              {financialSummary.applications > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChartLineUpIcon className="h-4 w-4 text-blue-400" weight="bold" />
                  <span>Alocações: {formatCurrency(financialSummary.applications)}</span>
                </div>
              )}
              {financialSummary.monthlyProvisionedTotal > 0 && (
                <div className="text-xs text-muted-foreground pt-1">
                  Provisão mensal: {formatCurrency(financialSummary.monthlyProvisionedTotal)} (anuais/ocasionais)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metas ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isGoalsLoaded && goals.filter(g => !g.completedAt).length > 0 ? (
              (() => {
                const activeGoals = goals.filter(g => !g.completedAt).slice(0, 5)
                const isSingleGoal = activeGoals.length === 1
                return activeGoals.map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0
                  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
                  return (
                    <div
                      key={goal.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedGoal(goal.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedGoal(goal.id)}
                      className="w-full text-left space-y-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{goal.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      {isSingleGoal && (
                        <div className="flex justify-between text-xs pt-1">
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
                    </div>
                  )
                })
              })()
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Nenhuma meta ativa. Crie uma nova meta!</p>
                <Button onClick={() => setIsGoalModalOpen(true)}>
                  Criar meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Nature Cards - Rich Cards with Planned vs Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plannedVsActual.map((item) => {
              const totalOfExpenses = financialSummary.totalExpenses
              const percentOfTotal = totalOfExpenses > 0 ? (item.actual / totalOfExpenses) * 100 : 0
              const hasPlanned = item.planned > 0
              const details = natureDetails[item.nature]
              
              const configs: Record<string, { icon: string; barColor: string; textColor: string; accentColor: string }> = {
                debt: { icon: "💸", barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                cost_of_living: { icon: "🏠", barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                pleasure: { icon: "🎉", barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
                application: { icon: "📈", barColor: "bg-muted-foreground/40", textColor: "text-foreground", accentColor: "text-foreground" },
              }
              const config = configs[item.nature] || configs.cost_of_living
              
              return (
                <button
                  key={item.nature}
                  onClick={() => setSelectedNature(item.nature)}
                  className="p-5 rounded-xl bg-card border border-border text-left hover:border-muted-foreground/50 transition-colors"
                >
                  {/* Label + Icon */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {item.natureLabel}
                      </span>
                    </div>
                    {hasPlanned && (
                      <span className="text-xs text-muted-foreground">
                        {item.percentage.toFixed(0)}% do planejado
                      </span>
                    )}
                  </div>

                  {/* Valor */}
                  <div className={`font-heading text-2xl font-bold ${config.textColor}`}>
                    {formatCurrency(item.actual)}
                  </div>

                  {/* Planned vs Actual Visualization */}
                  <div className={hasPlanned ? "mt-4 space-y-2" : "mt-12"}>
                    {hasPlanned ? (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Planejado</span>
                          <span>{formatCurrency(item.planned)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-muted-foreground/40 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>Realizado</span>
                          <span className={`font-medium ${config.textColor}`}>{formatCurrency(item.actual)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${config.barColor}`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Diferença</span>
                          <span className={item.actual > item.planned ? "text-yellow-400" : "text-green-400"}>
                            {item.actual > item.planned ? "+" : ""}{formatCurrency(item.actual - item.planned)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground">
                          Sem meta definida
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${config.barColor}`}
                            style={{ width: `${percentOfTotal}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Micro Insights */}
                  <div className="mt-3 pt-3 border-t border-border/30">
                    {hasPlanned ? (
                      item.deviationState === "on_track" ? (
                        <div className="text-xs text-green-400 flex items-center gap-1">
                          <span>✓</span> Dentro do orçamento
                        </div>
                      ) : item.deviationState === "deviation_warning" ? (
                        <div className="text-xs text-yellow-400 flex items-center gap-1">
                          <span>⚠</span> {formatCurrency(item.actual - item.planned)} acima - atenção
                        </div>
                      ) : (
                        <div className="text-xs text-red-400 flex items-center gap-1">
                          <span>↑</span> {formatCurrency(item.actual - item.planned)} acima - revisão necessária
                        </div>
                      )
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {percentOfTotal.toFixed(1)}% das despesas do mês
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

      {/* Nature Detail Modal */}
      {selectedNature && (() => {
        const item = plannedVsActual.find(p => p.nature === selectedNature)
        if (!item) return null
        
        const details = natureDetails[selectedNature]
        const totalOfExpenses = financialSummary.totalExpenses
        const percentOfTotal = totalOfExpenses > 0 ? (item.actual / totalOfExpenses) * 100 : 0
        const recentTransactions = recentTransactionsByNature[selectedNature] || []
        
        const configs: Record<string, { icon: string; textColor: string; accentColor: string; barColor: string }> = {
          debt: { icon: "💸", textColor: "text-red-400", accentColor: "bg-red-500/10 text-red-400", barColor: "bg-red-500" },
          cost_of_living: { icon: "🏠", textColor: "text-orange-400", accentColor: "bg-orange-500/10 text-orange-400", barColor: "bg-orange-500" },
          pleasure: { icon: "🎉", textColor: "text-purple-400", accentColor: "bg-purple-500/10 text-purple-400", barColor: "bg-purple-500" },
          application: { icon: "📈", textColor: "text-blue-400", accentColor: "bg-blue-500/10 text-blue-400", barColor: "bg-blue-500" },
        }
        const config = configs[item.nature] || configs.cost_of_living
        
        return (
          <ModalLarge isOpen={true} onClose={() => setSelectedNature(null)}>
            <div>
              <CloseButton onClick={() => setSelectedNature(null)} />
              
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">{item.natureLabel}</h2>
                  <p className="text-sm text-muted-foreground">Resumo do mês</p>
                </div>
              </div>
              
              <div className="space-y-5">
              {/* Topo - Valores principais */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  label="Total do mês" 
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
                        <div className={`h-full rounded-full ${config.barColor}`} style={{ width: `${Math.min((item.actual / item.planned) * 100, 100)}%` }} />
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
                                <div className={`h-full rounded-full ${config.barColor}`} style={{ width: `${catPercent}%` }} />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{catPercent.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Base - Últimas transações */}
                {recentTransactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Últimas transações</h3>
                    <div className="space-y-2">
                      {recentTransactions.slice(0, 4).map((t) => {
                        const catInfo = categories.find(c => c.id === t.category)
                        const catName = catInfo?.name || t.category
                        const dateObj = new Date(t.date)
                        const day = dateObj.getDate()
                        const month = dateObj.toLocaleDateString("pt-BR", { month: "short" })
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{catName}</p>
                              <p className="text-xs text-muted-foreground">{day} {month}</p>
                            </div>
                            <span className="text-sm font-medium text-foreground ml-3">{formatCurrency(t.amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    setSelectedNature(null)
                    router.push(`/planned-vs-actual?nature=${item.nature}`)
                  }}
                >
                  Ver análise completa →
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
          <Modal isOpen={true} onClose={() => setSelectedGoal(null)}>
            <div>
              <CloseButton onClick={() => setSelectedGoal(null)} />
              
              <div className="space-y-6">
              <div>
                <h2 className="text-xl font-heading font-bold text-foreground">{goal.name}</h2>
                <p className={`text-sm font-medium mt-1 ${status.color}`}>{status.label}</p>
                {goal.deadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              
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
          </Modal>
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
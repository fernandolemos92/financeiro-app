"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal, ModalLarge } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useTransactions } from "@/hooks/use-transactions"
import { InsightsHealthCard } from "@/components/insights-health"
import { InsightsRecommendations } from "@/components/insights-recommendations"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatMonthYear, getMonthName } from "@/lib/formatting"
import { XCircle, Info, CheckCircle, ArrowRight } from "phosphor-react"

type HealthStatus = "bom" | "atencao" | "otimo" | "sem-dados"

type RecommendationType = "alerta" | "observacao" | "positiva"

interface Recommendation {
  id: string
  type: RecommendationType
  fact: string
  why: string
  action?: string
  category?: string
  percentage?: number
}

interface CategoryDetail {
  name: string
  label: string
  value: number
  percentage: number
  transactionCount: number
  transactions: Array<{
    id: string
    description: string
    amount: number
    date: string
  }>
}

function getHealthStatus(income: number, expenses: number): HealthStatus {
  if (income === 0) return "sem-dados"
  const ratio = expenses / income
  if (ratio <= 0.7) return "otimo"
  if (ratio <= 0.9) return "bom"
  return "atencao"
}

function getHealthInfo(status: HealthStatus) {
  switch (status) {
    case "otimo":
      return {
        label: "Ótimo",
        color: "text-lime-500",
        badge: "Excelente"
      }
    case "bom":
      return {
        label: "Bom",
        color: "text-primary",
        badge: "Equilibrado"
      }
    case "atencao":
      return {
        label: "Atenção",
        color: "text-orange-500",
        badge: "Crítico"
      }
    case "sem-dados":
      return {
        label: "Sem dados",
        color: "text-muted-foreground",
        badge: "Sem base"
      }
  }
}


const categoryLabels: Record<string, string> = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  lazer: "Lazer",
  moradia: "Moradia",
  saude: "Saúde",
  outros: "Outros",
}

export default function InsightsPage() {
  const { transactions, isLoaded } = useTransactions()
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const [showRecModal, setShowRecModal] = React.useState(false)
  const [selectedRec, setSelectedRec] = React.useState<Recommendation | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryDetail | null>(null)

  const [year, month] = React.useMemo(() => {
    const [y, m] = selectedMonth.split("-")
    return [parseInt(y), parseInt(m)]
  }, [selectedMonth])

  const currentData = React.useMemo(() => {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= startDate && date <= endDate
    })

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    const byCategory: Record<string, number> = {}
    const byCategoryTx: Record<string, typeof monthTransactions> = {}
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
        if (!byCategoryTx[t.category]) byCategoryTx[t.category] = []
        byCategoryTx[t.category].push(t)
      })

    return { 
      income, 
      expenses, 
      byCategory, 
      byCategoryTx, 
      count: monthTransactions.length,
      balance: income - expenses,
    }
  }, [transactions, year, month])

  const previousData = React.useMemo(() => {
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear = year - 1
    }

    const startDate = new Date(prevYear, prevMonth - 1, 1)
    const endDate = new Date(prevYear, prevMonth, 0)
    
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date >= startDate && date <= endDate
    })

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    return { income, expenses, balance: income - expenses }
  }, [transactions, year, month])

  const hasPreviousMonth = previousData.income > 0 || previousData.expenses > 0
  const totalExpenses = currentData.expenses || 1

  const sortedCategories = React.useMemo(() => {
    return Object.entries(currentData.byCategory).sort((a, b) => b[1] - a[1])
  }, [currentData.byCategory])

  const dominantCategory = sortedCategories[0]
  const dominantPercentage = dominantCategory 
    ? Math.round((dominantCategory[1] as number) / totalExpenses * 100)
    : 0

  const healthStatus = React.useMemo((): HealthStatus => {
    if (currentData.income === 0) return "sem-dados"
    return getHealthStatus(currentData.income, currentData.expenses)
  }, [currentData])

  const healthInfo = React.useMemo(() => {
    return getHealthInfo(healthStatus)
  }, [healthStatus])

  const healthFactors = React.useMemo(() => {
    if (currentData.income === 0) return []

    const factors: string[] = []
    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)

    if (balance >= 0) {
      factors.push("Saldo positivo no período")
    } else {
      factors.push("Saldo negativo no período")
    }

    if (ratio <= 0.7) {
      factors.push("Despesas ≤70% das receitas")
    } else if (ratio <= 0.9) {
      factors.push("Despesas entre 70-90% das receitas")
    } else {
      factors.push("Despesas >90% das receitas")
    }

    if (dominantCategory && dominantPercentage > 40) {
      factors.push(`${categoryLabels[dominantCategory[0]] || dominantCategory[0]}: ${dominantPercentage}% dos gastos`)
    }

    if (hasPreviousMonth) {
      const balanceChange = currentData.balance - previousData.balance
      if (balanceChange > 0) {
        factors.push("Saldo melhor que mês anterior")
      } else if (balanceChange < 0) {
        factors.push("Saldo pior que mês anterior")
      }
    }

    return factors.slice(0, 4)
  }, [currentData, hasPreviousMonth, previousData, dominantCategory, dominantPercentage])

  const healthJustification = React.useMemo(() => {
    if (currentData.income === 0) {
      return ""
    }

    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)

    if (balance >= 0 && ratio <= 0.7) {
      return "Equilíbrio financeiro saudável com capacidade de poupança."
    }
    if (balance >= 0) {
      return "Fechou com saldo positivo, mas gastos acima do ideal."
    }
    if (ratio > 0.9) {
      return "Gastos muito altos em relação às receitas."
    }
    return "Bom controle, mas com margem para otimização."
  }, [currentData])

  const recommendations = React.useMemo((): Recommendation[] => {
    if (currentData.income === 0) return []

    const recs: Recommendation[] = []
    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)
    const expenseDiff = currentData.expenses - previousData.expenses

    // Alerta: Saldo negativo
    if (balance < 0) {
      recs.push({
        id: "saldo-negativo",
        type: "alerta",
        fact: `Despesas (${formatCurrency(currentData.expenses)}) excedem receitas (${formatCurrency(currentData.income)}).`,
        why: "Saldo negativo compromete o equilíbrio financeiro nos próximos meses.",
        action: "Revise categorias de maior gasto e identifique cortes possíveis.",
      })
    }

    // Observação: Categoria dominante
    if (dominantCategory && dominantPercentage > 50) {
      recs.push({
        id: "categoria-dominante",
        type: "observacao",
        fact: `${categoryLabels[dominantCategory[0]] || dominantCategory[0]}: ${dominantPercentage}% dos gastos.`,
        why: "Alta concentração em uma categoria aumenta risco e falta de diversidade.",
        action: "Verifique se esse padrão é recorrente ou pontual.",
        category: dominantCategory[0] as string,
        percentage: dominantPercentage,
      })
    } else if (dominantCategory && dominantPercentage > 40) {
      recs.push({
        id: "categoria-alta",
        type: "observacao",
        fact: `${categoryLabels[dominantCategory[0]] || dominantCategory[0]}: ${dominantPercentage}% dos gastos.`,
        why: "Monitorar categorias pesadas ajuda a manter controle.",
        action: "Acompanhe se essa proporção se mantém nos próximos meses.",
        category: dominantCategory[0] as string,
        percentage: dominantPercentage,
      })
    }

    // Alerta: Gastos aumentaram vs mês anterior
    if (hasPreviousMonth && expenseDiff > 0 && currentData.expenses > previousData.expenses) {
      recs.push({
        id: "despesas-aumentaram",
        type: "alerta",
        fact: `Gastos aumentaram ${formatCurrency(expenseDiff)} vs. mês anterior.`,
        why: "Aumento consistente de despesas afeta a saúde financeira.",
        action: "Investigue os maiores aumentos por categoria.",
      })
    }

    // Positivo: Gastos diminuíram
    if (hasPreviousMonth && expenseDiff < 0 && previousData.expenses > 0) {
      recs.push({
        id: "despesas-cairam",
        type: "positiva",
        fact: `Redução de ${formatCurrency(Math.abs(expenseDiff))} em gastos vs. mês anterior.`,
        why: "Reduzir despesas fortalece o saldo e a saúde financeira.",
        action: "Mantenha esse padrão nos próximos períodos.",
      })
    }

    // Positivo: Saldo positivo com bom índice
    if (balance > 0 && ratio <= 0.9 && recs.filter(r => r.type !== "positiva").length < 2) {
      recs.push({
        id: "situacao-positiva",
        type: "positiva",
        fact: "Fechou com saldo positivo e gastos controlados.",
        why: "Saldo positivo permite reserva de emergência e investimentos.",
        action: "Considere destinar uma parte para objetivos de longo prazo.",
      })
    }

    const alerts = recs.filter(r => r.type === "alerta")
    const observacoes = recs.filter(r => r.type === "observacao")
    const positivas = recs.filter(r => r.type === "positiva")

    return [...alerts, ...observacoes, ...positivas].slice(0, 4)
  }, [currentData, previousData, hasPreviousMonth, dominantCategory, dominantPercentage])

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

  const openRecDetail = (rec: Recommendation) => {
    setSelectedRec(rec)
    setShowRecModal(true)
  }

  const openCategoryDetail = (categoryName: string, categoryLabel: string) => {
    const txs = currentData.byCategoryTx[categoryName] || []
    const value = currentData.byCategory[categoryName] || 0
    const percentage = Math.round((value / totalExpenses) * 100)

    setSelectedCategory({
      name: categoryName,
      label: categoryLabel,
      value,
      percentage,
      transactionCount: txs.length,
      transactions: txs
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50)
        .map(t => ({
          id: t.id,
          description: t.description || categoryLabel,
          amount: t.amount,
          date: t.date,
        })),
    })
  }

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Insights</h1>
          <p className="mt-1 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const hasData = currentData.count > 0

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatMonthYear(month - 1, year)}</p>
        </div>
        <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value || selectedMonth)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CAMADA 1: RESUMO EXECUTIVO DO PERÍODO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Receitas</p>
              <p className="font-amount text-2xl font-bold text-foreground">
                {formatCurrency(currentData.income)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Despesas</p>
              <p className="font-amount text-2xl font-bold text-foreground">
                {formatCurrency(currentData.expenses)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Saldo</p>
              <p className="font-amount text-2xl font-bold text-foreground">
                {formatCurrency(currentData.balance)}
              </p>
            </div>
          </div>

          {/* Variação vs mês anterior (se houver base) */}
          {hasPreviousMonth && (
            <div className="mt-6 pt-6 border-t border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-3">vs. Mês anterior</p>
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-semibold text-foreground">
                    {currentData.income - previousData.income >= 0 ? "+" : ""}{formatCurrency(currentData.income - previousData.income)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-semibold text-foreground">
                    {currentData.expenses - previousData.expenses >= 0 ? "+" : ""}{formatCurrency(currentData.expenses - previousData.expenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold text-foreground">
                    {currentData.balance - previousData.balance >= 0 ? "+" : ""}{formatCurrency(currentData.balance - previousData.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CAMADA 2: DIAGNÓSTICO FINANCEIRO + CAMADA 3: RECOMENDAÇÕES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diagnóstico do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightsHealthCard
              status={healthStatus}
              info={healthInfo}
              justification={healthJustification}
              factors={healthFactors}
              hasData={hasData}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recomendações</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightsRecommendations
              recommendations={recommendations}
              hasData={hasData}
              onSelect={(rec) => {
                setSelectedRec(rec)
                setShowRecModal(true)
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CAMADA 4: EXPLICAÇÃO DOS GASTOS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {hasData && sortedCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedCategories.map(([category, amount]) => {
              const percentage = Math.round((amount as number) / totalExpenses * 100)
              const label = categoryLabels[category] || category
              return (
                <div
                  key={category}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCategoryDetail(category, label)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCategoryDetail(category, label)}
                  className="group space-y-2 cursor-pointer hover:bg-muted/40 p-2.5 -m-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(amount as number)}</span>
                      <span className="text-xs font-medium text-muted-foreground min-w-max">{percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/25 group-hover:bg-foreground/35 rounded-full transition-colors"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

<Modal isOpen={showRecModal} onClose={() => setShowRecModal(false)}>
        {selectedRec && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {selectedRec.type === "alerta" && <XCircle size={20} className="text-red-500" weight="bold" />}
                {selectedRec.type === "observacao" && <Info size={20} className="text-orange-500" weight="bold" />}
                {selectedRec.type === "positiva" && <CheckCircle size={20} className="text-lime-500" weight="bold" />}
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {selectedRec.type === "alerta"
                    ? "Alerta"
                    : selectedRec.type === "observacao"
                      ? "Observação"
                      : "Positivo"}
                </span>
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {selectedRec.fact}
              </h2>
            </div>

            <div className="pt-4 border-t border-border/30">
              <h3 className="text-sm font-medium text-foreground mb-2">Por que importa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedRec.why}
              </p>
            </div>

            {selectedRec.action && (
              <div className="pt-4 border-t border-border/30">
                <h3 className="text-sm font-medium text-foreground mb-2">Sugestão de ação</h3>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <ArrowRight size={16} className="flex-shrink-0" />
                  <span>{selectedRec.action}</span>
                </p>
              </div>
            )}

            {selectedRec.category && (
              <div className="pt-4 border-t border-border/30">
                <h3 className="text-sm font-medium text-foreground mb-2">Categoria</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{categoryLabels[selectedRec.category] || selectedRec.category}</span>
                  {selectedRec.percentage && ` (${selectedRec.percentage}% dos gastos)`}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                {formatMonthYear(month - 1, year)}
              </p>
            </div>

            <Button onClick={() => setShowRecModal(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      <ModalLarge isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)}>
        {selectedCategory && (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                {selectedCategory.label}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total</p>
                  <p className="font-amount text-lg font-bold text-foreground">
                    {formatCurrency(selectedCategory.value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">% do mês</p>
                  <p className="font-amount text-lg font-bold text-foreground">
                    {selectedCategory.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Movimentações</p>
                  <p className="font-amount text-lg font-bold text-foreground">
                    {selectedCategory.transactionCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Transações */}
            <div className="pt-4 border-t border-border/30">
              <h3 className="text-sm font-medium text-foreground mb-4">Transações</h3>
              {selectedCategory.transactions.length > 0 ? (
                <div className="space-y-0 max-h-96 overflow-y-auto pr-2">
                  {selectedCategory.transactions.map((tx, idx) => (
                    <div key={tx.id} className={`flex items-center justify-between py-3 ${
                      idx !== selectedCategory.transactions.length - 1 ? "border-b border-border/20" : ""
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <p className="font-amount font-semibold text-foreground ml-4">
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Sem transações
                  </p>
                </div>
              )}
            </div>

            {selectedCategory.transactions.length > 0 && (
              <div className="pt-4 border-t border-border/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Maior transação</p>
                    <p className="font-amount font-semibold text-foreground">
                      {formatCurrency(Math.max(...selectedCategory.transactions.map(t => t.amount)))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
                    <p className="font-amount font-semibold text-foreground">
                      {formatCurrency(selectedCategory.value / selectedCategory.transactions.length)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={() => setSelectedCategory(null)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </ModalLarge>
    </div>
  )
}
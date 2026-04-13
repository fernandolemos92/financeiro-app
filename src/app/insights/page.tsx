"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal, ModalLarge } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useTransactions } from "@/hooks/use-transactions"
import { Chips } from "@/components/chips"
import { InsightsHealthCard } from "@/components/insights-health"
import { InsightsRecommendations } from "@/components/insights-recommendations"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatMonthYear, getMonthName } from "@/lib/formatting"

type HealthStatus = "bom" | "atencao" | "otimo"

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
  transactions: Array<{
    id: string
    description: string
    amount: number
    date: string
  }>
}

function getHealthStatus(income: number, expenses: number): HealthStatus {
  if (income === 0) return "bom"
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
        icon: "⭐",
        color: "text-green-400",
      }
    case "bom":
      return {
        label: "Bom",
        icon: "👍",
        color: "text-primary",
      }
    case "atencao":
      return {
        label: "Atenção",
        icon: "💜",
        color: "text-secondary",
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

  const [showHealthModal, setShowHealthModal] = React.useState(false)
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

  const healthStatus = React.useMemo(() => {
    if (currentData.income === 0) return "bom"
    return getHealthStatus(currentData.income, currentData.expenses)
  }, [currentData])

  const healthInfo = getHealthInfo(healthStatus)

  const healthFactors = React.useMemo(() => {
    const factors: string[] = []
    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)
    
    if (balance >= 0) {
      factors.push("Saldo positivo no mês")
    } else {
      factors.push("Saldo negativo no mês")
    }
    
    if (ratio <= 0.7) {
      factors.push("Despesas abaixo de 70% das receitas")
    } else if (ratio <= 0.9) {
      factors.push("Despesas entre 70% e 90% das receitas")
    } else {
      factors.push("Despesas acima de 90% das receitas")
    }
    
    if (dominantCategory && dominantPercentage > 40) {
      factors.push(`${categoryLabels[dominantCategory[0]] || dominantCategory[0]} representa ${dominantPercentage}% das despesas`)
    }
    
    if (hasPreviousMonth) {
      const balanceChange = currentData.balance - previousData.balance
      if (balanceChange > 0) {
        factors.push("Saldo melhor que mês anterior")
      } else if (balanceChange < 0) {
        factors.push("Saldo pior que mês anterior")
      }
    }
    
    return factors.slice(0, 3)
  }, [currentData, hasPreviousMonth, previousData, dominantCategory, dominantPercentage])

  const healthJustification = React.useMemo(() => {
    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)
    
    if (balance >= 0 && ratio <= 0.7) {
      return "Você está com contas equilibradas e consegue poupar neste mês."
    }
    if (balance >= 0) {
      return "Você fechou o mês com saldo positivo, mas os gastos estão altos."
    }
    if (ratio > 0.9) {
      return "Suas despesas estão muito altas em relação às receitas."
    }
    return "Você está no caminho certo, mas pode melhorar o equilíbrio."
  }, [currentData])

  const recommendations = React.useMemo((): Recommendation[] => {
    const recs: Recommendation[] = []
    const balance = currentData.balance
    const ratio = currentData.expenses / (currentData.income || 1)
    const incomeDiff = currentData.income - previousData.income
    const expenseDiff = currentData.expenses - previousData.expenses
    
    if (balance < 0) {
      recs.push({
        id: "saldo-negativo",
        type: "alerta",
        fact: `Suas despesas (${formatCurrency(currentData.expenses)}) excederam as receitas (${formatCurrency(currentData.income)}) neste mês.`,
        why: "Quando as despesas supera as receitas, o saldo fica negativo e compromete o mês seguinte.",
        action: "Revise os gastos não essenciais do mês.",
      })
    }
    
    if (dominantCategory && dominantPercentage > 50) {
      recs.push({
        id: "categoria-dominante",
        type: "observacao",
        fact: `${categoryLabels[dominantCategory[0]] || dominantCategory[0]} concentrou ${dominantPercentage}% das despesas do mês.`,
        why: "Concentração alta em uma única categoria aumenta a dependência e o risco.",
        action: "Avalie se esse peso é recorrente ou pontual.",
        category: dominantCategory[0] as string,
        percentage: dominantPercentage,
      })
    } else if (dominantCategory && dominantPercentage > 40) {
      recs.push({
        id: "categoria-alta",
        type: "observacao",
        fact: `${categoryLabels[dominantCategory[0]] || dominantCategory[0]} representa ${dominantPercentage}% das despesas.`,
        why: "Uma categoria com peso alto pode indicar padrão de gasto a ser monitorado.",
        category: dominantCategory[0] as string,
        percentage: dominantPercentage,
      })
    }
    
    if (hasPreviousMonth) {
      if (expenseDiff > 0 && currentData.expenses > previousData.expenses) {
        recs.push({
          id: "despesas-aumentaram",
          type: "alerta",
          fact: `Seus gastos subiram ${formatCurrency(expenseDiff)} em relação ao mês anterior.`,
          why: "Aumento de despesas sem aumento de receitas pressiona o orçamento.",
          action: "Monitore os próximos meses para evitar escalada.",
        })
      }
      
      if (expenseDiff < 0 && previousData.expenses > 0) {
        recs.push({
          id: "despesas-cairam",
          type: "positiva",
          fact: `Você gastou ${formatCurrency(Math.abs(expenseDiff))} a menos que no mês passado.`,
          why: "Reduzir despesas mantendo receitas fortalece o saldo.",
          action: "Continue monitorsando para manter o padrão.",
        })
      }
    }
    
    if (balance > 0 && ratio <= 0.9 && recs.filter(r => r.type !== "positiva").length < 2) {
      recs.push({
        id: "situacaopositiva",
        type: "positiva",
        fact: "Você fechou o mês com saldo positivo.",
        why: "Saldo positivo permite reserva de emergência e investimentos.",
        action: "Considere guardar uma parte para objetivos futuros.",
      })
    }
    
    const alerts = recs.filter(r => r.type === "alerta")
    const observacoes = recs.filter(r => r.type === "observacao")
    const positivas = recs.filter(r => r.type === "positiva")
    
    return [...alerts, ...observacoes, ...positivas].slice(0, 3)
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
      transactions: txs
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
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
      <div className="space-y-8">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Insights</h1>
          <p className="mt-1 text-muted-foreground">Análise financeira de {formatMonthYear(month - 1, year)}</p>
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

      {hasData && hasPreviousMonth && (
        <Chips
          items={[
            currentData.income - previousData.income !== 0 ? {
              label: "Receitas:",
              value: `${currentData.income - previousData.income > 0 ? "↑" : "↓"} ${formatCurrency(Math.abs(currentData.income - previousData.income))}`,
              color: currentData.income - previousData.income > 0 ? "green" : "red",
            } : null,
            currentData.expenses - previousData.expenses !== 0 ? {
              label: "Despesas:",
              value: `${currentData.expenses - previousData.expenses > 0 ? "↑" : "↓"} ${formatCurrency(Math.abs(currentData.expenses - previousData.expenses))}`,
              color: currentData.expenses - previousData.expenses < 0 ? "primary" : "secondary",
            } : null,
          ].filter(Boolean) as { label: string; value: string; color: "green" | "red" | "primary" | "secondary" | "neutral" }[]}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Saúde Financeira</CardTitle>
            <span className="text-xs text-muted-foreground">ver detalhes</span>
          </CardHeader>
          <CardContent>
            <InsightsHealthCard
              status={healthStatus}
              info={healthInfo}
              justification={healthJustification}
              factors={healthFactors}
              onOpen={() => setShowHealthModal(true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recomendações</CardTitle>
            <span className="text-xs text-muted-foreground">{recommendations.length} itens</span>
          </CardHeader>
          <CardContent>
            <InsightsRecommendations
              recommendations={recommendations}
              hasData={hasData}
              onSelect={openRecDetail}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getMonthName(month)} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasData ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Receitas</span>
                  <span className="font-amount text-green-400">
                    {formatCurrency(currentData.income)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Despesas</span>
                  <span className={`font-amount ${healthStatus === "atencao" ? "text-secondary" : "text-red-400"}`}>
                    {formatCurrency(currentData.expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <span className="text-foreground font-medium">Saldo</span>
                  <span className={`font-amount font-semibold ${currentData.balance >= 0 ? "text-primary" : "text-secondary"}`}>
                    {formatCurrency(currentData.balance)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma transação neste período
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mês anterior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasPreviousMonth ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Receitas</span>
                  <span className="font-amount text-muted-foreground">
                    {formatCurrency(previousData.income)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Despesas</span>
                  <span className="font-amount text-muted-foreground">
                    {formatCurrency(previousData.expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <span className="text-foreground font-medium">Saldo</span>
                  <span className={`font-amount ${previousData.balance >= 0 ? "text-primary" : "text-secondary"}`}>
                    {formatCurrency(previousData.balance)}
                  </span>
                </div>
                {hasData && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    {currentData.balance - previousData.balance !== 0 && (
                      <p className={`text-xs ${
                        currentData.balance - previousData.balance > 0 
                          ? "text-green-400" 
                          : "text-secondary"
                      }`}>
                        {currentData.balance - previousData.balance > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(currentData.balance - previousData.balance))} em relação ao mês atual
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">
                  Sem base comparativa do mês anterior
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Os insights desta tela estão baseados apenas no mês selecionado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(([category, amount]) => {
              const percentage = Math.round((amount as number) / totalExpenses * 100)
              const label = categoryLabels[category] || category
              return (
                <div
                  key={category}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCategoryDetail(category, label)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCategoryDetail(category, label)}
                  className="space-y-2 cursor-pointer hover:bg-muted/30 p-2 -m-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(amount as number)} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma despesa neste período
            </p>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showHealthModal} onClose={() => setShowHealthModal(false)}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
              {healthInfo.icon}
            </div>
            <div>
              <h2 className={`font-heading text-xl font-semibold ${healthInfo.color}`}>
                Saúde {healthInfo.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                Análise de {formatMonthYear(month - 1, year)}
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Justificativa</h3>
            <p className="text-muted-foreground">{healthJustification}</p>
          </div>
          
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Sinais considerados</h3>
            <ul className="space-y-2">
              {healthFactors.map((factor, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Dados do mês</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="font-amount text-green-400">{formatCurrency(currentData.income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="font-amount text-secondary">{formatCurrency(currentData.expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`font-amount ${currentData.balance >= 0 ? "text-primary" : "text-secondary"}`}>
                  {formatCurrency(currentData.balance)}
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={() => setShowHealthModal(false)} className="w-full">
            Fechar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showRecModal} onClose={() => setShowRecModal(false)}>
        {selectedRec && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                selectedRec.type === "alerta" 
                  ? "bg-secondary/20" 
                  : selectedRec.type === "observacao" 
                    ? "bg-yellow-400/20" 
                    : "bg-green-400/20"
              }`}>
                <span className={`text-lg ${
                  selectedRec.type === "alerta" 
                    ? "text-secondary" 
                    : selectedRec.type === "observacao" 
                      ? "text-yellow-400" 
                      : "text-green-400"
                }`}>
                  {selectedRec.type === "alerta" ? "!" : selectedRec.type === "observacao" ? "●" : "✓"}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {selectedRec.type}
                </p>
                <p className="font-medium text-foreground">{selectedRec.fact}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-2">Por que isso importa</h3>
              <p className="text-muted-foreground text-sm">{selectedRec.why}</p>
            </div>
            
            {selectedRec.action && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium mb-2">Orientação</h3>
                <p className="text-muted-foreground text-sm">{selectedRec.action}</p>
              </div>
            )}
            
            {hasPreviousMonth && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium mb-2">Comparação</h3>
                <p className="text-muted-foreground text-xs">
                  Insight baseado em {formatMonthYear(month - 1, year)}
                  {hasPreviousMonth ? " com comparação do mês anterior" : " sem mês anterior"}
                </p>
              </div>
            )}
            
            <Button onClick={() => setShowRecModal(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      <ModalLarge isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)}>
        {selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  {selectedCategory.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory.percentage}% das despesas do mês
                </p>
              </div>
              <div className="text-right">
                <p className="font-amount text-xl text-foreground">
                  {formatCurrency(selectedCategory.value)}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-3">Transações ({selectedCategory.transactions.length})</h3>
              {selectedCategory.transactions.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedCategory.transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <p className="font-amount text-foreground">
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhuma transação nesta categoria
                </p>
              )}
            </div>
            
            <Button onClick={() => setSelectedCategory(null)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </ModalLarge>
    </div>
  )
}
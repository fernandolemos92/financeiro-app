"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTransactions } from "@/hooks/use-transactions"
import { Chips } from "@/components/chips"

type HealthStatus = "bom" | "atencao" | "otimo"

function getHealthStatus(income: number, expenses: number): HealthStatus {
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
        message: "Você está excelência! Continue assim!",
      }
    case "bom":
      return {
        label: "Bom",
        icon: "👍",
        message: "Você está no caminho certo! Continue mantendo o controle.",
      }
    case "atencao":
      return {
        label: "Atenção",
        icon: "💜",
        message: "Fique de volta! Você consegue equilibrar suas finanças.",
      }
  }
}

function getMonthName(month: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  return months[month]
}

function getMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`
}

export default function InsightsPage() {
  const { transactions, isLoaded } = useTransactions()
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

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
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
      })

    return { income, expenses, byCategory, count: monthTransactions.length }
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

    return { income, expenses }
  }, [transactions, year, month])

  const healthStatus = React.useMemo(() => {
    if (currentData.income === 0) return "bom"
    return getHealthStatus(currentData.income, currentData.expenses)
  }, [currentData])

  const healthInfo = getHealthInfo(healthStatus)

  const categoryLabels: Record<string, string> = {
    alimentacao: "Alimentação",
    transporte: "Transporte",
    lazer: "Lazer",
    moradia: "Moradia",
    saude: "Saúde",
    outros: "Outros",
  }

  const sortedCategories = React.useMemo(() => {
    return Object.entries(currentData.byCategory)
      .sort((a, b) => b[1] - a[1])
  }, [currentData.byCategory])

  const totalExpenses = currentData.expenses || 1

  const incomeDiff = currentData.income - previousData.income
  const expenseDiff = currentData.expenses - previousData.expenses

  const availableMonths = React.useMemo(() => {
    const months: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: getMonthYear(d.getMonth(), d.getFullYear()),
      })
    }
    return months
  }, [])

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
          <p className="mt-1 text-muted-foreground">Análise e recomendações financeiras</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm"
        >
          {availableMonths.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Comparison Summary Chips */}
      {hasData && (incomeDiff !== 0 || expenseDiff !== 0) && (
        <Chips
          items={[
            incomeDiff !== 0 ? {
              label: "Receitas:",
              value: `${incomeDiff > 0 ? "↑" : "↓"} R$ ${Math.abs(incomeDiff).toFixed(2).replace(".", ",")}`,
              color: incomeDiff > 0 ? "green" : "red",
            } : null,
            expenseDiff !== 0 ? {
              label: "Despesas:",
              value: `${expenseDiff > 0 ? "↑" : "↓"} R$ ${Math.abs(expenseDiff).toFixed(2).replace(".", ",")}`,
              color: expenseDiff < 0 ? "primary" : "secondary",
            } : null,
          ].filter(Boolean) as { label: string; value: string; color: "green" | "red" | "primary" | "secondary" | "neutral" }[]}
        />
      )}

      {/* Health Indicator + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Indicator */}
        <Card className="bg-gradient-to-br from-secondary/10 to-transparent border-secondary/20">
          <CardHeader>
            <CardTitle className="text-lg">Saúde Financeira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
                {healthInfo.icon}
              </div>
              <div>
                <p className="font-heading text-2xl font-semibold text-foreground">
                  {healthInfo.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {healthInfo.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Recomendações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasData ? (
              <>
                {incomeDiff > 0 && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-foreground">
                        Suas receitas aumentaram R$ {incomeDiff.toFixed(2).replace(".", ",")}!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Continue assim!</p>
                    </div>
                  </div>
                )}

                {expenseDiff < 0 && previousData.expenses > 0 && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-foreground">
                        Você gastou R$ {Math.abs(expenseDiff).toFixed(2).replace(".", ",")} a menos que no mês passado!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Parabéns!</p>
                    </div>
                  </div>
                )}

                {healthStatus === "atencao" && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary text-sm">!</span>
                    </div>
                    <div>
                      <p className="text-foreground">
                        Suas despesas estão altas este mês
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Que tal revisar alguns gastos?
                      </p>
                    </div>
                  </div>
                )}

                {sortedCategories[0] && (sortedCategories[0][1] as number) / totalExpenses > 0.4 && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary text-sm">!</span>
                    </div>
                    <div>
                      <p className="text-foreground">
                        Uma categoria está muito alta: {categoryLabels[sortedCategories[0][0]] || sortedCategories[0][0]}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Considere equilibrar seus gastos
                      </p>
                    </div>
                  </div>
                )}

                {healthStatus === "otimo" && (
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-sm">⭐</span>
                    </div>
                    <div>
                      <p className="text-foreground">
                        Você está em excelente situação financeira!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Continue equilibrando receitas e despesas
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Adicione transações para receber recomendações personalizadas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getMonthName(month - 1)} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasData ? (
              <>
                <div className="flex justify-between">
                  <span className="text-foreground">Receitas</span>
                  <span className="font-amount text-green-400">
                    R$ {currentData.income.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Despesas</span>
                  <span className={`font-amount ${healthStatus === "atencao" ? "text-secondary" : "text-red-400"}`}>
                    R$ {currentData.expenses.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-foreground font-medium">Saldo</span>
                  <span className={`font-amount font-semibold ${currentData.income - currentData.expenses >= 0 ? "text-primary" : "text-secondary"}`}>
                    R$ {(currentData.income - currentData.expenses).toFixed(2).replace(".", ",")}
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
          <CardContent className="space-y-2">
            {previousData.income > 0 || previousData.expenses > 0 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-foreground">Receitas</span>
                  <span className="font-amount text-muted-foreground">
                    R$ {previousData.income.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Despesas</span>
                  <span className="font-amount text-muted-foreground">
                    R$ {previousData.expenses.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-foreground font-medium">Saldo</span>
                  <span className="font-amount text-muted-foreground">
                    R$ {(previousData.income - previousData.expenses).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Sem dados do mês anterior
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spending Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(([category, amount]) => {
              const percentage = Math.round((amount / totalExpenses) * 100)
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {categoryLabels[category] || category}
                    </span>
                    <span className="text-muted-foreground">
                      R$ {amount.toFixed(2).replace(".", ",")} ({percentage}%)
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
    </div>
  )
}
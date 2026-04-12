"use client"

import * as React from "react"
import { ArrowUpIcon, ArrowDownIcon } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/transactions/helpers"
import { FinancialSummary } from "@/lib/transactions/types"

interface IncomeBreakdown {
  fixed: number
  variable: number
  oscillating: number
}

interface ExpenseBreakdown {
  debt: number
  cost_of_living: number
  pleasure: number
  application: number
}

interface DashboardMetricsProps {
  summary: FinancialSummary
  incomeBreakdown: IncomeBreakdown
  expenseBreakdown: ExpenseBreakdown
}

export function DashboardMetrics({ summary, incomeBreakdown, expenseBreakdown }: DashboardMetricsProps) {
  const isPositive = summary.availableBalance >= 0
  const isOverspent = summary.balanceState === "overspent"

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-muted space-y-1">
        <p className="text-xs text-muted-foreground">Receitas</p>
        <p className="text-2xl font-heading font-bold text-green-400">
          {formatCurrency(summary.totalIncome)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-muted space-y-1">
        <p className="text-xs text-muted-foreground">Despesas</p>
        <p className={`text-2xl font-heading font-bold ${isOverspent ? "text-secondary" : "text-foreground"}`}>
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-muted space-y-1">
        <p className="text-xs text-muted-foreground">Saldo</p>
        <p className={`text-2xl font-heading font-bold ${isPositive ? "text-green-400" : "text-secondary"}`}>
          {formatCurrency(summary.availableBalance)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-muted space-y-1">
        <p className="text-xs text-muted-foreground">Aplicações</p>
        <p className="text-2xl font-heading font-bold text-foreground">
          {formatCurrency(summary.applications)}
        </p>
      </div>
    </div>
  )
}

export function DashboardBreakdown({
  incomeBreakdown,
  expenseBreakdown,
}: {
  incomeBreakdown: IncomeBreakdown
  expenseBreakdown: ExpenseBreakdown
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-muted space-y-2">
        <p className="text-xs text-muted-foreground">Receitas</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fixa</span>
            <span className="text-green-400">{formatCurrency(incomeBreakdown.fixed)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Variável</span>
            <span className="text-green-400">{formatCurrency(incomeBreakdown.variable)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Oscilante</span>
            <span className="text-green-400">{formatCurrency(incomeBreakdown.oscillating)}</span>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-muted space-y-2">
        <p className="text-xs text-muted-foreground">Despesas</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Custo de Vida</span>
            <span className="text-foreground">{formatCurrency(expenseBreakdown.cost_of_living)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dívidas</span>
            <span className="text-foreground">{formatCurrency(expenseBreakdown.debt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prazer</span>
            <span className="text-foreground">{formatCurrency(expenseBreakdown.pleasure)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aplicação</span>
            <span className="text-foreground">{formatCurrency(expenseBreakdown.application)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
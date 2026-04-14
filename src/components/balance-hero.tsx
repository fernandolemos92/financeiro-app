"use client"

import * as React from "react"
import { ArrowUpIcon, ArrowDownIcon, InfoIcon, PiggyBankIcon } from "@phosphor-icons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/transactions/helpers"
import { FinancialSummary } from "@/lib/transactions/types"

interface BalanceHeroProps {
  summary: FinancialSummary
}

function getBalanceMessage(summary: FinancialSummary): string {
  if (summary.availableBalance < 0) {
    return "Caixa do mês"
  }
  if (summary.balanceState === "zero_allocation") {
    return "Caixa do mês"
  }
  return "Caixa do mês"
}

function getBalanceColor(summary: FinancialSummary): string {
  if (summary.availableBalance < 0) return "text-secondary"
  if (summary.balanceState === "zero_allocation") return "text-yellow-400"
  return "text-foreground"
}

function getFinancialInterpretation(summary: FinancialSummary): { text: string; color: string } | null {
  if (summary.balanceState === "overspent") {
    return { text: "Você está compromissado além das receitas", color: "text-secondary" }
  }
  if (summary.balanceState === "zero_allocation") {
    return { text: "Todo o saldo foi alocado em metas", color: "text-yellow-400" }
  }
  if (summary.availableBalance > summary.totalIncome * 0.2) {
    return { text: "Excelente folga para emergências e investimentos", color: "text-green-400" }
  }
  if (summary.availableBalance > 0) {
    return { text: "Reserva moderada - considere aumentá-la", color: "text-primary" }
  }
  return null
}

export function BalanceHero({ summary }: BalanceHeroProps) {
  // O valor principal é o caixa livre (Disponível - Reservado em metas)
  // Se não tem reservedInGoals, usa availableBalance padrão
  const displayBalance = summary.availableFreeBalance !== undefined 
    ? summary.availableFreeBalance 
    : summary.availableBalance
    
  const displayColor = displayBalance < 0 ? "text-secondary" : "text-foreground"

  return (
    <div className="p-6 rounded-xl bg-card border border-border space-y-4">
      <div className="relative">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            {getBalanceMessage(summary)}
          </p>
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
        <p className={`font-heading text-5xl font-bold mt-2 ${displayColor}`}>
          {formatCurrency(displayBalance)}
        </p>
        {summary.reservedInGoals && summary.reservedInGoals > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            (Caixa bruto: {formatCurrency(summary.availableBalance)})
          </p>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowUpIcon className="h-4 w-4 text-green-400" weight="bold" />
          <span>Receitas: {formatCurrency(summary.totalIncome)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowDownIcon className="h-4 w-4 text-red-400" weight="bold" />
          <span>Despesas do mês: {formatCurrency(summary.committedExpenses + summary.applications)}</span>
        </div>
        {summary.reservedInGoals && summary.reservedInGoals > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <PiggyBankIcon className="h-4 w-4 text-secondary" weight="bold" />
            <span className="text-muted-foreground">Aporte das metas: {formatCurrency(summary.reservedInGoals)}</span>
          </div>
        )}
        {summary.monthlyProvisionedTotal > 0 && (
          <div className="text-xs text-muted-foreground pt-1">
            Provisão mensal: {formatCurrency(summary.monthlyProvisionedTotal)} (anuais/ocasionais)
          </div>
        )}
      </div>
    </div>
  )
}
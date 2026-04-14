"use client"

import * as React from "react"
import { ArrowUpIcon, ArrowDownIcon, InfoIcon, PiggyBankIcon, CreditCardIcon } from "@phosphor-icons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/transactions/helpers"
import { FinancialSummary, PlannedVsActualItem } from "@/lib/transactions/types"

interface BalanceHeroProps {
  summary: FinancialSummary
  plannedVsActual?: PlannedVsActualItem[]
}

export function BalanceHero({ summary, plannedVsActual }: BalanceHeroProps) {
  // Calcular posição orçamentária consolidada
  const totalPlanned = plannedVsActual?.reduce((sum, item) => sum + (item.planned || 0), 0) || 0
  const totalActual = plannedVsActual?.reduce((sum, item) => sum + item.actual, 0) || 0
  const budgetMargin = totalPlanned - totalActual
  const budgetPercentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  const marginColor = budgetMargin >= 0 ? "text-green-400" : "text-red-400"
  const marginLabel = budgetMargin >= 0 ? "Margem disponível" : "Acima do orçamento"
  const marginAbsValue = Math.abs(budgetMargin)

  return (
    <div className="p-7 rounded-lg bg-card border border-border space-y-6">
      {totalPlanned > 0 && (
        <>
          {/* NÍVEL 1: Contexto - Título com informação */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">Posição do orçamento</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center justify-center h-4 w-4 cursor-help transition-colors hover:text-foreground">
                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground/50" weight="bold" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                <p className="text-xs">Mostra a diferença entre o orçamento do mês e o gasto já realizado. Quando o gasto passa do planejado, o valor aparece como acima do orçamento.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* NÍVEL 2: Estado Principal - em coluna (label em linha 1, número em linha 2) */}
          <div className="space-y-3 pb-4">
            <p className={`text-xs font-medium ${marginColor}`}>{marginLabel}</p>
            <p className={`font-heading text-5xl font-bold tracking-tight ${marginColor}`}>
              {formatCurrency(marginAbsValue)}
            </p>
          </div>

          {/* Separador visual */}
          <div className="border-t border-border/40" />

          {/* NÍVEL 3: Bloco Secundário - Orçamento e Gasto */}
          <div className="space-y-2.5 pt-4 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-muted-foreground">Orçamento do mês</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalPlanned)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-muted-foreground">Gasto até agora</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalActual)} · {budgetPercentage}%</span>
            </div>
          </div>

          {/* Separador visual */}
          <div className="border-t border-border/40" />

          {/* NÍVEL 4: Bloco Terciário - Fluxo do Mês */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Fluxo do mês</p>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpIcon className="h-4 w-4 text-green-400/80" weight="bold" />
                  <span className="text-muted-foreground">Receitas</span>
                </div>
                <span className="font-semibold text-foreground">{formatCurrency(summary.totalIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownIcon className="h-4 w-4 text-red-400/80" weight="bold" />
                  <span className="text-muted-foreground">Comprometidas</span>
                </div>
                <span className="font-semibold text-foreground">{formatCurrency(summary.committedExpenses)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-blue-400/80" weight="bold" />
                  <span className="text-muted-foreground">Alocações</span>
                </div>
                <span className="font-semibold text-foreground">{formatCurrency(summary.applications)}</span>
              </div>
              {summary.reservedInGoals !== undefined && summary.reservedInGoals > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBankIcon className="h-4 w-4 text-secondary/80" weight="bold" />
                    <span className="text-muted-foreground">Metas</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(summary.reservedInGoals)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
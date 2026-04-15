"use client"

import * as React from "react"
import { ArrowUpIcon, ArrowDownIcon, InfoIcon, PiggyBankIcon, CreditCardIcon, PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTransactionModal } from "@/contexts/transaction-modal-context"
import { formatCurrency } from "@/lib/transactions/helpers"
import { FinancialSummary, PlannedVsActualItem } from "@/lib/transactions/types"

interface BalanceHeroProps {
  summary: FinancialSummary
  plannedVsActual?: PlannedVsActualItem[]
}

export function BalanceHero({ summary, plannedVsActual }: BalanceHeroProps) {
  const { openModal } = useTransactionModal()
  
  // ============================================
  // CÁLCULOS
  // ============================================
  
  // Planned amounts
  const totalPlanned = plannedVsActual?.reduce((sum, item) => sum + (item.planned || 0), 0) || 0
  const totalActual = plannedVsActual?.reduce((sum, item) => sum + item.actual, 0) || 0
  const hasPlannedAmounts = totalPlanned > 0
  
  // Saldo disponível: receitas - comprometidas - alocações
  const availableBalance = summary.totalIncome - summary.committedExpenses - summary.applications
  const hasTransactions = summary.totalIncome > 0 || summary.committedExpenses > 0 || summary.applications > 0
  
  // Tem qualquer dado relevante?
  const hasData = hasPlannedAmounts || hasTransactions

  // ============================================
  // ESTADO VISUAL
  // ============================================
  
  const balanceColor = availableBalance >= 0 ? "text-green-400" : "text-red-400"
  const balanceLabel = availableBalance >= 0 ? "Saldo disponível" : "Saldo negativo"
  const balanceValue = formatCurrency(Math.abs(availableBalance))

  // ============================================
  // RENDER
  // ============================================
  
  if (!hasData) {
    return (
      <div className="p-7 rounded-lg bg-card border border-border">
        <div className="py-8 text-center space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Bem-vindo ao seu caixa!</h3>
            <p className="text-sm text-muted-foreground">
              Comece adicionando sua primeira transação para ter uma visão clara das suas finanças.
            </p>
          </div>
          <Button
            onClick={openModal}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon size={16} weight="bold" />
            Nova Transação
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-7 rounded-lg bg-card border border-border space-y-6">
      {/* ============================================ */}
      {/* TOPO: SALDO DISPONÍVEL - SEMPRE PRESENTE */}
      {/* ============================================ */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">Saldo disponível</p>
        <p className={`font-heading text-5xl font-bold tracking-tight ${balanceColor}`}>
          {balanceValue}
        </p>
      </div>

      {/* ============================================ */}
      {/* BLOCO ORÇAMENTO - SÓ QUANDO TEM PLANNED */}
      {/* ============================================ */}
      {hasPlannedAmounts && (
        <>
          <div className="border-t border-border/40" />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Posição do orçamento</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center justify-center h-4 w-4 cursor-help transition-colors hover:text-foreground">
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground/50" weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  <p className="text-xs">Comparativo entre o orçamento planejado e o gasto realizado.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-muted-foreground">Orçamento do mês</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalPlanned)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-muted-foreground">Gasto até agora</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalActual)} · {totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* FLUXO DO MÊS - SEMPRE PRESENTE */}
      {/* ============================================ */}
      <div className="border-t border-border/40" />
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
                <span className="text-muted-foreground">Reservado em metas</span>
              </div>
              <span className="font-semibold text-foreground">{formatCurrency(summary.reservedInGoals)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
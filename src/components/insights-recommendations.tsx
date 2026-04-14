"use client"

import * as React from "react"
import { XCircle, Info, CheckCircle } from "phosphor-react"

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

interface InsightsRecommendationsProps {
  recommendations: Recommendation[]
  onSelect?: (rec: Recommendation) => void
  hasData: boolean
}

export function InsightsRecommendations({
  recommendations,
  onSelect,
  hasData
}: InsightsRecommendationsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, rec: Recommendation) => {
    if (e.key === "Enter" && onSelect) {
      onSelect(rec)
    }
  }

  if (!hasData) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          Sem transações ainda
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Adicione transações para receber recomendações
        </p>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          Sem recomendações por enquanto
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Seu padrão de gastos está equilibrado
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {recommendations.map((rec) => {
        return (
          <div
            key={rec.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(rec)}
            onKeyDown={(e) => handleKeyDown(e, rec)}
            className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-border/40"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {rec.type === "alerta" && <XCircle size={20} className="text-red-500" weight="bold" />}
                {rec.type === "observacao" && <Info size={20} className="text-orange-500" weight="bold" />}
                {rec.type === "positiva" && <CheckCircle size={20} className="text-lime-500" weight="bold" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {rec.type === "alerta"
                    ? "Alerta"
                    : rec.type === "observacao"
                      ? "Observação"
                      : "Positivo"}
                </p>
                <p className="text-sm text-foreground leading-snug">
                  {rec.fact}
                </p>
                {rec.action && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {rec.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
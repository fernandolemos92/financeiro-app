"use client"

import * as React from "react"

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

export function InsightsRecommendations({ recommendations, onSelect, hasData }: InsightsRecommendationsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, rec: Recommendation) => {
    if (e.key === "Enter" && onSelect) {
      onSelect(rec)
    }
  }

  if (!hasData) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">
          Adicione transações para receber recomendações
        </p>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">
          Adicione transações para receber recomendações
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect?.(rec)}
          onKeyDown={(e) => handleKeyDown(e, rec)}
          className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            rec.type === "alerta" 
              ? "bg-secondary/20" 
              : rec.type === "observacao" 
                ? "bg-yellow-400/20" 
                : "bg-green-400/20"
          }`}>
            <span className={`text-sm ${
              rec.type === "alerta" 
                ? "text-secondary" 
                : rec.type === "observacao" 
                  ? "text-yellow-400" 
                  : "text-green-400"
            }`}>
              {rec.type === "alerta" ? "!" : rec.type === "observacao" ? "●" : "✓"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {rec.type}
            </p>
            <p className="text-sm text-foreground line-clamp-2">
              {rec.fact}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
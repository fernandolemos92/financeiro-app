"use client"

import * as React from "react"
import { CaretUp, CaretRight, Warning } from "phosphor-react"

type HealthStatus = "bom" | "atencao" | "otimo" | "sem-dados"

interface HealthInfo {
  label: string
  color: string
  badge: string
}

interface InsightsHealthCardProps {
  status: HealthStatus
  info: HealthInfo
  justification: string
  factors: string[]
  hasData: boolean
}

export function InsightsHealthCard({
  status,
  info,
  justification,
  factors,
  hasData
}: InsightsHealthCardProps) {

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">−</div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Sem dados suficientes</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione transações para gerar um diagnóstico confiável.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {status === "otimo" && <CaretUp size={24} className="text-lime-500" weight="bold" />}
          {status === "bom" && <CaretRight size={24} className="text-foreground/80" weight="bold" />}
          {status === "atencao" && <Warning size={24} className="text-orange-500" weight="bold" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base text-foreground">
            {info.label}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {justification}
          </p>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="pt-3 border-t border-border/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Fatores que sustentam:</p>
          <ul className="space-y-1.5">
            {factors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-foreground/40 mt-1.5 flex-shrink-0" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
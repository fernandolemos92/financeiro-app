"use client"

import * as React from "react"

type HealthStatus = "bom" | "atencao" | "otimo"

interface HealthInfo {
  label: string
  icon: string
  color: string
}

interface InsightsHealthCardProps {
  status: HealthStatus
  info: HealthInfo
  justification: string
  factors: string[]
  onOpen?: () => void
}

export function InsightsHealthCard({ 
  status, 
  info, 
  justification, 
  factors, 
  onOpen 
}: InsightsHealthCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onOpen) {
      onOpen()
    }
  }

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-6 cursor-pointer"
    >
      <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
        {info.icon}
      </div>
      <div className="flex-1">
        <p className={`font-heading text-2xl font-semibold ${info.color}`}>
          {info.label}
        </p>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {justification}
        </p>
      </div>
      {factors.length > 0 && factors[0] && (
        <div className="mt-4 pt-4 border-t border-border/30 w-full">
          <p className="text-xs text-muted-foreground mb-2">Fatores do estado:</p>
          <div className="flex flex-wrap gap-2">
            {factors.map((factor, idx) => (
              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
"use client"

import * as React from "react"

interface Period {
  value: string
  label: string
}

interface PeriodFilterProps {
  periods: Period[]
  value: string
  onChange: (value: string) => void
}

export function PeriodFilter({ periods, value, onChange }: PeriodFilterProps) {
  const handleKeyDown = (e: React.KeyboardEvent, periodValue: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onChange(periodValue)
    }
  }

  return (
    <div className="flex gap-2" role="tablist" aria-label="Filtrar por período">
      {periods.map((p) => (
        <button
          key={p.value}
          role="tab"
          aria-selected={value === p.value}
          onClick={() => onChange(p.value)}
          onKeyDown={(e) => handleKeyDown(e, p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            value === p.value
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
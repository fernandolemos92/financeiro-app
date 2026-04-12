"use client"

import * as React from "react"
import { ExpenseNature } from "./use-transactions"

export interface PlannedAmounts {
  debt: number
  cost_of_living: number
  pleasure: number
  application: number
}

export type MonthKey = string

function getMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, "0")}`
}

function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number)
  return { year, month }
}

const PLANNED_STORAGE_KEY = "financeiro-app-planned-amounts-monthly"

const DEFAULT_PLANNED_AMOUNTS: PlannedAmounts = {
  debt: 0,
  cost_of_living: 0,
  pleasure: 0,
  application: 0,
}

function getStoredPlannedAmounts(): Record<MonthKey, PlannedAmounts> {
  if (typeof window === "undefined") return {}
  
  const stored = localStorage.getItem(PLANNED_STORAGE_KEY)
  if (!stored) return {}
  
  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

function savePlannedAmountsMonthly(amounts: Record<MonthKey, PlannedAmounts>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(amounts))
}

export function usePlannedAmounts() {
  const [currentDate, setCurrentDate] = React.useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  
  const [monthlyPlannedAmounts, setMonthlyPlannedAmounts] = React.useState<Record<MonthKey, PlannedAmounts>>({})
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    setMonthlyPlannedAmounts(getStoredPlannedAmounts())
    setIsLoaded(true)
  }, [])

  const currentMonthKey = getMonthKey(currentDate.year, currentDate.month)

  const plannedAmounts = React.useMemo(() => {
    return monthlyPlannedAmounts[currentMonthKey] || DEFAULT_PLANNED_AMOUNTS
  }, [monthlyPlannedAmounts, currentMonthKey])

  const goToPreviousMonth = React.useCallback(() => {
    setCurrentDate((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 }
      }
      return { ...prev, month: prev.month - 1 }
    })
  }, [])

  const goToNextMonth = React.useCallback(() => {
    setCurrentDate((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 }
      }
      return { ...prev, month: prev.month + 1 }
    })
  }, [])

  const updatePlannedAmount = React.useCallback((nature: ExpenseNature, amount: number) => {
    const sanitizedAmount = Math.max(0, amount)
    
    setMonthlyPlannedAmounts((prev) => {
      const updated = {
        ...prev,
        [currentMonthKey]: {
          ...(prev[currentMonthKey] || DEFAULT_PLANNED_AMOUNTS),
          [nature]: sanitizedAmount,
        },
      }
      savePlannedAmountsMonthly(updated)
      return updated
    })
  }, [currentMonthKey])

  const resetPlannedAmounts = React.useCallback(() => {
    setMonthlyPlannedAmounts((prev) => {
      const updated = {
        ...prev,
        [currentMonthKey]: DEFAULT_PLANNED_AMOUNTS,
      }
      savePlannedAmountsMonthly(updated)
      return updated
    })
  }, [currentMonthKey])

  return {
    plannedAmounts,
    isLoaded,
    currentDate,
    updatePlannedAmount,
    resetPlannedAmounts,
    goToPreviousMonth,
    goToNextMonth,
  }
}

export type DeviationState = "on_track" | "deviation_warning" | "overspent"

export interface PlannedVsActualItem {
  nature: ExpenseNature
  natureLabel: string
  planned: number
  actual: number
  deviationState: DeviationState
  percentage: number
}

function calculateDeviationState(planned: number, actual: number): DeviationState {
  if (planned === 0) return "on_track"
  if (actual <= planned) return "on_track"
  if (actual <= planned * 1.10) return "deviation_warning"
  return "overspent"
}

export function calculatePlannedVsActual(
  plannedAmounts: PlannedAmounts,
  expenseBreakdown: { debt: number; cost_of_living: number; pleasure: number; application: number }
): PlannedVsActualItem[] {
  const natureLabels: Record<ExpenseNature, string> = {
    debt: "Dívidas",
    cost_of_living: "Custo de Vida",
    pleasure: "Prazer",
    application: "Alocações",
  }

  const natures: ExpenseNature[] = ["debt", "cost_of_living", "pleasure", "application"]

  return natures.map((nature) => {
    const planned = plannedAmounts[nature]
    const actual = expenseBreakdown[nature]
    const deviationState = calculateDeviationState(planned, actual)
    const percentage = planned > 0 ? (actual / planned) * 100 : 0

    return {
      nature,
      natureLabel: natureLabels[nature],
      planned,
      actual,
      deviationState,
      percentage,
    }
  })
}

export function checkAllOnTrack(items: PlannedVsActualItem[]): boolean {
  if (items.length === 0) return true
  return items.every((item) => item.deviationState === "on_track")
}
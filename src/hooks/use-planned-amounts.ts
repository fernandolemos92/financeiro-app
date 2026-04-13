"use client"

import * as React from "react"
import {
  apiFetchPlannedAmounts,
  apiUpsertPlannedAmounts,
  type PlannedAmountsResponse,
  type PlannedAmountsPayload,
} from "@/lib/api/planned-amounts"
import type { ExpenseNature } from "./use-transactions"

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

const DEFAULT_PLANNED_AMOUNTS: PlannedAmounts = {
  debt: 0,
  cost_of_living: 0,
  pleasure: 0,
  application: 0,
}

// Module-level cache and pending fetches (shared across all instances)
const monthCacheSingleton: Map<MonthKey, PlannedAmounts> = new Map()
const pendingFetches: Map<MonthKey, Promise<void>> = new Map()

export function usePlannedAmounts() {
  const [currentDate, setCurrentDate] = React.useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const [plannedAmounts, setPlannedAmounts] = React.useState<PlannedAmounts>(DEFAULT_PLANNED_AMOUNTS)
  const [isLoaded, setIsLoaded] = React.useState(false)

  const currentMonthKey = getMonthKey(currentDate.year, currentDate.month)

  React.useEffect(() => {
    // Check if we have this month cached
    if (monthCacheSingleton.has(currentMonthKey)) {
      const cached = monthCacheSingleton.get(currentMonthKey)!
      setPlannedAmounts({ ...cached })
      setIsLoaded(true)
      return
    }

    // If fetch is already pending, wait for it
    if (pendingFetches.has(currentMonthKey)) {
      pendingFetches.get(currentMonthKey)!.then(() => {
        const cached = monthCacheSingleton.get(currentMonthKey)
        if (cached) {
          setPlannedAmounts({ ...cached })
        }
        setIsLoaded(true)
      })
      return
    }

    // Fetch from API
    const fetchPromise = apiFetchPlannedAmounts(currentMonthKey)
      .then((data) => {
        // Convert response to PlannedAmounts (omit month field)
        const amounts: PlannedAmounts = {
          debt: data.debt,
          cost_of_living: data.cost_of_living,
          pleasure: data.pleasure,
          application: data.application,
        }
        monthCacheSingleton.set(currentMonthKey, amounts)
        setPlannedAmounts({ ...amounts })
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error(`Failed to fetch planned amounts for ${currentMonthKey}:`, err)
        // On error, set to defaults and mark as loaded
        monthCacheSingleton.set(currentMonthKey, DEFAULT_PLANNED_AMOUNTS)
        setPlannedAmounts({ ...DEFAULT_PLANNED_AMOUNTS })
        setIsLoaded(true)
      })
      .finally(() => {
        pendingFetches.delete(currentMonthKey)
      })

    pendingFetches.set(currentMonthKey, fetchPromise)
  }, [currentMonthKey])

  const updatePlannedAmount = React.useCallback(
    async (nature: ExpenseNature, amount: number) => {
      const sanitized = Math.max(0, amount)

      try {
        // Build full payload from current cached amounts
        const current = monthCacheSingleton.get(currentMonthKey) || DEFAULT_PLANNED_AMOUNTS
        const payload: PlannedAmountsPayload = {
          debt: current.debt,
          cost_of_living: current.cost_of_living,
          pleasure: current.pleasure,
          application: current.application,
          [nature]: sanitized,
        }

        // Call API with full payload
        const result = await apiUpsertPlannedAmounts(currentMonthKey, payload)

        // Update cache with new values
        const updated: PlannedAmounts = {
          debt: result.debt,
          cost_of_living: result.cost_of_living,
          pleasure: result.pleasure,
          application: result.application,
        }
        monthCacheSingleton.set(currentMonthKey, updated)
        setPlannedAmounts({ ...updated })
      } catch (err) {
        console.error("Failed to update planned amount:", err)
        throw err
      }
    },
    [currentMonthKey]
  )

  const resetPlannedAmounts = React.useCallback(async () => {
    try {
      const result = await apiUpsertPlannedAmounts(currentMonthKey, DEFAULT_PLANNED_AMOUNTS)

      const updated: PlannedAmounts = {
        debt: result.debt,
        cost_of_living: result.cost_of_living,
        pleasure: result.pleasure,
        application: result.application,
      }
      monthCacheSingleton.set(currentMonthKey, updated)
      setPlannedAmounts({ ...updated })
    } catch (err) {
      console.error("Failed to reset planned amounts:", err)
      throw err
    }
  }, [currentMonthKey])

  const goToPreviousMonth = React.useCallback(() => {
    setCurrentDate((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 }
      }
      return { ...prev, month: prev.month - 1 }
    })
    setIsLoaded(false)
  }, [])

  const goToNextMonth = React.useCallback(() => {
    setCurrentDate((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 }
      }
      return { ...prev, month: prev.month + 1 }
    })
    setIsLoaded(false)
  }, [])

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

// Pure utility functions (unchanged from original)

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
  if (actual <= planned * 1.1) return "deviation_warning"
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

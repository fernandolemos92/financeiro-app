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
const pendingFetches: Map<MonthKey, Promise<PlannedAmounts>> = new Map()
const monthExistsCache: Set<MonthKey> = new Set()

export function usePlannedAmounts(initialMonth?: MonthKey) {
  const [currentDate, setCurrentDate] = React.useState(() => {
    if (initialMonth) {
      const { year, month } = parseMonthKey(initialMonth)
      return { year, month }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const [plannedAmounts, setPlannedAmounts] = React.useState<PlannedAmounts>(DEFAULT_PLANNED_AMOUNTS)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)

  const currentMonthKey = getMonthKey(currentDate.year, currentDate.month)

  // Get previous month key for bootstrap
  const getPreviousMonthKey = (monthKey: MonthKey): MonthKey | null => {
    const { year, month } = parseMonthKey(monthKey)
    if (month === 1) {
      return `${year - 1}-12`
    }
    return `${year}-${String(month - 1).padStart(2, "0")}`
  }

  // Fetch planned amounts for a specific month
  const fetchMonthData = async (monthKey: MonthKey, useBootstrap: boolean = false): Promise<PlannedAmounts> => {
    // If in cache, return it
    if (monthCacheSingleton.has(monthKey)) {
      return monthCacheSingleton.get(monthKey)!
    }

    // Check if fetch is pending
    if (pendingFetches.has(monthKey)) {
      await pendingFetches.get(monthKey)!
      return monthCacheSingleton.get(monthKey) || DEFAULT_PLANNED_AMOUNTS
    }

    // Fetch from API
    const fetchPromise = (async () => {
      try {
        const data = await apiFetchPlannedAmounts(monthKey)
        
        // Check if month has real data (non-zero values)
        const hasData = data.debt > 0 || data.cost_of_living > 0 || data.pleasure > 0 || data.application > 0
        
        if (hasData) {
          monthExistsCache.add(monthKey)
        }

        const amounts: PlannedAmounts = {
          debt: data.debt,
          cost_of_living: data.cost_of_living,
          pleasure: data.pleasure,
          application: data.application,
        }
        monthCacheSingleton.set(monthKey, amounts)
        return amounts
      } catch (err) {
        console.error(`Failed to fetch planned amounts for ${monthKey}:`, err)
        monthCacheSingleton.set(monthKey, DEFAULT_PLANNED_AMOUNTS)
        return DEFAULT_PLANNED_AMOUNTS
      }
    })()

    pendingFetches.set(monthKey, fetchPromise)
    const result = await fetchPromise
    pendingFetches.delete(monthKey)
    
    return result
  }

  // Bootstrap: load from previous month if current month has no data
  const bootstrapIfNeeded = async (monthKey: MonthKey): Promise<PlannedAmounts> => {
    // First, try to fetch current month data
    let currentData = await fetchMonthData(monthKey)
    
    // Check if month has data
    const hasCurrentData = currentData.debt > 0 || currentData.cost_of_living > 0 || 
                        currentData.pleasure > 0 || currentData.application > 0
    
    if (hasCurrentData) {
      return currentData
    }

    // No data for current month - try to bootstrap from previous month
    const previousMonthKey = getPreviousMonthKey(monthKey)
    if (!previousMonthKey) {
      return DEFAULT_PLANNED_AMOUNTS
    }

    const previousData = await fetchMonthData(previousMonthKey)
    
    // Check if previous month has data
    const hasPreviousData = previousData.debt > 0 || previousData.cost_of_living > 0 || 
                           previousData.pleasure > 0 || previousData.application > 0
    
    if (!hasPreviousData) {
      return DEFAULT_PLANNED_AMOUNTS
    }

    // Copy values from previous month (this is the bootstrap)
    const bootstrapData = { ...previousData }
    monthCacheSingleton.set(monthKey, bootstrapData)
    
    return bootstrapData
  }

  // Main effect: load data for current month
  React.useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoaded(false)
      
      const data = await bootstrapIfNeeded(currentMonthKey)
      
      if (mounted) {
        setPlannedAmounts(data)
        setIsLoaded(true)
        setIsInitialized(true)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [currentMonthKey])

  // Sync with external initialMonth if provided
  React.useEffect(() => {
    if (initialMonth) {
      const { year, month } = parseMonthKey(initialMonth)
      setCurrentDate({ year, month })
    }
  }, [initialMonth])

  const setMonth = React.useCallback((newMonthKey: MonthKey) => {
    const { year, month } = parseMonthKey(newMonthKey)
    setCurrentDate({ year, month })
    setIsLoaded(false)
  }, [])

  const updatePlannedAmount = React.useCallback(
    async (nature: ExpenseNature, amount: number) => {
      const sanitized = Math.max(0, amount)

      try {
        // Get current values as base
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

        // Mark month as existing
        monthExistsCache.add(currentMonthKey)

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

      monthCacheSingleton.set(currentMonthKey, DEFAULT_PLANNED_AMOUNTS)
      setPlannedAmounts({ ...DEFAULT_PLANNED_AMOUNTS })
    } catch (err) {
      console.error("Failed to reset planned amounts:", err)
      throw err
    }
  }, [currentMonthKey])

  return {
    plannedAmounts,
    isLoaded,
    isInitialized,
    currentDate,
    currentMonthKey,
    setMonth,
    updatePlannedAmount,
    resetPlannedAmounts,
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

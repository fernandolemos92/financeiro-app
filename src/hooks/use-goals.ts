"use client"

import * as React from "react"
import {
  apiFetchGoals,
  apiCreateGoal,
  apiUpdateGoal,
  apiDeleteGoal,
  apiAddContribution,
  apiCloseGoal,
  type Goal,
  type GoalStatus,
  type CreateGoalPayload,
  type UpdateGoalPayload,
} from "@/lib/api/goals"

export type { Goal, GoalStatus }

export interface GoalContribution {
  id: string
  amount: number
  date: string
}

// Module-level singleton (shared across all component instances)
let goalsSingleton: Goal[] = []
let isLoadedSingleton = false
let errorSingleton: Error | null = null
let loadPromise: Promise<void> | null = null
const listenersSingleton: Set<(goals: Goal[]) => void> = new Set()

function notifyListeners(): void {
  listenersSingleton.forEach((listener) => listener(goalsSingleton))
}

export function useGoals() {
  // Initialize from singleton
  const [goals, setGoals] = React.useState<Goal[]>(goalsSingleton)
  const [isLoaded, setIsLoaded] = React.useState(isLoadedSingleton)
  const [, forceUpdate] = React.useState(0)

  React.useEffect(() => {
    // Register listener for singleton updates
    const listener = (newGoals: Goal[]) => {
      setGoals([...newGoals])
    }
    listenersSingleton.add(listener)

    // Load goals if not yet loaded
    if (!isLoadedSingleton) {
      if (!loadPromise) {
        loadPromise = apiFetchGoals()
          .then((data) => {
            goalsSingleton = data
            isLoadedSingleton = true
            errorSingleton = null
            notifyListeners()
          })
          .catch((err) => {
            errorSingleton = err
            console.error("Failed to load goals:", err)
          })
      }

      loadPromise.then(() => {
        setGoals([...goalsSingleton])
        setIsLoaded(true)
      })
    } else {
      // Already loaded, sync state
      setGoals([...goalsSingleton])
      setIsLoaded(true)
    }

    return () => {
      listenersSingleton.delete(listener)
    }
  }, [])

  const addGoal = React.useCallback(
    async (data: CreateGoalPayload) => {
      try {
        const newGoal = await apiCreateGoal(data)
        goalsSingleton = [newGoal, ...goalsSingleton]
        notifyListeners()
        forceUpdate((n) => n + 1)
        return newGoal
      } catch (err) {
        console.error("Failed to create goal:", err)
        throw err
      }
    },
    []
  )

  const addContribution = React.useCallback(
    async (id: string, amount: number) => {
      if (amount <= 0) return false

      try {
        const updated = await apiAddContribution(id, amount)
        goalsSingleton = goalsSingleton.map((g) => (g.id === id ? updated : g))
        notifyListeners()
        forceUpdate((n) => n + 1)
        return true
      } catch (err) {
        console.error("Failed to add contribution:", err)
        throw err
      }
    },
    []
  )

  const closeGoalManually = React.useCallback(async (id: string) => {
    try {
      const updated = await apiCloseGoal(id)
      goalsSingleton = goalsSingleton.map((g) => (g.id === id ? updated : g))
      notifyListeners()
      forceUpdate((n) => n + 1)
    } catch (err) {
      console.error("Failed to close goal:", err)
      throw err
    }
  }, [])

  const updateGoal = React.useCallback(async (id: string, data: UpdateGoalPayload) => {
    try {
      const updated = await apiUpdateGoal(id, data)
      goalsSingleton = goalsSingleton.map((g) => (g.id === id ? updated : g))
      notifyListeners()
      forceUpdate((n) => n + 1)
    } catch (err) {
      console.error("Failed to update goal:", err)
      throw err
    }
  }, [])

  const updateGoalAmount = React.useCallback(
    (id: string, amount: number) => {
      return addContribution(id, amount)
    },
    [addContribution]
  )

  const deleteGoal = React.useCallback(async (id: string) => {
    try {
      await apiDeleteGoal(id)
      goalsSingleton = goalsSingleton.filter((g) => g.id !== id)
      notifyListeners()
      forceUpdate((n) => n + 1)
    } catch (err) {
      console.error("Failed to delete goal:", err)
      throw err
    }
  }, [])

  const getGoalById = React.useCallback(
    (id: string): Goal | undefined => {
      return goals.find((g) => g.id === id)
    },
    [goals]
  )

  return {
    goals,
    isLoaded,
    addGoal,
    updateGoalAmount,
    addContribution,
    closeGoalManually,
    updateGoal,
    deleteGoal,
    getGoalById,
  }
}

// Utility functions (unchanged from original)

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

// Re-export from centralized monetary formatting module
export { formatMonetaryInput as formatInputValue, parseMonetaryInput as parseInputValue } from "@/lib/monetary-formatting"

export function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min((current / target) * 100, 100)
}

export function formatProgressPercentage(current: number, target: number): string {
  const progress = calculateProgress(current, target)
  if (progress === 0) return "0%"
  if (progress < 10) return `${progress.toFixed(1)}%`
  return `${Math.round(progress)}%`
}

export function getDeadlineText(deadline: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return `Atrasada há ${absDays} dia${absDays !== 1 ? "s" : ""}`
  } else if (diffDays === 0) {
    return "Vence hoje"
  } else {
    return `Faltam ${diffDays} dia${diffDays !== 1 ? "s" : ""}`
  }
}

export function getMissingAmount(currentAmount: number, targetAmount: number): number {
  return Math.max(targetAmount - currentAmount, 0)
}

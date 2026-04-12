"use client"

import * as React from "react"

export interface GoalContribution {
  id: string
  amount: number
  date: string
}

export type GoalStatus = "active" | "completed" | "manually_closed"

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  status: GoalStatus
  createdAt: string
  completedAt?: string
  contributions: GoalContribution[]
}

const STORAGE_KEY = "financeiro-app-goals"

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
}

function getStoredGoals(): Goal[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return parsed.map((g: any) => {
        const migratedGoal: Goal = {
          ...g,
          id: g.id || generateId(),
          contributions: (g.contributions || []).map((c: any, idx: number) => ({
            ...c,
            id: c.id || `contrib-${idx}-${generateId()}`,
          })),
        }
        if (g.isCompleted && !migratedGoal.completedAt) {
          migratedGoal.status = "completed"
          migratedGoal.completedAt = g.completedAt || new Date().toISOString()
        }
        return migratedGoal
      })
    } catch {
      return []
    }
  }
  return []
}

function saveGoals(goals: Goal[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export function useGoals() {
  const [goals, setGoals] = React.useState<Goal[]>(() => {
    if (typeof window === "undefined") return []
    return getStoredGoals()
  })
  const [isLoaded, setIsLoaded] = React.useState(true)

  const addGoal = React.useCallback((data: {
    name: string
    targetAmount: number
    deadline: string
  }) => {
    const newGoal: Goal = {
      id: generateId(),
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      deadline: data.deadline,
      status: "active",
      createdAt: new Date().toISOString(),
      contributions: [],
    }

    setGoals((prev) => {
      const updated = [newGoal, ...prev]
      saveGoals(updated)
      return updated
    })

    return newGoal
  }, [])

  const addContribution = React.useCallback((id: string, amount: number) => {
    if (amount <= 0) return false

    setGoals((prev) => {
      const updated = prev.map((goal) => {
        if (goal.id !== id) return goal

        const newCurrentAmount = goal.currentAmount + amount
        const isNowCompleted = newCurrentAmount >= goal.targetAmount

        const contribution: GoalContribution = {
          id: generateId(),
          amount,
          date: new Date().toISOString(),
        }

        return {
          ...goal,
          currentAmount: newCurrentAmount,
          status: isNowCompleted ? "completed" : goal.status,
          completedAt: isNowCompleted ? new Date().toISOString() : goal.completedAt,
          contributions: [contribution, ...goal.contributions],
        }
      })
      saveGoals(updated)
      return updated
    })
    return true
  }, [])

  const closeGoalManually = React.useCallback((id: string) => {
    setGoals((prev) => {
      const updated = prev.map((goal) => {
        if (goal.id !== id) return goal
        if (goal.status !== "active") return goal

        return {
          ...goal,
          status: "manually_closed" as GoalStatus,
          completedAt: new Date().toISOString(),
        }
      })
      saveGoals(updated)
      return updated
    })
  }, [])

  const updateGoal = React.useCallback((id: string, data: { name?: string; targetAmount?: number; deadline?: string }) => {
    setGoals((prev) => {
      const updated = prev.map((goal) => {
        if (goal.id !== id) return goal

        const newTargetAmount = data.targetAmount ?? goal.targetAmount
        const newCurrentAmount = goal.currentAmount
        const isNowCompleted = newCurrentAmount >= newTargetAmount

        return {
          ...goal,
          name: data.name ?? goal.name,
          targetAmount: newTargetAmount,
          deadline: data.deadline ?? goal.deadline,
          status: isNowCompleted ? "completed" : goal.status,
          completedAt: isNowCompleted ? new Date().toISOString() : goal.completedAt,
        }
      })
      saveGoals(updated)
      return updated
    })
  }, [])

  const updateGoalAmount = React.useCallback((id: string, amount: number) => {
    return addContribution(id, amount)
  }, [addContribution])

  const deleteGoal = React.useCallback((id: string) => {
    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id)
      saveGoals(updated)
      return updated
    })
  }, [])

  const getGoalById = React.useCallback((id: string): Goal | undefined => {
    return goals.find((g) => g.id === id)
  }, [goals])

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

export function formatInputValue(value: string): string {
  const numbers = value.replace(/\D/g, "")
  if (!numbers) return ""
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function parseInputValue(value: string): string {
  return value.replace(/\./g, "")
}

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
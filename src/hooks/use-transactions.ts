"use client"

import * as React from "react"
import { Transaction, IncomeType, ExpenseNature, Frequency, PlanningStatus, Category, SubCategory, BalanceState, FinancialSummary, IncomeBreakdown, ExpenseBreakdown, MonthlyProvisioning } from "@/lib/transactions"
import type { TransactionType } from "@/lib/transactions/types"
import { storage, TransactionStorage } from "@/lib/transactions/storage"
import { normalizer } from "@/lib/transactions/normalizer"
import { expenseCategories, incomeCategories, getSubcategories as getSubs, getExpenseCategoriesList, getIncomeCategoriesList, allCategories } from "@/lib/transactions/normalizer"
import {
  formatCurrency,
  formatDate,
  calculateFinancialSummary,
  calculateIncomeBreakdown,
  calculateExpenseBreakdown,
  calculateMonthlyProvisioning,
  getTransactionTitle,
  getTransactionSubtitle,
  INCOME_TYPES,
  EXPENSE_NATURES,
  FREQUENCIES,
  PLANNING_STATUSES,
} from "@/lib/transactions/helpers"
import { apiFetchTransactions, apiCreateTransaction, apiUpdateTransaction, apiDeleteTransaction } from "@/lib/api/transactions"

export type { TransactionType, IncomeType, ExpenseNature, Frequency, PlanningStatus }
export type { Transaction, Category, SubCategory }
export type { BalanceState, FinancialSummary, IncomeBreakdown, ExpenseBreakdown, MonthlyProvisioning }

export const categories = expenseCategories
export { expenseCategories, incomeCategories, allCategories }

let transactionsSingleton: Transaction[] = []
let isLoadedSingleton = false
const listenersSingleton: Set<(transactions: Transaction[]) => void> = new Set()
let loadPromise: Promise<void> | null = null
let errorSingleton: Error | null = null

export function setStorageAdapter(_adapter: TransactionStorage): void {
  // Deprecated: storage adapter is no longer used, API is now the source of truth
}

function notifyListeners(): void {
  listenersSingleton.forEach(listener => listener(transactionsSingleton))
}

function useTransactionsCore() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(transactionsSingleton)
  const [isLoaded, setIsLoaded] = React.useState(isLoadedSingleton)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (!isLoadedSingleton) {
      if (!loadPromise) {
        loadPromise = (async () => {
          try {
            const data = await apiFetchTransactions()
            transactionsSingleton = data.map(record => normalizer.normalize(record))
            isLoadedSingleton = true
            errorSingleton = null
            notifyListeners()
          } catch (err) {
            errorSingleton = err instanceof Error ? err : new Error('Failed to load transactions')
            notifyListeners()
            throw err
          }
        })()
      }
      try {
        loadPromise.then(() => {
          setTransactions(transactionsSingleton)
          setIsLoaded(true)
          setError(null)
        }).catch(() => {
          setError(errorSingleton)
        })
      } catch {
        setError(errorSingleton)
      }
    }

    const listener = (newTransactions: Transaction[]) => {
      setTransactions([...newTransactions])
    }
    listenersSingleton.add(listener)

    return () => {
      listenersSingleton.delete(listener)
    }
  }, [])

  return { transactions, isLoaded, error }
}

export function useTransactions() {
  const { transactions, isLoaded, error } = useTransactionsCore()
  const [, forceUpdate] = React.useState(0)

  const addTransaction = React.useCallback(async (data: Omit<Transaction, "id" | "createdAt">) => {
    const newTransaction = await apiCreateTransaction(data)
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    notifyListeners()
    forceUpdate(n => n + 1)
    return newTransaction
  }, [])

  const addTransactionWithSubcategory = React.useCallback(async (data: Omit<Transaction, "id" | "createdAt" | "subcategory"> & { subcategory: string }) => {
    const newTransaction = await apiCreateTransaction(data as Omit<Transaction, "id" | "createdAt">)
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    notifyListeners()
    forceUpdate(n => n + 1)
    return newTransaction
  }, [])

  const updateTransactionClassification = React.useCallback(async (id: string, updates: {
    income_type?: IncomeType
    expense_nature?: ExpenseNature
    frequency?: Frequency
    planning_status?: PlanningStatus
    subcategory?: string
  }) => {
    const updated = await apiUpdateTransaction(id, updates)
    transactionsSingleton = transactionsSingleton.map(t => t.id === id ? updated : t)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  const updateTransaction = React.useCallback(async (id: string, updates: Partial<Transaction>) => {
    const updated = await apiUpdateTransaction(id, updates)
    transactionsSingleton = transactionsSingleton.map(t => t.id === id ? updated : t)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  const deleteTransaction = React.useCallback(async (id: string) => {
    await apiDeleteTransaction(id)
    transactionsSingleton = transactionsSingleton.filter(t => t.id !== id)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  return {
    transactions,
    isLoaded,
    error,
    addTransaction,
    addTransactionWithSubcategory,
    updateTransactionClassification,
    updateTransaction,
    deleteTransaction,
  }
}

export function getSubcategories(categoryId: string): SubCategory[] {
  return getSubs(categoryId)
}

export function getExpenseCategories(): Category[] {
  return getExpenseCategoriesList()
}

export function getIncomeCategories(): Category[] {
  return getIncomeCategoriesList()
}

export { formatCurrency, formatDate }
export { calculateFinancialSummary }
export { calculateIncomeBreakdown }
export { calculateExpenseBreakdown }
export { calculateMonthlyProvisioning }
export { getTransactionTitle }
export { getTransactionSubtitle }
export { INCOME_TYPES, EXPENSE_NATURES, FREQUENCIES, PLANNING_STATUSES }

export { usePlannedAmounts, calculatePlannedVsActual, checkAllOnTrack } from "./use-planned-amounts"
export type { PlannedAmounts, DeviationState, PlannedVsActualItem } from "./use-planned-amounts"
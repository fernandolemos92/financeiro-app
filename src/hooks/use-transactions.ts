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

export type { TransactionType, IncomeType, ExpenseNature, Frequency, PlanningStatus }
export type { Transaction, Category, SubCategory }
export type { BalanceState, FinancialSummary, IncomeBreakdown, ExpenseBreakdown, MonthlyProvisioning }

export const categories = expenseCategories
export { expenseCategories, incomeCategories, allCategories }

let transactionsSingleton: Transaction[] = []
let isLoadedSingleton = false
let listenersSingleton: Set<(transactions: Transaction[]) => void> = new Set()
let storageAdapter: TransactionStorage = storage

export function setStorageAdapter(adapter: TransactionStorage): void {
  storageAdapter = adapter
}

function notifyListeners(): void {
  listenersSingleton.forEach(listener => listener(transactionsSingleton))
}

function useTransactionsCore() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(transactionsSingleton)
  const [isLoaded, setIsLoaded] = React.useState(isLoadedSingleton)

  React.useEffect(() => {
    if (!isLoadedSingleton) {
      const stored = storageAdapter.loadAll()
      transactionsSingleton = stored.map(record => normalizer.normalize(record))
      isLoadedSingleton = true
      setTransactions(transactionsSingleton)
      setIsLoaded(true)
    }

    const listener = (newTransactions: Transaction[]) => {
      setTransactions([...newTransactions])
    }
    listenersSingleton.add(listener)

    return () => {
      listenersSingleton.delete(listener)
    }
  }, [])

  return { transactions, isLoaded }
}

export function useTransactions() {
  const { transactions, isLoaded } = useTransactionsCore()
  const [, forceUpdate] = React.useState(0)

  const addTransaction = React.useCallback((data: Omit<Transaction, "id" | "createdAt">) => {
    const newTransaction: Transaction = {
      ...data,
      id: storageAdapter.createId(),
      createdAt: storageAdapter.getCurrentTimestamp(),
    }
    
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    storageAdapter.saveAll(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
    
    return newTransaction
  }, [])
  
  const addTransactionWithSubcategory = React.useCallback((data: Omit<Transaction, "id" | "createdAt" | "subcategory"> & { subcategory: string }) => {
    const newTransaction: Transaction = {
      ...data,
      id: storageAdapter.createId(),
      createdAt: storageAdapter.getCurrentTimestamp(),
    }
    
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    storageAdapter.saveAll(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
    
    return newTransaction
  }, [])

  const updateTransactionClassification = React.useCallback((id: string, updates: {
    income_type?: IncomeType
    expense_nature?: ExpenseNature
    frequency?: Frequency
    planning_status?: PlanningStatus
    subcategory?: string
  }) => {
    transactionsSingleton = transactionsSingleton.map((t) => {
      if (t.id === id) {
        return { ...t, ...updates }
      }
      return t
    })
    storageAdapter.saveAll(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  const updateTransaction = React.useCallback((id: string, updates: Partial<Transaction>) => {
    transactionsSingleton = transactionsSingleton.map((t) => {
      if (t.id === id) {
        return { ...t, ...updates }
      }
      return t
    })
    storageAdapter.saveAll(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  const deleteTransaction = React.useCallback((id: string) => {
    transactionsSingleton = transactionsSingleton.filter((t) => t.id !== id)
    storageAdapter.saveAll(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  return {
    transactions,
    isLoaded,
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
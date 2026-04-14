import {
  Transaction,
  FinancialSummary,
  IncomeBreakdown,
  ExpenseBreakdown,
  MonthlyProvisioning,
  ExpenseNature
} from "./types"
import { getCategoryById, getSubcategoryById } from "./normalizer"
import { formatCurrency, formatDate } from "@/lib/formatting"

// Re-export formatters for backward compatibility
export { formatCurrency, formatDate }

export function calculateFinancialSummary(
  transactions: Transaction[], 
  periodStart?: Date, 
  periodEnd?: Date
): FinancialSummary {
  const now = new Date()
  const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1)
  const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const periodTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= start && date <= end && t.planning_status !== "planned"
  })

  const incomes = periodTransactions.filter((t) => t.type === "income")
  const expenses = periodTransactions.filter((t) => t.type === "expense")

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0)

  const debt = expenses.filter((t) => t.expense_nature === "debt").reduce((sum, t) => sum + t.amount, 0)
  const costOfLiving = expenses.filter((t) => t.expense_nature === "cost_of_living").reduce((sum, t) => sum + t.amount, 0)
  const pleasure = expenses.filter((t) => t.expense_nature === "pleasure").reduce((sum, t) => sum + t.amount, 0)
  const applications = expenses.filter((t) => t.expense_nature === "application").reduce((sum, t) => sum + t.amount, 0)

  const committedExpenses = debt + costOfLiving + pleasure
  const totalExpenses = committedExpenses + applications
  
  const availableBalance = totalIncome - totalExpenses

  const isAllAllocated = Math.abs(availableBalance) < 1 && totalIncome > 0
  const balanceState = availableBalance < 0 ? "overspent" : isAllAllocated ? "zero_allocation" : "positive"

  const monthlyProvisioned = calculateMonthlyProvisioning(expenses)

  return {
    totalIncome,
    totalExpenses,
    committedExpenses,
    applications,
    availableBalance,
    balanceState,
    isAllAllocated,
    monthlyProvisionedTotal: monthlyProvisioned.monthlyImpact,
  }
}

export function calculateIncomeBreakdown(
  transactions: Transaction[], 
  periodStart?: Date, 
  periodEnd?: Date
): IncomeBreakdown {
  const now = new Date()
  const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1)
  const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const periodTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= start && date <= end && t.type === "income"
  })

  return {
    fixed: periodTransactions.filter((t) => t.income_type === "fixed").reduce((sum, t) => sum + t.amount, 0),
    variable: periodTransactions.filter((t) => t.income_type === "variable").reduce((sum, t) => sum + t.amount, 0),
    oscillating: periodTransactions.filter((t) => t.income_type === "oscillating").reduce((sum, t) => sum + t.amount, 0),
  }
}

export function calculateExpenseBreakdown(
  transactions: Transaction[], 
  periodStart?: Date, 
  periodEnd?: Date
): ExpenseBreakdown {
  const now = new Date()
  const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1)
  const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const periodTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= start && date <= end && t.type === "expense" && t.planning_status !== "planned"
  })

  return {
    debt: periodTransactions.filter((t) => t.expense_nature === "debt").reduce((sum, t) => sum + t.amount, 0),
    cost_of_living: periodTransactions.filter((t) => t.expense_nature === "cost_of_living").reduce((sum, t) => sum + t.amount, 0),
    pleasure: periodTransactions.filter((t) => t.expense_nature === "pleasure").reduce((sum, t) => sum + t.amount, 0),
    application: periodTransactions.filter((t) => t.expense_nature === "application").reduce((sum, t) => sum + t.amount, 0),
  }
}

export function calculateMonthlyProvisioning(expenses: Transaction[]): MonthlyProvisioning {
  const annualExpenses = expenses.filter((t) => t.frequency === "annual").reduce((sum, t) => sum + t.amount, 0)
  const occasionalExpenses = expenses.filter((t) => t.frequency === "occasional").reduce((sum, t) => sum + t.amount, 0)
  
  const monthlyImpact = (annualExpenses + occasionalExpenses) / 12

  return {
    annualExpenses,
    occasionalExpenses,
    monthlyImpact,
  }
}

function normalizeForComparison(text: string | undefined): string {
  return (text || "").trim().toLowerCase()
}

function isTitleGeneric(title: string | undefined, categoryId: string, subcategoryId?: string): boolean {
  const normalizedTitle = normalizeForComparison(title)
  const categoryName = getCategoryById(categoryId).name.toLowerCase()
  const subcategoryName = subcategoryId ? getSubcategoryById(subcategoryId)?.name.toLowerCase() : ""
  
  return normalizedTitle === categoryName || normalizedTitle === subcategoryName || normalizedTitle === ""
}

function isDescriptionUseful(description: string | undefined, categoryId: string, subcategoryId?: string): boolean {
  if (!description) return false
  const normalizedDesc = normalizeForComparison(description)
  const categoryName = getCategoryById(categoryId).name.toLowerCase()
  const subcategoryName = subcategoryId ? getSubcategoryById(subcategoryId)?.name.toLowerCase() : ""
  
  if (normalizedDesc === categoryName || normalizedDesc === subcategoryName) return false
  if (description.length > 50) return false
  return true
}

export function getTransactionTitle(transaction: Transaction): string {
  const { description, category, subcategory } = transaction
  
  const titleFromDesc = description
  if (!isTitleGeneric(titleFromDesc, category, subcategory)) {
    return titleFromDesc || ""
  }
  
  if (isDescriptionUseful(description, category, subcategory)) {
    return description || ""
  }
  
  if (subcategory) {
    const sub = getSubcategoryById(subcategory)
    if (sub) return sub.name
  }
  
  const cat = getCategoryById(category)
  return cat.name
}

export function getTransactionSubtitle(transaction: Transaction): string {
  const isExpense = transaction.type === "expense"
  
  if (isExpense && transaction.subcategory) {
    const sub = getSubcategoryById(transaction.subcategory)
    const cat = getCategoryById(transaction.category)
    return sub ? `${cat.name} · ${sub.name}` : cat.name
  }
  
  if (!isExpense && transaction.income_type) {
    const cat = getCategoryById(transaction.category)
    const incomeTypeLabel = INCOME_TYPES.find(t => t.value === transaction.income_type)?.label || transaction.income_type
    return `${cat.name} · ${incomeTypeLabel}`
  }
  
  const cat = getCategoryById(transaction.category)
  return cat.name
}

export const INCOME_TYPES: { value: string; label: string }[] = [
  { value: "fixed", label: "Fixa" },
  { value: "variable", label: "Variável" },
  { value: "oscillating", label: "Oscilante" },
]

export const EXPENSE_NATURES: { value: ExpenseNature; label: string }[] = [
  { value: "debt", label: "Dívida" },
  { value: "cost_of_living", label: "Custo de Vida" },
  { value: "pleasure", label: "Prazer" },
  { value: "application", label: "Aplicação" },
]

export const FREQUENCIES: { value: string; label: string }[] = [
  { value: "occasional", label: "Ocasional" },
  { value: "monthly", label: "Mensal" },
  { value: "annual", label: "Anual" },
]

export const PLANNING_STATUSES: { value: string; label: string }[] = [
  { value: "planned", label: "Planejado" },
  { value: "realized", label: "Realizado" },
]

/**
 * Check if a transaction is part of an installment series
 */
export function isInstallmentTransaction(transaction: Transaction): boolean {
  return !!transaction.installment_group_id
}

/**
 * Get the installment badge text (e.g., "3/12")
 */
export function getInstallmentBadge(transaction: Transaction): string | null {
  if (!transaction.installment_number || !transaction.installment_total) {
    return null
  }
  return `${transaction.installment_number}/${transaction.installment_total}`
}

/**
 * Get remaining installments count
 */
export function getRemainingInstallments(transaction: Transaction): number {
  if (!transaction.installment_number || !transaction.installment_total) {
    return 0
  }
  return transaction.installment_total - transaction.installment_number
}

/**
 * Group transactions by installment series ID
 * Returns map of group_id -> transaction[]
 */
export function groupInstallmentTransactions(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>()

  for (const tx of transactions) {
    if (tx.installment_group_id) {
      const existing = groups.get(tx.installment_group_id) || []
      groups.set(tx.installment_group_id, [...existing, tx])
    }
  }

  return groups
}

/**
 * Process transactions list to avoid duplicate installments:
 * - Group installments by group_id
 * - For each group, show only the "realized" installment
 * - If no "realized", show the first one in the period
 * - Non-installment transactions pass through unchanged
 */
export function filterDisplayedTransactions(
  transactions: Transaction[],
  dateRangeStart?: string,
  dateRangeEnd?: string
): Transaction[] {
  const installmentGroups = groupInstallmentTransactions(transactions)
  const result: Transaction[] = []
  const processedGroupIds = new Set<string>()

  // Process non-installment transactions and select representative from installment groups
  for (const tx of transactions) {
    // Non-installment transaction: include as-is
    if (!tx.installment_group_id) {
      result.push(tx)
      continue
    }

    // Installment transaction: process group once
    if (processedGroupIds.has(tx.installment_group_id)) {
      continue
    }

    processedGroupIds.add(tx.installment_group_id)

    const group = installmentGroups.get(tx.installment_group_id)
    if (!group) continue

    // Sort by installment number
    const sorted = [...group].sort((a, b) => {
      const aNum = a.installment_number || 0
      const bNum = b.installment_number || 0
      return aNum - bNum
    })

    // Prefer "realized" status, fallback to first in period
    let selected = sorted.find(t => t.planning_status === "realized")

    if (!selected && dateRangeStart && dateRangeEnd) {
      // Find first installment within date range
      selected = sorted.find(t => t.date >= dateRangeStart && t.date <= dateRangeEnd)
    }

    if (!selected) {
      // Fallback to first installment in the series
      selected = sorted[0]
    }

    if (selected) {
      result.push(selected)
    }
  }

  return result
}
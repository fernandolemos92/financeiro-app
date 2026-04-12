"use client"

import * as React from "react"

export type TransactionType = "income" | "expense"

export type IncomeType = "fixed" | "variable" | "oscillating"
export type ExpenseNature = "debt" | "cost_of_living" | "pleasure" | "application"
export type Frequency = "monthly" | "annual" | "occasional"
export type PlanningStatus = "planned" | "realized"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  subcategory?: string
  description?: string
  date: string
  createdAt: string
  income_type?: IncomeType
  expense_nature?: ExpenseNature
  frequency?: Frequency
  planning_status?: PlanningStatus
}

export interface Category {
  id: string
  name: string
  icon: string
  subcategories?: SubCategory[]
}

export interface SubCategory {
  id: string
  name: string
  defaultExpenseNature?: ExpenseNature
}

const STORAGE_KEY = "financeiro-app-transactions"

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

const DEFAULT_INCOME_TYPE: IncomeType = "fixed"
const DEFAULT_EXPENSE_NATURE: ExpenseNature = "cost_of_living"
const DEFAULT_FREQUENCY: Frequency = "monthly"
const DEFAULT_PLANNING_STATUS: PlanningStatus = "realized"

function getStoredTransactions(): Transaction[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
}

function normalizeLegacyRecord(record: Partial<Transaction>): Transaction {
  const isIncome = record.type === "income"
  const isExpense = record.type === "expense"
  
  return {
    id: record.id || generateId(),
    type: record.type || "expense",
    amount: record.amount || 0,
    category: record.category || "outros",
    description: record.description,
    date: record.date || new Date().toISOString().split("T")[0],
    createdAt: record.createdAt || new Date().toISOString(),
    income_type: record.income_type ?? (isIncome ? DEFAULT_INCOME_TYPE : undefined),
    expense_nature: record.expense_nature ?? (isExpense ? DEFAULT_EXPENSE_NATURE : undefined),
    frequency: record.frequency ?? DEFAULT_FREQUENCY,
    planning_status: record.planning_status ?? DEFAULT_PLANNING_STATUS,
  }
}

let transactionsSingleton: Transaction[] = []
let isLoadedSingleton = false
let listenersSingleton: Set<(transactions: Transaction[]) => void> = new Set()

function notifyListeners(): void {
  listenersSingleton.forEach(listener => listener(transactionsSingleton))
}

function useTransactionsCore() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(transactionsSingleton)
  const [isLoaded, setIsLoaded] = React.useState(isLoadedSingleton)

  React.useEffect(() => {
    if (!isLoadedSingleton) {
      const stored = getStoredTransactions()
      transactionsSingleton = stored.map(normalizeLegacyRecord)
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
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    saveTransactions(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
    
    return newTransaction
  }, [])
  
  const addTransactionWithSubcategory = React.useCallback((data: Omit<Transaction, "id" | "createdAt" | "subcategory"> & { subcategory: string }) => {
    const newTransaction: Transaction = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    
    transactionsSingleton = [newTransaction, ...transactionsSingleton]
    saveTransactions(transactionsSingleton)
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
    saveTransactions(transactionsSingleton)
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
    saveTransactions(transactionsSingleton)
    notifyListeners()
    forceUpdate(n => n + 1)
  }, [])

  const deleteTransaction = React.useCallback((id: string) => {
    transactionsSingleton = transactionsSingleton.filter((t) => t.id !== id)
    saveTransactions(transactionsSingleton)
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

export const expenseCategories: Category[] = [
  { id: "moradia", name: "Moradia", icon: "🏠", subcategories: [
    { id: "aluguel", name: "Aluguel" },
    { id: "condominio", name: "Condomínio" },
    { id: "agua", name: "Água" },
    { id: "luz", name: "Luz" },
    { id: "gas", name: "Gás" },
    { id: "internet", name: "Internet" },
    { id: "telefone", name: "Telefone" },
    { id: "iptu", name: "IPTU" },
    { id: "manutencao", name: "Manutenção" },
  ]},
  { id: "alimentacao", name: "Alimentação", icon: "🍔", subcategories: [
    { id: "mercado", name: "Mercado" },
    { id: "restaurante", name: "Restaurante" },
    { id: "delivery", name: "Delivery" },
    { id: "lanche_cafe", name: "Lanche/Café" },
  ]},
  { id: "transporte", name: "Transporte", icon: "🚗", subcategories: [
    { id: "combustivel", name: "Combustível" },
    { id: "app_transporte", name: "App de Transporte" },
    { id: "transporte_publico", name: "Transporte Público" },
    { id: "estacionamento_pedagio", name: "Estacionamento/Pedágio" },
    { id: "manutencao_veiculo", name: "Manutenção do Veículo" },
  ]},
  { id: "saude", name: "Saúde", icon: "💊", subcategories: [
    { id: "farmacia", name: "Farmácia" },
    { id: "consulta", name: "Consulta" },
    { id: "exame", name: "Exame" },
    { id: "plano_saude", name: "Plano de Saúde" },
    { id: "terapia", name: "Terapia" },
  ]},
  { id: "lazer", name: "Lazer", icon: "🎬" },
  { id: "outros", name: "Outros", icon: "📦" },
]

export const incomeCategories: Category[] = [
  { id: "salario", name: "Salário", icon: "💰" },
  { id: "freelance", name: "Freelance", icon: "💻" },
  { id: "comissao", name: "Comissão", icon: "📊" },
  { id: "venda", name: "Venda", icon: "🛒" },
  { id: "reembolso", name: "Reembolso", icon: "🔙" },
  { id: "presente", name: "Presente", icon: "🎁" },
  { id: "rendimento", name: "Rendimento", icon: "📈" },
  { id: "aluguel_recebido", name: "Aluguel Recebido", icon: "🏠" },
  { id: "outros_renda", name: "Outros", icon: "📦" },
]

export const categories: Category[] = expenseCategories

export function getSubcategories(categoryId: string): SubCategory[] {
  const category = expenseCategories.find((c) => c.id === categoryId)
  return category?.subcategories || []
}

export function getExpenseCategories(): Category[] {
  return expenseCategories
}

export function getIncomeCategories(): Category[] {
  return incomeCategories
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

export const INCOME_TYPES: { value: IncomeType; label: string }[] = [
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

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "occasional", label: "Ocasional" },
  { value: "monthly", label: "Mensal" },
  { value: "annual", label: "Anual" },
]

export const PLANNING_STATUSES: { value: PlanningStatus; label: string }[] = [
  { value: "planned", label: "Planejado" },
  { value: "realized", label: "Realizado" },
]

export { usePlannedAmounts, calculatePlannedVsActual, checkAllOnTrack } from "./use-planned-amounts"
export type { PlannedAmounts, DeviationState, PlannedVsActualItem } from "./use-planned-amounts"

export type BalanceState = "positive" | "zero_allocation" | "overspent"

export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  committedExpenses: number
  applications: number
  availableBalance: number
  balanceState: BalanceState
  isAllAllocated: boolean
  monthlyProvisionedTotal: number
}

export interface IncomeBreakdown {
  fixed: number
  variable: number
  oscillating: number
}

export interface ExpenseBreakdown {
  debt: number
  cost_of_living: number
  pleasure: number
  application: number
}

export interface MonthlyProvisioning {
  annualExpenses: number
  occasionalExpenses: number
  monthlyImpact: number
}

export function calculateFinancialSummary(transactions: Transaction[], periodStart?: Date, periodEnd?: Date): FinancialSummary {
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
  const balanceState: BalanceState = availableBalance < 0 ? "overspent" : isAllAllocated ? "zero_allocation" : "positive"

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

export function calculateIncomeBreakdown(transactions: Transaction[], periodStart?: Date, periodEnd?: Date): IncomeBreakdown {
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

export function calculateExpenseBreakdown(transactions: Transaction[], periodStart?: Date, periodEnd?: Date): ExpenseBreakdown {
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

function getCategoryById(id: string): Category {
  return [...expenseCategories, ...incomeCategories].find(c => c.id === id) || { id, name: id, icon: "📦" }
}

function getSubcategoryById(id: string): SubCategory | undefined {
  for (const cat of expenseCategories) {
    const sub = cat.subcategories?.find(s => s.id === id)
    if (sub) return sub
  }
  return undefined
}
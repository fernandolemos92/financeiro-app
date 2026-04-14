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
  installment_total?: number
  installment_number?: number
  purchase_total_amount?: number
  installment_group_id?: string
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
  // Campos derivados do Dashboard (composição local)
  reservedInGoals?: number
  availableFreeBalance?: number
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
import { Transaction, IncomeType, ExpenseNature, Frequency, PlanningStatus, Category, SubCategory } from "./types"

const DEFAULT_INCOME_TYPE: IncomeType = "fixed"
const DEFAULT_EXPENSE_NATURE: ExpenseNature = "cost_of_living"
const DEFAULT_FREQUENCY: Frequency = "monthly"
const DEFAULT_PLANNING_STATUS: PlanningStatus = "realized"

export interface NormalizerConfig {
  incomeType: IncomeType
  expenseNature: ExpenseNature
  frequency: Frequency
  planningStatus: PlanningStatus
}

export const defaultNormalizerConfig: NormalizerConfig = {
  incomeType: DEFAULT_INCOME_TYPE,
  expenseNature: DEFAULT_EXPENSE_NATURE,
  frequency: DEFAULT_FREQUENCY,
  planningStatus: DEFAULT_PLANNING_STATUS,
}

export interface TransactionNormalizer {
  normalize(record: Partial<Transaction>): Transaction
}

export function createTransactionNormalizer(config: NormalizerConfig = defaultNormalizerConfig): TransactionNormalizer {
  return {
    normalize(record: Partial<Transaction>): Transaction {
      const isIncome = record.type === "income"
      const isExpense = record.type === "expense"

      return {
        id: record.id || "",
        type: record.type || "expense",
        amount: record.amount || 0,
        category: record.category || "outros",
        subcategory: record.subcategory,
        description: record.description,
        date: record.date || new Date().toISOString().split("T")[0],
        createdAt: record.createdAt || new Date().toISOString(),
        income_type: record.income_type ?? (isIncome ? config.incomeType : undefined),
        expense_nature: record.expense_nature ?? (isExpense ? config.expenseNature : undefined),
        frequency: record.frequency ?? config.frequency,
        planning_status: record.planning_status ?? config.planningStatus,
        // Preserve installment series fields
        installment_number: record.installment_number,
        installment_total: record.installment_total,
        installment_group_id: record.installment_group_id,
        purchase_total_amount: record.purchase_total_amount,
      }
    }
  }
}

export const normalizer = createTransactionNormalizer()

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

export const allCategories: Category[] = [...expenseCategories, ...incomeCategories]

export function getSubcategories(categoryId: string): SubCategory[] {
  const category = expenseCategories.find((c) => c.id === categoryId)
  return category?.subcategories || []
}

export function getCategoryById(id: string): Category {
  return allCategories.find(c => c.id === id) || { id, name: id, icon: "📦" }
}

export function getSubcategoryById(id: string): SubCategory | undefined {
  for (const cat of expenseCategories) {
    const sub = cat.subcategories?.find(s => s.id === id)
    if (sub) return sub
  }
  return undefined
}

export function getExpenseCategoriesList(): Category[] {
  return expenseCategories
}

export function getIncomeCategoriesList(): Category[] {
  return incomeCategories
}
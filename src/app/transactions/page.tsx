"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { PeriodFilter } from "@/components/period-filter"
import { CloseButton } from "@/components/ui/close-button"
import { useTransactions, expenseCategories, incomeCategories, getSubcategories, formatCurrency, formatDate, Transaction, getTransactionTitle, getTransactionSubtitle, isInstallmentTransaction, getInstallmentBadge, getRemainingInstallments, filterDisplayedTransactions, INCOME_TYPES, EXPENSE_NATURES, FREQUENCIES, type ExpenseNature, type Frequency, type IncomeType } from "@/hooks/use-transactions"
import { formatMonetaryInput, parseMonetaryInput } from "@/lib/monetary-formatting"
import { Trash, Pencil, House, ForkKnife, Car, Heart, GameController, Package, Wallet, Briefcase, Coins, ShoppingCart, ArrowCounterClockwise, Gift, TrendUp } from "phosphor-react"

// Legacy aliases for backward compatibility in this file
const formatInputValue = formatMonetaryInput
const parseInputValue = parseMonetaryInput

function getCategoryIcon(categoryId: string, size: number = 24) {
  const iconMap: Record<string, React.ReactNode> = {
    // Expense categories
    moradia: <House size={size} weight="bold" />,
    alimentacao: <ForkKnife size={size} weight="bold" />,
    transporte: <Car size={size} weight="bold" />,
    saude: <Heart size={size} weight="bold" />,
    lazer: <GameController size={size} weight="bold" />,
    outros: <Package size={size} weight="bold" />,
    // Income categories
    salario: <Wallet size={size} weight="bold" />,
    freelance: <Briefcase size={size} weight="bold" />,
    comissao: <Coins size={size} weight="bold" />,
    venda: <ShoppingCart size={size} weight="bold" />,
    reembolso: <ArrowCounterClockwise size={size} weight="bold" />,
    presente: <Gift size={size} weight="bold" />,
    rendimento: <TrendUp size={size} weight="bold" />,
    aluguel_recebido: <House size={size} weight="bold" />,
    outros_renda: <Package size={size} weight="bold" />,
  }
  return iconMap[categoryId] || <Package size={size} weight="bold" />
}


function getAllCategories() {
  return [...expenseCategories, ...incomeCategories]
}

function getCategoryById(id: string) {
  return getAllCategories().find(c => c.id === id) || { id, name: id, icon: "📦" }
}

function DeleteConfirmModal({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  transaction: Transaction | null
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen || !transaction) return null

  const category = getCategoryById(transaction.category)

  return (
    <Modal isOpen={true} onClose={onCancel} className="max-w-sm">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
        Excluir transação?
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tem certeza que deseja excluir a transação &quot;{transaction.description || category.name}&quot;?
        Esta ação não pode ser desfeita.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>
          Excluir
        </Button>
      </div>
    </Modal>
  )
}

function SeriesDeletionConfirmModal({
  isOpen,
  installmentTotal,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  installmentTotal: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Excluir série parcelada?
          </h2>
          <CloseButton onClick={onCancel} className="" />
        </div>

        <p className="text-sm text-foreground">
          Você está prestes a excluir toda a série de <strong>{installmentTotal} parcelas</strong>.
          Esta ação não pode ser desfeita e removerá todas as parcelas desta compra.
        </p>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            Confirmar exclusão
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TransactionDetailModal({
  isOpen,
  transaction,
  onDelete,
  onClose,
  onSave,
  onOpenSeriesDeletionConfirm,
}: {
  isOpen: boolean
  transaction: Transaction | null
  onDelete: (transaction: Transaction) => void
  onClose: () => void
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>
  onOpenSeriesDeletionConfirm?: (installmentTotal: number, groupId: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editDate, setEditDate] = React.useState("")
  const [editCategory, setEditCategory] = React.useState("")
  const [editSubcategory, setEditSubcategory] = React.useState("")
  const [editExpenseNature, setEditExpenseNature] = React.useState<string>("cost_of_living")
  const [editFrequency, setEditFrequency] = React.useState<string>("monthly")
  const [editIncomeType, setEditIncomeType] = React.useState<string>("fixed")

  const category = transaction ? getCategoryById(transaction.category) : null
  const isExpense = transaction?.type === "expense"

  React.useEffect(() => {
    if (transaction) {
      setEditValue(formatInputValue(transaction.amount.toString()))
      setEditDescription(transaction.description || "")
      setEditDate(transaction.date)
      setEditCategory(transaction.category)
      setEditSubcategory(transaction.subcategory || "")
      setEditExpenseNature(transaction.expense_nature || "cost_of_living")
      setEditFrequency(transaction.frequency || "monthly")
      setEditIncomeType(transaction.income_type || "fixed")
      setIsEditing(false)
    }
  }, [transaction, isOpen])

  const subcategories = React.useMemo(() => {
    return isExpense && editCategory ? getSubcategories(editCategory) : []
  }, [isExpense, editCategory])

  const handleSave = async () => {
    if (!transaction) return
    const rawValue = parseInputValue(editValue)
    const newAmount = parseFloat(rawValue.replace(",", "."))
    if (newAmount > 0) {
      try {
        const updatePayload: Partial<Transaction> = {
          amount: newAmount,
          description: editDescription || undefined,
          date: editDate,
          category: editCategory,
          subcategory: editSubcategory || undefined,
          expense_nature: isExpense ? (editExpenseNature as ExpenseNature) : undefined,
          frequency: isExpense ? (editFrequency as Frequency) : undefined,
          income_type: !isExpense ? (editIncomeType as IncomeType) : undefined,
          // Note: installment fields are immutable in this version
        }

        await onSave(transaction.id, updatePayload)
        onClose()
      } catch {
        // error already toasted in handleDetailSave
      }
    }
  }

  const handleViewMode = () => {
    if (!transaction) return
    setEditValue(formatInputValue(transaction.amount.toString()))
    setEditDescription(transaction.description || "")
    setEditDate(transaction.date)
    setEditCategory(transaction.category)
    setEditSubcategory(transaction.subcategory || "")
    setEditExpenseNature(transaction.expense_nature || "cost_of_living")
    setEditFrequency(transaction.frequency || "monthly")
    setEditIncomeType(transaction.income_type || "fixed")
    setIsEditing(false)
  }

  if (!isOpen || !transaction || !category) return null

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-md">
      <div className="p-4 border-b border-border">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Detalhes da Transação
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
            {getCategoryIcon(category.id, 28)}
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">
              {getTransactionTitle(transaction)}
            </p>
            <p className="text-sm text-muted-foreground">
              {getTransactionSubtitle(transaction)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-foreground capitalize">{isExpense ? "Despesa" : "Receita"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            {isEditing ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(formatInputValue(e.target.value))}
                  onBlur={(e) => setEditValue(formatInputValue(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-muted/50 border border-border rounded-lg px-8 py-1 text-foreground font-amount"
                />
              </div>
            ) : (
              <p className={`font-amount font-medium ${isExpense ? "text-red-400" : "text-green-400"}`}>
                {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            {isEditing ? (
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-card border border-border rounded-lg px-2 py-1 text-foreground text-sm w-full"
              />
            ) : (
              <p className="text-foreground">{formatDate(transaction.date)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoria</p>
            {isEditing ? (
              <Select value={editCategory} onValueChange={(value) => { setEditCategory(value || editCategory); setEditSubcategory(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(isExpense ? expenseCategories : incomeCategories).find(c => c.id === editCategory)?.name || editCategory}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(isExpense ? expenseCategories : incomeCategories).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-foreground">{category.name}</p>
            )}
          </div>
          {isExpense && subcategories.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Subcategoria</p>
              {isEditing ? (
                <Select value={editSubcategory} onValueChange={(value) => setEditSubcategory(value || editSubcategory)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {subcategories.find(s => s.id === editSubcategory)?.name || editSubcategory || "Selecione..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-foreground">{transaction.subcategory ? getSubcategories(transaction.category).find(s => s.id === transaction.subcategory)?.name : "-"}</p>
              )}
            </div>
          )}
          {isExpense && (
<>
              <div>
                <p className="text-xs text-muted-foreground">Natureza</p>
                {isEditing ? (
                  <Select value={editExpenseNature} onValueChange={(value) => setEditExpenseNature((value || editExpenseNature) as ExpenseNature)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {EXPENSE_NATURES.find(t => t.value === editExpenseNature)?.label || editExpenseNature}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_NATURES.map((en) => (
                        <SelectItem key={en.value} value={en.value}>{en.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground">
                    {EXPENSE_NATURES.find(t => t.value === transaction.expense_nature)?.label || transaction.expense_nature}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequência</p>
                {isEditing ? (
                  <Select value={editFrequency} onValueChange={(value) => setEditFrequency((value || editFrequency) as Frequency)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {FREQUENCIES.find(t => t.value === editFrequency)?.label || editFrequency}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground">
                    {FREQUENCIES.find(t => t.value === transaction.frequency)?.label || transaction.frequency}
                  </p>
                )}
              </div>
            </>
          )}
          {!isExpense && (
            <div>
              <p className="text-xs text-muted-foreground">Tipo de Renda</p>
              {isEditing ? (
                <Select value={editIncomeType} onValueChange={(value) => setEditIncomeType((value || editIncomeType) as IncomeType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {INCOME_TYPES.find(t => t.value === editIncomeType)?.label || editIncomeType}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_TYPES.map((it) => (
                      <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-foreground">
                  {INCOME_TYPES.find(t => t.value === transaction.income_type)?.label || transaction.income_type}
                </p>
              )}
            </div>
          )}
          {isExpense && transaction.installment_group_id && (
            <>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-2">
                  🔗 Compra Parcelada
                </p>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Parcela</p>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.installment_number} de {transaction.installment_total}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor desta parcela</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  {transaction.purchase_total_amount && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor total da compra</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(transaction.purchase_total_amount)}
                      </p>
                    </div>
                  )}
                  {transaction.installment_total && transaction.installment_number && transaction.installment_total > transaction.installment_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Restam</p>
                      <p className="text-sm font-medium text-foreground">
                        {transaction.installment_total - transaction.installment_number} parcela{transaction.installment_total - transaction.installment_number !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground mt-2 border-t border-primary/20 pt-2">
                      Edição individual. Para gerenciar a série, veja todas as parcelas.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Descrição</p>
          {isEditing ? (
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground mt-1"
            />
          ) : (
            <p className="text-foreground">{transaction.description || "-"}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="p-4 space-y-3">
          {isEditing ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleViewMode}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          ) : (
            <>
              {/* Actions for this installment */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">DESTA PARCELA</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setIsEditing(true)}>
                    <Pencil size={14} className="mr-1.5" />
                    Editar
                  </Button>
                  <Button variant="outline" className="flex-1 text-sm text-destructive hover:text-destructive" onClick={() => onDelete(transaction)}>
                    <Trash size={14} className="mr-1.5" />
                    Excluir
                  </Button>
                </div>
              </div>

              {/* Series-level actions for parcelado */}
              {transaction.installment_group_id && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">DA SÉRIE INTEIRA</p>
                  <Button
                    variant="outline"
                    className="w-full text-sm text-destructive hover:text-destructive"
                    onClick={() => {
                      if (onOpenSeriesDeletionConfirm && transaction.installment_total && transaction.installment_group_id) {
                        onOpenSeriesDeletionConfirm(transaction.installment_total, transaction.installment_group_id)
                      }
                    }}
                  >
                    <Trash size={14} className="mr-1.5" />
                    Excluir todas as {transaction.installment_total} parcelas
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

type Period = "day" | "week" | "month" | "all"

const periods: { value: Period; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "all", label: "Todas" },
]

function getPeriodDates(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (period === "day") {
    // Today
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === "week") {
    // This week (Sunday to Saturday)
    const dayOfWeek = start.getDay()
    const diff = start.getDate() - dayOfWeek
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    end.setDate(diff + 6)
    end.setHours(23, 59, 59, 999)
  } else if (period === "month") {
    // This month
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(now.getMonth() + 1)
    end.setDate(0)
    end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function TransactionsPage() {
  const { transactions, isLoaded, deleteTransaction, updateTransaction, deleteInstallmentSeries } = useTransactions()

  const [period, setPeriod] = React.useState<Period>("month")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")

  // Update dates when period changes
  React.useEffect(() => {
    if (period === "all") {
      // Show all transactions, no date filter
      setStartDate("")
      setEndDate("")
    } else {
      const { start, end } = getPeriodDates(period)
      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(end))
    }
  }, [period])
  
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean
    transaction: Transaction | null
  }>({ isOpen: false, transaction: null })

  const [detailModal, setDetailModal] = React.useState<{
    isOpen: boolean
    transaction: Transaction | null
  }>({ isOpen: false, transaction: null })

  const [seriesDeletionConfirm, setSeriesDeletionConfirm] = React.useState<{
    isOpen: boolean
    installmentTotal: number
    groupId: string | null
  }>({ isOpen: false, installmentTotal: 0, groupId: null })

  // Get nature filter from URL if present
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const filterNature = searchParams.get('nature')

  const filteredTransactions = React.useMemo(() => {
    if (!isLoaded) return []

    // First apply basic filters
    const basicFiltered = transactions.filter((t) => {
      // Search filter (case-insensitive)
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesDescription = t.description?.toLowerCase().includes(searchLower)
        const matchesCategory = getCategoryById(t.category).name.toLowerCase().includes(searchLower)
        if (!matchesDescription && !matchesCategory) return false
      }

      // Category filter
      if (selectedCategory !== "all" && t.category !== selectedCategory) {
        return false
      }

      // Date range filter
      if (startDate && t.date < startDate) return false
      if (endDate && t.date > endDate) return false

      return true
    })

    // Then apply installment grouping to avoid duplicate parcelas
    return filterDisplayedTransactions(basicFiltered, startDate || undefined, endDate || undefined)
  }, [transactions, isLoaded, searchQuery, selectedCategory, startDate, endDate])

  const handleDeleteClick = (transaction: Transaction) => {
    setDeleteModal({ isOpen: true, transaction })
  }

  const handleConfirmDelete = async () => {
    if (deleteModal.transaction) {
      try {
        await deleteTransaction(deleteModal.transaction.id)
        toast.success("Transação excluída com sucesso")
        setDetailModal({ isOpen: false, transaction: null })
      } catch {
        toast.error("Erro ao excluir transação")
      }
    }
    setDeleteModal({ isOpen: false, transaction: null })
  }

  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, transaction: null })
  }

  const handleRowClick = (transaction: Transaction) => {
    setDetailModal({ isOpen: true, transaction })
  }

  const handleDetailDelete = (transaction: Transaction) => {
    deleteTransaction(transaction.id)
    setDetailModal({ isOpen: false, transaction: null })
    toast.success("Transação excluída com sucesso")
  }

  const handleDetailClose = () => {
    setDetailModal({ isOpen: false, transaction: null })
  }

  const handleDetailSave = async (id: string, updates: Partial<Transaction>) => {
    try {
      await updateTransaction(id, updates)
      toast.success("Transação atualizada com sucesso")
      setDetailModal({ isOpen: false, transaction: null })
    } catch {
      toast.error("Erro ao atualizar transação")
    }
  }

  const handleOpenSeriesDeletionConfirm = (installmentTotal: number, groupId: string) => {
    setSeriesDeletionConfirm({ isOpen: true, installmentTotal, groupId })
  }

  const handleConfirmSeriesDeletion = async () => {
    if (seriesDeletionConfirm.groupId) {
      try {
        const result = await deleteInstallmentSeries(seriesDeletionConfirm.groupId)
        toast.success(`Série parcelada excluída\n${result.deletedCount} parcelas removidas`)
        setSeriesDeletionConfirm({ isOpen: false, installmentTotal: 0, groupId: null })
        setDetailModal({ isOpen: false, transaction: null })
      } catch {
        toast.error("Erro ao deletar série parcelada")
      }
    }
  }

  const handleCancelSeriesDeletion = () => {
    setSeriesDeletionConfirm({ isOpen: false, installmentTotal: 0, groupId: null })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setPeriod("month")
  }

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Transações</h1>
          <p className="mt-1 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Transações</h1>
        <p className="mt-1 text-muted-foreground">
          {filterNature
            ? `Mostrando todas as transações de ${filterNature === 'debt' ? 'Dívidas' : filterNature === 'cost_of_living' ? 'Custo de Vida' : filterNature === 'pleasure' ? 'Prazer' : filterNature === 'application' ? 'Alocações' : 'Despesas'}`
            : 'Histórico completo de transações'
          }
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card"
            />
          </div>
        </div>

        {/* Period Filter */}
        <PeriodFilter
          periods={periods}
          value={period}
          onChange={(value) => setPeriod(value as Period)}
        />

        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value || "all")}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {selectedCategory === "all" 
                  ? "Todas as categorias" 
                  : getAllCategories().find(c => c.id === selectedCategory)?.name || selectedCategory}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {getAllCategories().map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 bg-card"
              aria-label="Data inicial"
            />
            <span className="text-muted-foreground">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 bg-card"
              aria-label="Data final"
            />
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedCategory !== "all" || period !== "month") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredTransactions.length === 0
              ? "Nenhuma transação encontrada"
              : filteredTransactions.length === 1
              ? "1 transação"
              : `${filteredTransactions.length} transações`}
          </CardTitle>
        </CardHeader>
        
        {filteredTransactions.length === 0 ? (
          <CardContent className="py-8 text-center text-muted-foreground">
            {transactions.length === 0
              ? "Nenhuma transação cadastrada. Adicione uma transação pelo dashboard!"
              : "Nenhum resultado para os filtros selecionados."}
          </CardContent>
        ) : (
          <CardContent className="space-y-0">
            {filteredTransactions.map((transaction) => {
              const category = getCategoryById(transaction.category)
              const isExpense = transaction.type === "expense"
              const title = getTransactionTitle(transaction)
              const baseSubtitle = getTransactionSubtitle(transaction)

              // Check if transaction is parcelado
              const isInstallment = isInstallmentTransaction(transaction)
              const installmentBadge = isInstallment ? getInstallmentBadge(transaction) : null
              const remainingInstallments = isInstallment ? getRemainingInstallments(transaction) : 0

              // Get nature label if expense
              const getNatureLabel = () => {
                if (!isExpense || !transaction.expense_nature) return null
                const natures: Record<string, string> = {
                  'debt': 'Dívidas',
                  'cost_of_living': 'Custo de Vida',
                  'pleasure': 'Prazer',
                  'application': 'Alocações'
                }
                return natures[transaction.expense_nature] || transaction.expense_nature
              }

              const natureLabel = getNatureLabel()

              // Build subtitle: include nature, parcelamento info, and category/subcategory
              const buildSubtitle = () => {
                const parts = []

                // Add nature if expense
                if (natureLabel) {
                  parts.push(natureLabel)
                }

                // Add parcelado info if applicable
                if (isInstallment && installmentBadge) {
                  parts.push(`Parcela ${installmentBadge}`)
                } else {
                  // Add category/subcategory only if not parcelado (parcelado already shows in parts)
                  parts.push(baseSubtitle)
                }

                return parts.join(' · ')
              }

              const subtitle = buildSubtitle()

              return (
                <div
                  key={transaction.id}
                  onClick={() => handleRowClick(transaction)}
                  className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 text-secondary">
                      {getCategoryIcon(category.id, 20)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{subtitle}</span>
                        {isInstallment && remainingInstallments > 0 && (
                          <span className="inline-block px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium">
                            Restam {remainingInstallments}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-amount font-medium ${isExpense ? "text-red-400" : "text-green-400"}`}>
                        {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(transaction)
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Excluir transação"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        )}
      </Card>

      <TransactionDetailModal
        isOpen={detailModal.isOpen}
        transaction={detailModal.transaction}
        onDelete={handleDetailDelete}
        onClose={handleDetailClose}
        onSave={handleDetailSave}
        onOpenSeriesDeletionConfirm={handleOpenSeriesDeletionConfirm}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        transaction={deleteModal.transaction}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <SeriesDeletionConfirmModal
        isOpen={seriesDeletionConfirm.isOpen}
        installmentTotal={seriesDeletionConfirm.installmentTotal}
        onConfirm={handleConfirmSeriesDeletion}
        onCancel={handleCancelSeriesDeletion}
      />
    </div>
  )
}
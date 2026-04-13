"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useTransactions, expenseCategories, incomeCategories, getSubcategories, formatCurrency, formatDate, Transaction, getTransactionTitle, getTransactionSubtitle, INCOME_TYPES, EXPENSE_NATURES, FREQUENCIES } from "@/hooks/use-transactions"

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 3.809a1.245 1.245 0 0 1 1.761 1.763l-9.2 9.2a2.4 2.4 0 0 1-.702.459l-3.036.911a.48.48 0 0 1-.616-.616l.911-3.036a2.4 2.4 0 0 1 .459-.702l9.2-9.2Z" />
    </svg>
  )
}

function formatInputValue(value: string): string {
  const numbers = value.replace(/\D/g, "")
  if (!numbers) return ""
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function parseInputValue(value: string): string {
  return value.replace(/\./g, "")
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
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
        Tem certeza que deseja excluir a transação "{transaction.description || category.name}"?
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

function TransactionDetailModal({
  isOpen,
  transaction,
  onEdit,
  onDelete,
  onClose,
  onSave,
}: {
  isOpen: boolean
  transaction: Transaction | null
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onClose: () => void
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>
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
        await onSave(transaction.id, {
          amount: newAmount,
          description: editDescription || undefined,
          date: editDate,
          category: editCategory,
          subcategory: editSubcategory || undefined,
          expense_nature: isExpense ? editExpenseNature as any : undefined,
          frequency: isExpense ? editFrequency as any : undefined,
          income_type: !isExpense ? editIncomeType as any : undefined,
        })
        onClose()
      } catch {
        // error already toasted in handleDetailSave
      }
    }
  }

  const handleCancelEdit = () => {
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
    onClose()
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
          <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
            <span className="text-2xl">{category.icon}</span>
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
                  <Select value={editExpenseNature} onValueChange={(value) => setEditExpenseNature((value || editExpenseNature) as any)}>
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
                  <Select value={editFrequency} onValueChange={(value) => setEditFrequency((value || editFrequency) as any)}>
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
                <Select value={editIncomeType} onValueChange={(value) => setEditIncomeType((value || editIncomeType) as any)}>
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

      <div className="p-4 border-t border-border flex gap-3">
        {isEditing ? (
          <>
            <Button variant="outline" className="flex-1" onClick={handleViewMode}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Salvar
            </Button>
          </>
        ) : (
          <>
            <Button className="flex-1" onClick={() => setIsEditing(true)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => onDelete(transaction)}>
              <TrashIcon className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}

export default function TransactionsPage() {
  const { transactions, isLoaded, deleteTransaction, updateTransaction } = useTransactions()
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean
    transaction: Transaction | null
  }>({ isOpen: false, transaction: null })

  const [detailModal, setDetailModal] = React.useState<{
    isOpen: boolean
    transaction: Transaction | null
  }>({ isOpen: false, transaction: null })

  const filteredTransactions = React.useMemo(() => {
    if (!isLoaded) return []

    return transactions.filter((t) => {
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

  const handleDetailEdit = (transaction: Transaction) => {
    setDetailModal({ isOpen: true, transaction })
  }

  const handleStartEdit = () => {
    // O modal já está aberto com a transação, o modo de edição será ativado internamente
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

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setStartDate("")
    setEndDate("")
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
        <p className="mt-1 text-muted-foreground">Histórico completo de transações</p>
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
          {(searchQuery || selectedCategory !== "all" || startDate || endDate) && (
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
              const subtitle = getTransactionSubtitle(transaction)
              
              return (
                <div
                  key={transaction.id}
                  onClick={() => handleRowClick(transaction)}
                  className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{category.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subtitle}
                      </p>
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
                      <TrashIcon className="h-4 w-4" />
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
        onEdit={handleDetailEdit}
        onDelete={handleDetailDelete}
        onClose={handleDetailClose}
        onSave={handleDetailSave}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        transaction={deleteModal.transaction}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}
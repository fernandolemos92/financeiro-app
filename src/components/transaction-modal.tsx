"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CloseButton } from "@/components/ui/close-button"
import { TransactionType, IncomeType, ExpenseNature, Frequency, getExpenseCategories, getIncomeCategories, getSubcategories, INCOME_TYPES, EXPENSE_NATURES, FREQUENCIES } from "@/hooks/use-transactions"

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    type: TransactionType
    amount: number
    category: string
    subcategory?: string
    description?: string
    date: string
    income_type?: IncomeType
    expense_nature?: ExpenseNature
    frequency?: Frequency
  }) => void
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
  const [type, setType] = React.useState<TransactionType>("expense")
  const [amount, setAmount] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [subcategory, setSubcategory] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [errors, setErrors] = React.useState<{ amount?: string; category?: string }>({})
  
  const [incomeType, setIncomeType] = React.useState<IncomeType>("fixed")
  const [expenseNature, setExpenseNature] = React.useState<ExpenseNature>("cost_of_living")
  const [frequency, setFrequency] = React.useState<Frequency>("occasional")

  const displayedCategories = React.useMemo(() => {
    return type === "income" ? getIncomeCategories() : getExpenseCategories()
  }, [type])

  const subcategories = React.useMemo(() => {
    return type === "expense" && category ? getSubcategories(category) : []
  }, [type, category])

  React.useEffect(() => {
    setSubcategory("")
  }, [category])

  React.useEffect(() => {
    if (type === "income") {
      setCategory("")
      setSubcategory("")
    } else {
      setIncomeType("fixed")
    }
  }, [type])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setAmount(value)
    setErrors((prev) => ({ ...prev, amount: "" }))
  }

  const handleCategorySelect = (categoryId: string) => {
    setCategory(categoryId)
    setErrors((prev) => ({ ...prev, category: "" }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { amount?: string; category?: string } = {}
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Digite um valor válido"
    }
    if (!category) {
      newErrors.category = "Selecione uma categoria"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const transactionData = {
      type,
      amount: parseFloat(amount) / 100,
      category,
      description: description || undefined,
      date,
    }

    if (type === "income") {
      onAdd({
        ...transactionData,
        income_type: incomeType,
      })
    } else {
      onAdd({
        ...transactionData,
        subcategory: subcategory || undefined,
        expense_nature: expenseNature,
        frequency,
      })
    }

    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      resetForm()
      onClose()
    }, 1500)
  }

  const resetForm = () => {
    setType("expense")
    setAmount("")
    setCategory("")
    setSubcategory("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setIncomeType("fixed")
    setExpenseNature("cost_of_living")
    setFrequency("monthly")
    setErrors({})
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => handleOpenChange(false)}
      />
      
      <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 id="modal-title" className="font-heading text-xl font-semibold text-foreground">
            Nova Transação
          </h2>
          <CloseButton onClick={() => handleOpenChange(false)} />
        </div>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">Transação salva!</p>
            <p className="text-sm text-muted-foreground">Sua transação foi adicionada com sucesso.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2" role="tablist" aria-label="Tipo de transação">
              <button
                type="button"
                role="tab"
                aria-selected={type === "expense"}
                onClick={() => setType("expense")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  type === "expense"
                    ? "bg-destructive/20 text-destructive border border-destructive/40"
                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={type === "income"}
                onClick={() => setType("income")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  type === "income"
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                }`}
              >
                Receita
              </button>
            </div>

            {/* Income Type - Only for Income */}
            {type === "income" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tipo de Renda
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INCOME_TYPES.map((it) => (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => setIncomeType(it.value)}
                      className={`p-3 rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                        incomeType === it.value
                          ? "bg-primary/20 border-primary/40"
                          : "bg-muted/50 border-transparent hover:bg-muted"
                      }`}
                    >
                      <span className="text-xs text-foreground block">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium text-foreground">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  value={amount ? (parseInt(amount) / 100).toFixed(2).replace(".", ",") : ""}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  className={`pl-10 pr-3 font-amount text-lg truncate ${errors.amount ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? "amount-error" : undefined}
                />
              </div>
              {errors.amount && (
                <p id="amount-error" className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            {/* Category Grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Categoria
              </label>
              <div className="grid grid-cols-3 gap-2">
                {displayedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`p-3 rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                      category === cat.id
                        ? "bg-primary/20 border-primary/40"
                        : "bg-muted/50 border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <span className="text-xs text-foreground">{cat.name}</span>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            {/* Subcategory - Only for Expenses with subcategories in allowed categories */}
            {type === "expense" && subcategories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Subcategoria
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategory(sub.id)}
                      className={`p-2 rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                        subcategory === sub.id
                          ? "bg-primary/20 border-primary/40"
                          : "bg-muted/50 border-transparent hover:bg-muted"
                      }`}
                    >
                      <span className="text-xs text-foreground">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expense Nature - Only for Expenses */}
            {type === "expense" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Natureza da Despesa
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPENSE_NATURES.map((en) => (
                      <button
                        key={en.value}
                        type="button"
                        onClick={() => setExpenseNature(en.value)}
                        className={`p-2 rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                          expenseNature === en.value
                            ? "bg-primary/20 border-primary/40"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs text-foreground">{en.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Frequência
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FREQUENCIES.map((freq) => (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setFrequency(freq.value)}
                        className={`p-2 rounded-lg border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                          frequency === freq.value
                            ? "bg-primary/20 border-primary/40"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        }`}
                      >
                        <span className="text-xs text-foreground">{freq.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Optional Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Descrição (opcional)
              </label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Almoço no restaurant"
                className="bg-muted/50"
              />
            </div>

            {/* Optional Date */}
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-foreground">
                Data (opcional)
              </label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-muted/50"
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg">
              Adicionar Transação
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
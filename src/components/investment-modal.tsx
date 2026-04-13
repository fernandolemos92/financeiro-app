"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal, ModalLarge } from "@/components/ui/modal"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Investment, investmentTypes } from "@/hooks/use-investments"

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    name: string
    type: Investment["type"]
    amount: number
    date: string
    expectedReturn: number
  }) => void
  editingInvestment?: Investment | null
  onUpdate?: (id: string, data: {
    name?: string
    type?: Investment["type"]
    amount?: number
    date?: string
    expectedReturn?: number
  }) => void
}

export function InvestmentModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  editingInvestment,
  onUpdate 
}: InvestmentModalProps) {
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<Investment["type"]>("renda_fixa")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState("")
  const [expectedReturn, setExpectedReturn] = React.useState("")
  const [errors, setErrors] = React.useState<{
    name?: string
    amount?: string
    date?: string
  }>({})

  React.useEffect(() => {
    if (editingInvestment) {
      setName(editingInvestment.name)
      setType(editingInvestment.type)
      setAmount(editingInvestment.amount.toString())
      setDate(editingInvestment.date)
      setExpectedReturn(editingInvestment.expectedReturn.toString())
    } else {
      setName("")
      setType("renda_fixa")
      setAmount("")
      setDate("")
      setExpectedReturn("")
    }
    setErrors({})
  }, [editingInvestment, isOpen])

  const formatDisplayValue = (value: string): string => {
    const numericValue = parseFloat(value || "0")
    if (numericValue === 0) return ""
    return numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setAmount(value)
    setErrors((prev) => ({ ...prev, amount: "" }))
  }

  const displayValue = amount ? formatDisplayValue(amount) : ""

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { name?: string; amount?: string; date?: string } = {}
    if (!name.trim()) {
      newErrors.name = "Digite um nome para o investimento"
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Digite um valor válido"
    }
    if (!date) {
      newErrors.date = "Selecione uma data"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const data = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      date,
      expectedReturn: parseFloat(expectedReturn.replace(",", ".")) || 0,
    }

    if (editingInvestment && onUpdate) {
      onUpdate(editingInvestment.id, data)
    } else {
      onAdd(data)
    }

    handleClose()
  }

  const handleClose = () => {
    setName("")
    setType("renda_fixa")
    setAmount("")
    setDate("")
    setExpectedReturn("")
    setErrors({})
    onClose()
  }

  return (
    <ModalLarge isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {editingInvestment ? "Editar Investimento" : "Novo Investimento"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="investment-name" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <Input
              id="investment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tesouro Direto"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="investment-type" className="text-sm font-medium text-foreground">
              Tipo
            </label>
            <Select value={type} onValueChange={(value) => setType((value || type) as Investment["type"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {investmentTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="investment-amount" className="text-sm font-medium text-foreground">
              Valor investido (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="investment-amount"
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleAmountChange}
                placeholder="0,00"
                className={`pl-10 font-amount ${errors.amount ? "border-destructive" : ""}`}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="investment-date" className="text-sm font-medium text-foreground">
              Data do investimento
            </label>
            <Input
              id="investment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? "border-destructive" : ""}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="investment-return" className="text-sm font-medium text-foreground">
              Retorno esperado (% ao ano)
            </label>
            <Input
              id="investment-return"
              type="text"
              inputMode="decimal"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="Ex: 10"
              className="font-amount"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingInvestment ? "Salvar" : "Adicionar"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </ModalLarge>
  )
}
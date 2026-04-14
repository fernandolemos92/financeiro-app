"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal, ModalLarge } from "@/components/ui/modal"
import { CloseButton } from "@/components/ui/close-button"
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
    currentValue?: number
    proventos?: number
  }) => void
  editingInvestment?: Investment | null
  onUpdate?: (id: string, data: {
    name?: string
    type?: Investment["type"]
    amount?: number
    date?: string
    expectedReturn?: number
    currentValue?: number
    proventos?: number
  }) => void
}

const GROUP_A_TYPES: Investment["type"][] = ["renda_fixa", "previdencia"]

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
  const [currentValue, setCurrentValue] = React.useState("")
  const [proventos, setProventos] = React.useState("")
  const [errors, setErrors] = React.useState<{
    name?: string
    amount?: string
    date?: string
    expectedReturn?: string
  }>({})

  React.useEffect(() => {
    if (editingInvestment) {
      setName(editingInvestment.name)
      setType(editingInvestment.type)
      setAmount(editingInvestment.amount.toString())
      setDate(editingInvestment.date)
      setExpectedReturn(editingInvestment.expectedReturn.toString())
      setCurrentValue(editingInvestment.currentValue?.toString() || "")
      setProventos(editingInvestment.proventos?.toString() || "")
    } else {
      setName("")
      setType("renda_fixa")
      setAmount("")
      setDate("")
      setExpectedReturn("")
      setCurrentValue("")
      setProventos("")
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

  const handleCurrentValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setCurrentValue(value)
  }

  const handleProventosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setProventos(value)
  }

  const displayValue = amount ? formatDisplayValue(amount) : ""
  const displayCurrentValue = currentValue ? formatDisplayValue(currentValue) : ""
  const displayProventos = proventos ? formatDisplayValue(proventos) : ""

  const isGroupA = GROUP_A_TYPES.includes(type)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { name?: string; amount?: string; date?: string; expectedReturn?: string } = {}

    if (!name.trim()) {
      newErrors.name = "Digite um nome para o investimento"
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Digite um valor válido"
    }
    if (!date) {
      newErrors.date = "Selecione uma data"
    }

    if (isGroupA && !expectedReturn) {
      newErrors.expectedReturn = "Digite a taxa esperada para este tipo de investimento"
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
      currentValue: currentValue ? parseFloat(currentValue) : undefined,
      proventos: proventos ? parseFloat(proventos) : undefined,
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
    setCurrentValue("")
    setProventos("")
    setErrors({})
    onClose()
  }

  return (
    <ModalLarge isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {editingInvestment ? "Editar Investimento" : "Novo Investimento"}
          </h2>
          <CloseButton onClick={handleClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="investment-name" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <Input
              id="investment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tesouro Direto, Ações, Fundo Imobiliário"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="investment-type" className="text-sm font-medium text-foreground">
              Tipo de Investimento
            </label>
            <Select value={type} onValueChange={(value) => {
              setType((value || type) as Investment["type"])
              if (!GROUP_A_TYPES.includes((value || type) as Investment["type"])) {
                setExpectedReturn("")
              }
              setErrors((prev) => ({ ...prev, expectedReturn: "" }))
            }}>
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

          {/* Taxa esperada - Obrigatória para Grupo A */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="investment-return" className="text-sm font-medium text-foreground">
                {isGroupA ? "Taxa esperada (% ao ano)" : "Retorno esperado (% ao ano)"}
              </label>
              {!isGroupA && (
                <span className="text-xs text-muted-foreground">(opcional)</span>
              )}
            </div>
            <Input
              id="investment-return"
              type="text"
              inputMode="decimal"
              value={expectedReturn}
              onChange={(e) => {
                setExpectedReturn(e.target.value.replace(/[^0-9.,]/g, ""))
                setErrors((prev) => ({ ...prev, expectedReturn: "" }))
              }}
              placeholder="Ex: 10"
              className={`font-amount ${errors.expectedReturn ? "border-destructive" : ""}`}
            />
            {isGroupA ? (
              <p className="text-xs text-muted-foreground">
                Taxa anual para cálculo de rentabilidade estimada
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Apenas para referência; não afeta cálculos de mercado
              </p>
            )}
            {errors.expectedReturn && (
              <p className="text-sm text-destructive">{errors.expectedReturn}</p>
            )}
          </div>

          {/* Valor atual - Apenas para Grupo B */}
          {!isGroupA && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="investment-current-value" className="text-sm font-medium text-foreground">
                  Valor atual (R$)
                </label>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="investment-current-value"
                  type="text"
                  inputMode="decimal"
                  value={displayCurrentValue}
                  onChange={handleCurrentValueChange}
                  placeholder="0,00"
                  className="pl-10 font-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Atualize conforme o preço de mercado mudar
              </p>
            </div>
          )}

          {/* Proventos - Opcional para Grupo B */}
          {!isGroupA && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="investment-proventos" className="text-sm font-medium text-foreground">
                  Proventos recebidos (R$)
                </label>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="investment-proventos"
                  type="text"
                  inputMode="decimal"
                  value={displayProventos}
                  onChange={handleProventosChange}
                  placeholder="0,00"
                  className="pl-10 font-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Dividendos, JCP, rendimentos acumulados recebidos
              </p>
            </div>
          )}

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

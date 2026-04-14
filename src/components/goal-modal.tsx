"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { CloseButton } from "@/components/ui/close-button"
import { formatInputValue, parseInputValue } from "@/hooks/use-goals"

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: { name: string; targetAmount: number; deadline: string }) => void
}

export function GoalModal({ isOpen, onClose, onAdd }: GoalModalProps) {
  const [name, setName] = React.useState("")
  const [targetAmount, setTargetAmount] = React.useState("")
  const [deadline, setDeadline] = React.useState("")
  const [errors, setErrors] = React.useState<{ name?: string; target?: string; deadline?: string }>({})

  React.useEffect(() => {
    if (!isOpen) {
      setName("")
      setTargetAmount("")
      setDeadline("")
      setErrors({})
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { name?: string; target?: string; deadline?: string } = {}
    if (!name.trim()) {
      newErrors.name = "Digite um nome para a meta"
    }
    const rawValue = parseInputValue(targetAmount)
    const parsedAmount = parseFloat(rawValue.replace(",", "."))
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.target = "Digite um valor válido"
    }
    if (!deadline) {
      newErrors.deadline = "Selecione uma data"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onAdd({
      name: name.trim(),
      targetAmount: parsedAmount,
      deadline,
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Nova Meta
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="goal-name" className="text-sm font-medium text-foreground">
              Nome da meta
            </label>
            <Input
              id="goal-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: "" }))
              }}
              placeholder="Ex: Viagem para Fernando de Noronha"
              className={errors.name ? "border-destructive" : ""}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-amount" className="text-sm font-medium text-foreground">
              Valor alvo
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="goal-amount"
                type="text"
                inputMode="numeric"
                value={targetAmount}
                onChange={(e) => {
                  setTargetAmount(formatInputValue(e.target.value))
                  setErrors((prev) => ({ ...prev, target: "" }))
                }}
                onBlur={(e) => setTargetAmount(formatInputValue(e.target.value))}
                placeholder="0,00"
                className={`pl-10 pr-3 font-amount truncate ${errors.target ? "border-destructive" : ""}`}
                aria-invalid={!!errors.target}
              />
            </div>
            {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-deadline" className="text-sm font-medium text-foreground">
              Prazo
            </label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value)
                setErrors((prev) => ({ ...prev, deadline: "" }))
              }}
              className={errors.deadline ? "border-destructive" : ""}
              aria-invalid={!!errors.deadline}
            />
            {errors.deadline && <p className="text-sm text-destructive">{errors.deadline}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg">
            Criar Meta
          </Button>
        </form>
      </div>
    </Modal>
  )
}
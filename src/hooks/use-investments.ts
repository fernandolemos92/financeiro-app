"use client"

import * as React from "react"

export interface Investment {
  id: string
  name: string
  type: "renda_fixa" | "renda_variavel" | "previdencia" | "imobiliario" | "outros"
  amount: number
  date: string
  expectedReturn: number
  createdAt: string
}

const STORAGE_KEY = "financeiro-app-investments"

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function getStoredInvestments(): Investment[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

function saveInvestments(investments: Investment[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(investments))
}

export function useInvestments() {
  const [investments, setInvestments] = React.useState<Investment[]>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    setInvestments(getStoredInvestments())
    setIsLoaded(true)
  }, [])

  const addInvestment = React.useCallback((data: {
    name: string
    type: Investment["type"]
    amount: number
    date: string
    expectedReturn: number
  }) => {
    const newInvestment: Investment = {
      id: generateId(),
      name: data.name,
      type: data.type,
      amount: data.amount,
      date: data.date,
      expectedReturn: data.expectedReturn,
      createdAt: new Date().toISOString(),
    }

    setInvestments((prev) => {
      const updated = [newInvestment, ...prev]
      saveInvestments(updated)
      return updated
    })
  }, [])

  const updateInvestment = React.useCallback((id: string, data: {
    name?: string
    type?: Investment["type"]
    amount?: number
    date?: string
    expectedReturn?: number
  }) => {
    setInvestments((prev) => {
      const updated = prev.map((inv) => 
        inv.id === id ? { ...inv, ...data } : inv
      )
      saveInvestments(updated)
      return updated
    })
  }, [])

  const deleteInvestment = React.useCallback((id: string) => {
    setInvestments((prev) => {
      const updated = prev.filter((inv) => inv.id !== id)
      saveInvestments(updated)
      return updated
    })
  }, [])

  const totalInvested = React.useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.amount, 0)
  }, [investments])

  const distributionByType = React.useMemo(() => {
    const dist: Record<string, number> = {}
    investments.forEach((inv) => {
      dist[inv.type] = (dist[inv.type] || 0) + inv.amount
    })
    return dist
  }, [investments])

  const calculateExpectedValue = React.useCallback((investment: Investment): number => {
    const investmentDate = new Date(investment.date)
    const now = new Date()
    const monthsElapsed = (now.getFullYear() - investmentDate.getFullYear()) * 12 + 
                          (now.getMonth() - investmentDate.getMonth())
    const yearsElapsed = monthsElapsed / 12
    
    if (yearsElapsed <= 0) return investment.amount
    
    const monthlyRate = investment.expectedReturn / 100 / 12
    const expectedValue = investment.amount * Math.pow(1 + monthlyRate, monthsElapsed)
    return expectedValue
  }, [])

  const totalExpectedValue = React.useMemo(() => {
    return investments.reduce((sum, inv) => sum + calculateExpectedValue(inv), 0)
  }, [investments, calculateExpectedValue])

  const totalGainLoss = React.useMemo(() => {
    return totalExpectedValue - totalInvested
  }, [totalExpectedValue, totalInvested])

  const gainLossPercentage = React.useMemo(() => {
    if (totalInvested === 0) return 0
    return (totalGainLoss / totalInvested) * 100
  }, [totalGainLoss, totalInvested])

  return {
    investments,
    isLoaded,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    totalInvested,
    distributionByType,
    totalExpectedValue,
    totalGainLoss,
    gainLossPercentage,
  }
}

export const investmentTypeLabels: Record<Investment["type"], string> = {
  renda_fixa: "Renda Fixa",
  renda_variavel: "Renda Variável",
  previdencia: "Previdência",
  imobiliario: "Imobiliário",
  outros: "Outros",
}

export const investmentTypes: { value: Investment["type"]; label: string }[] = [
  { value: "renda_fixa", label: "Renda Fixa" },
  { value: "renda_variavel", label: "Renda Variável" },
  { value: "previdencia", label: "Previdência" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "outros", label: "Outros" },
]
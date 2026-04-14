"use client"

import * as React from "react"

export interface Investment {
  id: string
  name: string
  type: "renda_fixa" | "renda_variavel" | "previdencia" | "imobiliario" | "outros"
  amount: number // Valor investido (principal)
  date: string
  expectedReturn: number // Taxa esperada anual
  currentValue?: number // Valor atual manual (Grupo B) ou estimado (Grupo A)
  proventos?: number // Proventos/dividendos recebidos acumulados
  createdAt: string
}

const STORAGE_KEY = "financeiro-app-investments"

// Grupo A: Investimentos com estimativa previsível
const GROUP_A_TYPES: Investment["type"][] = ["renda_fixa", "previdencia"]

// Grupo B: Investimentos de mercado (valor incerto)
const GROUP_B_TYPES: Investment["type"][] = ["renda_variavel", "imobiliario", "outros"]

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

// Determina o tipo de valor
export type ValueType = "estimated" | "manual" | "unavailable"

export function getInvestmentValueType(investment: Investment): ValueType {
  if (GROUP_A_TYPES.includes(investment.type)) {
    return "estimated"
  }
  return investment.currentValue !== undefined ? "manual" : "unavailable"
}

// Função standalone para calcular valor atual
// Pode ser usada tanto dentro do hook quanto em componentes
export function calculateCurrentValue(investment: Investment): number | null {
  // Grupo B sem currentValue: retorna null
  if (GROUP_B_TYPES.includes(investment.type) && investment.currentValue === undefined) {
    return null
  }

  // Grupo B com currentValue: usa valor manual
  if (investment.currentValue !== undefined) {
    return investment.currentValue
  }

  // Grupo A: calcula estimativa
  if (GROUP_A_TYPES.includes(investment.type)) {
    const investmentDate = new Date(investment.date)
    const now = new Date()
    const monthsElapsed = (now.getFullYear() - investmentDate.getFullYear()) * 12 +
                          (now.getMonth() - investmentDate.getMonth())

    if (monthsElapsed <= 0) return investment.amount

    const monthlyRate = investment.expectedReturn / 100 / 12
    const expectedValue = investment.amount * Math.pow(1 + monthlyRate, monthsElapsed)
    return expectedValue
  }

  return null
}

// Calcula componentes de retorno
export interface ReturnBreakdown {
  currentValue: number | null // Valor atual (manual/estimado/indisponível)
  unrealizedVariation: number | null // Variação não realizada = valor atual - investido
  proventos: number // Proventos acumulados
  totalReturn: number | null // Retorno total = variação + proventos
  totalReturnPercent: number | null // Retorno % = (variação + proventos) / investido
}

export function calculateReturnBreakdown(investment: Investment): ReturnBreakdown {
  const currentValue = calculateCurrentValue(investment)
  const unrealizedVariation = currentValue !== null ? currentValue - investment.amount : null
  const proventos = investment.proventos || 0
  const totalReturn = unrealizedVariation !== null ? unrealizedVariation + proventos : proventos > 0 ? proventos : null
  const totalReturnPercent = investment.amount > 0 && totalReturn !== null ? (totalReturn / investment.amount) * 100 : null

  return {
    currentValue,
    unrealizedVariation,
    proventos,
    totalReturn,
    totalReturnPercent,
  }
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
    currentValue?: number
    proventos?: number
  }) => {
    const newInvestment: Investment = {
      id: generateId(),
      name: data.name,
      type: data.type,
      amount: data.amount,
      date: data.date,
      expectedReturn: data.expectedReturn,
      currentValue: data.currentValue,
      proventos: data.proventos,
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
    currentValue?: number
    proventos?: number
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

  const totalAllocated = React.useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.amount, 0)
  }, [investments])

  const distributionByType = React.useMemo(() => {
    const dist: Record<string, number> = {}
    investments.forEach((inv) => {
      dist[inv.type] = (dist[inv.type] || 0) + inv.amount
    })
    return dist
  }, [investments])

  // Número de ativos com valor acompanhado
  const trackedAssetsCount = React.useMemo(() => {
    return investments.filter((inv) => calculateCurrentValue(inv) !== null).length
  }, [investments])

  // Total de valor atual (apenas ativos rastreados)
  const totalCurrentValue = React.useMemo(() => {
    return investments.reduce((sum, inv) => {
      const currentValue = calculateCurrentValue(inv)
      return sum + (currentValue !== null ? currentValue : 0)
    }, 0)
  }, [investments])

  // Variação não realizada total (apenas ativos rastreados)
  const totalUnrealizedVariation = React.useMemo(() => {
    let variation = 0
    let investedInTracked = 0

    investments.forEach((inv) => {
      const currentValue = calculateCurrentValue(inv)
      if (currentValue !== null) {
        variation += currentValue - inv.amount
        investedInTracked += inv.amount
      }
    })

    return { variation, investedInTracked }
  }, [investments])

  // Proventos total
  const totalProventos = React.useMemo(() => {
    return investments.reduce((sum, inv) => sum + (inv.proventos || 0), 0)
  }, [investments])

  // Retorno total = variação não realizada + proventos
  const totalReturn = React.useMemo(() => {
    return totalUnrealizedVariation.variation + totalProventos
  }, [totalUnrealizedVariation.variation, totalProventos])

  // Percentual de retorno total
  const totalReturnPercent = React.useMemo(() => {
    if (totalUnrealizedVariation.investedInTracked === 0) return 0
    return (totalReturn / totalUnrealizedVariation.investedInTracked) * 100
  }, [totalReturn, totalUnrealizedVariation.investedInTracked])

  // Separação por grupos
  const investmentsGroupA = React.useMemo(() => {
    return investments.filter((inv) => GROUP_A_TYPES.includes(inv.type))
  }, [investments])

  const investmentsGroupB = React.useMemo(() => {
    return investments.filter((inv) => GROUP_B_TYPES.includes(inv.type))
  }, [investments])

  const investmentsWithoutTrackedValue = React.useMemo(() => {
    return investments.filter((inv) => calculateCurrentValue(inv) === null)
  }, [investments])

  return {
    investments,
    isLoaded,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    // Métricas agregadas
    totalAllocated,
    totalCurrentValue,
    totalUnrealizedVariation,
    totalProventos,
    totalReturn,
    totalReturnPercent,
    trackedAssetsCount,
    distributionByType,
    // Funções auxiliares
    calculateCurrentValue,
    calculateReturnBreakdown,
    getInvestmentValueType,
    // Categorização
    investmentsGroupA,
    investmentsGroupB,
    investmentsWithoutTrackedValue,
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

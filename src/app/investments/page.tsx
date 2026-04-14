"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { useInvestments, investmentTypeLabels, getInvestmentValueType, calculateReturnBreakdown } from "@/hooks/use-investments"
import { InvestmentModal } from "@/components/investment-modal"
import { formatCurrency, formatDate } from "@/lib/formatting"

// Type labels - neutral, coesive visual language
const TYPE_LABEL: Record<string, string> = {
  renda_fixa: "Renda Fixa",
  renda_variavel: "Ações",
  previdencia: "Previdência",
  imobiliario: "FII",
  outros: "Outro",
}

// Neutral color palette: subtle text colors only, no highlights
const TYPE_COLOR: Record<string, string> = {
  renda_fixa: "text-muted-foreground",
  renda_variavel: "text-muted-foreground",
  previdencia: "text-muted-foreground",
  imobiliario: "text-muted-foreground",
  outros: "text-muted-foreground",
}

export default function InvestmentsPage() {
  const {
    investments,
    isLoaded,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    totalAllocated,
    totalCurrentValue,
    totalUnrealizedVariation,
    totalProventos,
    trackedAssetsCount,
    distributionByType,
    calculateCurrentValue,
    calculateReturnBreakdown: getReturnBreakdown,
    investmentsGroupA,
    investmentsGroupB,
    investmentsWithoutTrackedValue,
  } = useInvestments()

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingInvestment, setEditingInvestment] = React.useState<any>(null)
  const [investmentToDelete, setInvestmentToDelete] = React.useState<string | null>(null)

  const handleAdd = (data: Parameters<typeof addInvestment>[0]) => {
    addInvestment(data)
  }

  const handleUpdate = (id: string, data: Parameters<typeof updateInvestment>[1]) => {
    updateInvestment(id, data)
    setEditingInvestment(null)
  }

  const handleEdit = (investment: any) => {
    setEditingInvestment(investment)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setInvestmentToDelete(id)
  }

  const handleDeleteConfirm = () => {
    if (investmentToDelete) {
      deleteInvestment(investmentToDelete)
      setInvestmentToDelete(null)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingInvestment(null)
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-bold text-foreground">Investimentos</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const hasInvestments = investments.length > 0
  const pendingCount = investmentsWithoutTrackedValue.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Investimentos</h1>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          + Novo
        </Button>
      </div>

      {!hasInvestments ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground font-medium">Nenhum investimento cadastrado</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em "Novo" para adicionar</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview KPIs — Compact and discrete */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Alocado</p>
                <p className="font-amount text-lg font-bold text-foreground">
                  {formatCurrency(totalAllocated)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Acompanhados</p>
                <p className="font-amount text-lg font-bold text-foreground">
                  {trackedAssetsCount}/{investments.length}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Variação</p>
                {trackedAssetsCount > 0 ? (
                  <p className={`font-amount text-lg font-bold ${totalUnrealizedVariation.variation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {totalUnrealizedVariation.variation >= 0 ? "+" : ""}{formatCurrency(totalUnrealizedVariation.variation)}
                  </p>
                ) : (
                  <p className="font-amount text-lg font-bold text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Proventos</p>
                <p className={`font-amount text-lg font-bold ${totalProventos > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  {totalProventos > 0 ? "+" : ""}{formatCurrency(totalProventos)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Allocation — Clean and cohesive */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alocação por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {Object.entries(distributionByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => {
                  const percentage = totalAllocated > 0 ? (amount / totalAllocated) * 100 : 0

                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          {TYPE_LABEL[type] || type}
                        </span>
                        <div className="text-right">
                          <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                          <span className="text-xs text-muted-foreground ml-2">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/20 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          {/* Investments List — Clean and scannable */}
          <div className="space-y-1">
            {investmentsGroupA.length > 0 && (
              <>
                <div className="px-1 py-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Renda Fixa & Previdência
                  </h3>
                </div>
                <div className="space-y-2">
                  {investmentsGroupA.map((investment) => {
                    const breakdown = getReturnBreakdown(investment)
                    const valueType = breakdown.currentValue !== null ? "Estimado" : "Sem atualização"

                    return (
                      <Card key={investment.id} className="hover:bg-muted/40 transition-colors border-border/50">
                        <CardContent className="p-3 space-y-2.5">
                          {/* ZONE 1: Asset Identity */}
                          <div className="space-y-1">
                            <p className="font-semibold text-sm text-foreground">{investment.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{TYPE_LABEL[investment.type]}</span>
                              <span>•</span>
                              <span>{formatDate(investment.date)}</span>
                              <span>•</span>
                              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {valueType}
                              </span>
                            </div>
                          </div>

                          {/* ZONE 2: Main Data - aligned horizontal */}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Investido</p>
                              <p className="font-medium text-sm text-foreground">{formatCurrency(investment.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Estimado</p>
                              <p className="font-medium text-sm text-foreground">{formatCurrency(breakdown.currentValue || investment.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Proventos</p>
                              <p className="font-medium text-sm text-foreground">{formatCurrency(breakdown.proventos)}</p>
                            </div>
                          </div>

                          {/* ZONE 3: Result & Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/30">
                            {breakdown.unrealizedVariation !== null && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Variação</p>
                                <p className={`font-semibold text-sm ${breakdown.unrealizedVariation >= 0 ? "text-lime-500" : "text-red-500"}`}>
                                  {breakdown.unrealizedVariation >= 0 ? "+" : ""}{formatCurrency(breakdown.unrealizedVariation)}
                                </p>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(investment)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(investment.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}

            {investmentsGroupB.filter((inv) => calculateCurrentValue(inv) !== null).length > 0 && (
              <>
                <div className="px-1 py-2 pt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ativos de Mercado
                  </h3>
                </div>
                <div className="space-y-2">
                  {investmentsGroupB
                    .filter((inv) => calculateCurrentValue(inv) !== null)
                    .map((investment) => {
                      const breakdown = getReturnBreakdown(investment)
                      const valueType = investment.currentValue !== undefined ? "Manual" : "Sem atualização"

                      return (
                        <Card key={investment.id} className="hover:bg-muted/40 transition-colors border-border/50">
                          <CardContent className="p-3 space-y-2.5">
                            {/* ZONE 1: Asset Identity */}
                            <div className="space-y-1">
                              <p className="font-semibold text-sm text-foreground">{investment.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{TYPE_LABEL[investment.type]}</span>
                                <span>•</span>
                                <span>{formatDate(investment.date)}</span>
                                <span>•</span>
                                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                  {valueType}
                                </span>
                              </div>
                            </div>

                            {/* ZONE 2: Main Data - aligned horizontal */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Investido</p>
                                <p className="font-medium text-sm text-foreground">{formatCurrency(investment.amount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Valor Atual</p>
                                <p className="font-medium text-sm text-foreground">{formatCurrency(breakdown.currentValue || 0)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Proventos</p>
                                <p className="font-medium text-sm text-foreground">{formatCurrency(breakdown.proventos)}</p>
                              </div>
                            </div>

                            {/* ZONE 3: Result & Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                              {breakdown.totalReturn !== null && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Ganho Total</p>
                                  <p className={`font-semibold text-sm ${breakdown.totalReturn >= 0 ? "text-lime-500" : "text-red-500"}`}>
                                    {breakdown.totalReturn >= 0 ? "+" : ""}{formatCurrency(breakdown.totalReturn)}
                                  </p>
                                </div>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleEdit(investment)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(investment.id)}
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </>
            )}
          </div>

          {/* Pending Updates — Elegant and compact */}
          {pendingCount > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {pendingCount} ativo{pendingCount !== 1 ? "s" : ""} pendente{pendingCount !== 1 ? "s" : ""} de atualização
                </p>
                <div className="space-y-1">
                  {investmentsWithoutTrackedValue.map((investment) => (
                    <div key={investment.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground truncate flex-1">{investment.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(investment)}
                      >
                        Atualizar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAdd}
        editingInvestment={editingInvestment}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!investmentToDelete} onClose={() => setInvestmentToDelete(null)}>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Excluir investimento?</h3>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setInvestmentToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

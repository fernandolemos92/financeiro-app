"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useInvestments, investmentTypeLabels } from "@/hooks/use-investments"
import { InvestmentModal } from "@/components/investment-modal"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("pt-BR").format(date)
}

export default function InvestmentsPage() {
  const { 
    investments, 
    isLoaded, 
    addInvestment, 
    updateInvestment,
    deleteInvestment,
    totalInvested,
    distributionByType,
    totalExpectedValue,
    totalGainLoss,
    gainLossPercentage
  } = useInvestments()
  
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingInvestment, setEditingInvestment] = React.useState<any>(null)

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
    if (confirm("Tem certeza que deseja excluir este investimento?")) {
      deleteInvestment(id)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingInvestment(null)
  }

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Investimentos</h1>
          <p className="mt-1 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const hasInvestments = investments.length > 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Investimentos</h1>
          <p className="mt-1 text-muted-foreground">Acompanhe sua carteira de investimentos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          + Novo Investimento
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-amount text-2xl font-bold text-primary">
              {formatCurrency(totalInvested)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Número de investimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-amount text-2xl font-bold text-foreground">
              {investments.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Atual / Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-amount text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-400" : "text-secondary"}`}>
              {totalInvested > 0 
                ? `${totalGainLoss >= 0 ? "+" : ""}${formatCurrency(totalGainLoss)} (${gainLossPercentage.toFixed(1)}%)`
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Type */}
      {hasInvestments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(distributionByType).map(([type, amount]) => {
              const percentage = totalInvested > 0 ? (amount / totalInvested) * 100 : 0
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {investmentTypeLabels[type as keyof typeof investmentTypeLabels] || type}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Investment List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {hasInvestments ? (
            <div className="space-y-3">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{investment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {investmentTypeLabels[investment.type]} • {formatDate(investment.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-amount text-lg font-semibold text-foreground">
                      {formatCurrency(investment.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {investment.expectedReturn}% a.a.
                    </p>
                    <p className={`text-xs ${investment.expectedReturn > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                      Atual: {formatCurrency(investment.amount * Math.pow(1 + investment.expectedReturn / 100 / 12, 
                        Math.max(1, Math.floor((new Date().getTime() - new Date(investment.date).getTime()) / (1000 * 60 * 60 * 24 * 30)))))}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(investment)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(investment.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum investimento cadastrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Novo Investimento" para adicionar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAdd}
        editingInvestment={editingInvestment}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
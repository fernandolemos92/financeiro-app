"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CloseButton } from "@/components/ui/close-button"
import { GoalModal } from "@/components/goal-modal"
import { Modal } from "@/components/ui/modal"
import { toast } from "sonner"
import { 
  useGoals, 
  formatCurrency, 
  formatDate, 
  calculateProgress, 
  formatProgressPercentage,
  getDeadlineText,
  getMissingAmount,
  formatInputValue,
  parseInputValue,
  Goal,
  GoalContribution,
} from "@/hooks/use-goals"
import { Plus, Trash } from "phosphor-react"

function GoalDetailModal({
  goal,
  onClose,
  onUpdate,
  onAddContribution,
  onCloseManually,
  onDelete,
}: {
  goal: Goal
  onClose: () => void
  onUpdate: (id: string, data: { name?: string; targetAmount?: number; deadline?: string }) => void
  onAddContribution: (id: string, amount: number) => void
  onCloseManually: (id: string) => void
  onDelete: (id: string) => void
}) {
  const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
  const missing = getMissingAmount(goal.currentAmount, goal.targetAmount)

  const isActuallyCompleted = goal.completedAt || goal.status === "completed" || goal.currentAmount >= goal.targetAmount

  const [isEditing, setIsEditing] = React.useState(false)
  const [editName, setEditName] = React.useState(goal.name)
  const [editTarget, setEditTarget] = React.useState(goal.targetAmount.toString())
  const [editDeadline, setEditDeadline] = React.useState(goal.deadline)
  const [contributionAmount, setContributionAmount] = React.useState("")

  React.useEffect(() => {
    setEditName(goal.name)
    setEditTarget(goal.targetAmount.toString())
    setEditDeadline(goal.deadline)
  }, [goal])

  const handleSaveEdit = () => {
    const rawValue = parseInputValue(editTarget)
    const newTarget = parseFloat(rawValue.replace(",", "."))
    if (newTarget > 0) {
      onUpdate(goal.id, {
        name: editName,
        targetAmount: newTarget,
        deadline: editDeadline,
      })
      setIsEditing(false)
      toast.success("Meta atualizada com sucesso")
    }
  }

  const handleAddContribution = () => {
    const rawValue = parseInputValue(contributionAmount)
    const amount = parseFloat(rawValue.replace(",", "."))
    if (amount > 0) {
      onAddContribution(goal.id, amount)
      setContributionAmount("")
      toast.success("Aporte realizado com sucesso")
    }
  }

  const getStatusLabel = () => {
    if (isActuallyCompleted) {
      if (goal.status === "manually_closed") return "Encerrada manualmente"
      return "Concluída"
    }
    return "Ativa"
  }

  const getStatusColor = () => {
    if (isActuallyCompleted) {
      if (goal.status === "manually_closed") return "text-yellow-400"
      return "text-green-400"
    }
    return "text-primary"
  }

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-lg">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Detalhes da Meta
          </h3>
          <CloseButton onClick={onClose} className="" />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
        {!isActuallyCompleted && goal.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Concluída em {formatDate(goal.completedAt)}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Nome da meta</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor alvo (R$)</label>
              <Input
                value={formatInputValue(editTarget)}
                onChange={(e) => setEditTarget(formatInputValue(e.target.value))}
                onBlur={(e) => setEditTarget(formatInputValue(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data alvo</label>
              <Input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="py-4">
              <h4 className="font-heading text-xl font-bold text-foreground">{goal.name}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor acumulado</p>
                <p className="font-amount text-lg font-medium text-green-400">
                  {formatCurrency(goal.currentAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor alvo</p>
                <p className="font-amount text-lg font-medium text-foreground">
                  {formatCurrency(goal.targetAmount)}
                </p>
              </div>
              {!isActuallyCompleted && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor faltante</p>
                    <p className="font-amount text-lg font-medium text-red-400">
                      {formatCurrency(missing)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="font-amount text-lg font-medium text-foreground">
                      {formatProgressPercentage(goal.currentAmount, goal.targetAmount)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Data alvo</p>
                <p className="text-foreground">{formatDate(goal.deadline)}</p>
              </div>
              {!isActuallyCompleted && (
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="text-foreground">{getDeadlineText(goal.deadline)}</p>
                </div>
              )}
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isActuallyCompleted ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            {!isActuallyCompleted && (
              <div className="flex gap-2">
                <Input
                  placeholder="Valor do aporte"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(formatInputValue(e.target.value))}
                  onBlur={(e) => setContributionAmount(formatInputValue(e.target.value))}
                  className="flex-1"
                />
                <Button onClick={handleAddContribution}>
                  Aportar
                </Button>
              </div>
            )}
          </>
        )}

        {goal.contributions.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Histórico de aportes</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {goal.contributions.map((contribution) => (
                <div key={contribution.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(contribution.date)}</span>
                  <span className="text-green-400 font-amount">+{formatCurrency(contribution.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border flex gap-3">
        {!isActuallyCompleted && (
          <>
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onCloseManually(goal.id)}>
              Encerrar
            </Button>
          </>
        )}
        <Button variant="destructive" className="flex-1" onClick={() => onDelete(goal.id)}>
          <Trash size={16} className="mr-2" />
          Excluir
        </Button>
      </div>
    </Modal>
  )
}

function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null

  return (
    <Modal isOpen={true} onClose={onCancel} className="max-w-sm">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
        Excluir meta?
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
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

function GoalCard({ 
  goal,
  onClick,
}: { 
  goal: Goal
  onClick: () => void
}) {
  const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
  const missing = getMissingAmount(goal.currentAmount, goal.targetAmount)
  const isActuallyCompleted = goal.completedAt || goal.status === "completed" || goal.currentAmount >= goal.targetAmount

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{goal.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <p className="font-amount text-3xl font-bold text-primary">
            {formatCurrency(goal.currentAmount)}
          </p>
          <p className="text-sm text-muted-foreground">
            de {formatCurrency(goal.targetAmount)}
          </p>
        </div>

        {!isActuallyCompleted && (
          <p className="text-sm text-center text-red-400 font-amount">
            Faltam {formatCurrency(missing)}
          </p>
        )}
        
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${!isActuallyCompleted ? "bg-primary" : "bg-green-500"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatProgressPercentage(goal.currentAmount, goal.targetAmount)}</span>
          <span>{formatDate(goal.deadline)}</span>
        </div>

        {!isActuallyCompleted && (
          <p className="text-xs text-center text-muted-foreground">
            {getDeadlineText(goal.deadline)}
          </p>
        )}

        {goal.status === "completed" && goal.completedAt && (
          <p className="text-sm text-center text-green-400 font-medium">
            Meta atingida
          </p>
        )}

        {goal.status === "manually_closed" && (
          <p className="text-sm text-center text-yellow-400 font-medium">
            Encerrada manualmente
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function GoalsPage() {
  const { goals, isLoaded, addGoal, addContribution, closeGoalManually, updateGoal, deleteGoal, getGoalById } = useGoals()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null)
  const [goalToDelete, setGoalToDelete] = React.useState<string | null>(null)

  const selectedGoal = selectedGoalId ? getGoalById(selectedGoalId) || null : null

  const handleAddGoal = (data: { name: string; targetAmount: number; deadline: string }) => {
    addGoal(data)
    toast.success("Meta criada com sucesso")
  }

  const handleAddContribution = (id: string, amount: number) => {
    addContribution(id, amount)
  }

  const handleRowClick = (goal: Goal) => {
    setSelectedGoalId(goal.id)
  }

  const handleDetailClose = () => {
    setSelectedGoalId(null)
  }

  const handleCloseManually = (id: string) => {
    closeGoalManually(id)
    toast.info("Meta encerrada manualmente")
    setSelectedGoalId(null)
  }

  const handleDeleteGoal = (id: string) => {
    setGoalToDelete(id)
  }

  const handleConfirmDelete = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete)
      toast.success("Meta excluída com sucesso")
      setGoalToDelete(null)
      setSelectedGoalId(null)
    }
  }

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Metas</h1>
          <p className="mt-1 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const activeGoals = goals.filter((g) => g.status === "active" && !g.completedAt)
  const completedGoals = goals.filter((g) => g.status !== "active" || !!g.completedAt)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Metas</h1>
          <p className="mt-1 text-muted-foreground">Acompanhe suas metas financeiras</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Active Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {activeGoals.length === 0 ? "Nenhuma meta ativa" : "Metas ativas"}
          </h2>
          {activeGoals.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total nas metas: <span className="font-semibold text-foreground">{formatCurrency(activeGoals.reduce((sum, g) => sum + g.currentAmount, 0))}</span>
            </p>
          )}
        </div>
        
        {activeGoals.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center text-muted-foreground">
              <p>Nenhuma meta ativa no momento.</p>
              <p className="text-sm mt-2">Clique em &quot;Nova Meta&quot; para criar!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => (
              <GoalCard 
                key={goal.id} 
                goal={goal}
                onClick={() => setSelectedGoalId(goal.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
            {completedGoals.length === 1 ? "1 meta concluída" : `${completedGoals.length} metas concluídas`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard 
                key={goal.id} 
                goal={goal}
                onClick={() => setSelectedGoalId(goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddGoal}
      />

      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={handleDetailClose}
          onUpdate={updateGoal}
          onAddContribution={handleAddContribution}
          onCloseManually={handleCloseManually}
          onDelete={handleDeleteGoal}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!goalToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setGoalToDelete(null)}
      />
    </div>
  )
}
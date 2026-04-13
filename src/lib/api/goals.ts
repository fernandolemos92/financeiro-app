// Type declarations (local, avoids circular dependency with use-goals hook)
export interface GoalContribution {
  id: string
  amount: number
  date: string
}

export type GoalStatus = "active" | "completed" | "manually_closed"

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  status: GoalStatus
  createdAt: string
  completedAt?: string
  contributions: GoalContribution[]
}

export interface CreateGoalPayload {
  name: string
  targetAmount: number
  deadline: string
}

export interface UpdateGoalPayload {
  name?: string
  targetAmount?: number
  deadline?: string
}

export interface AddContributionPayload {
  amount: number
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export async function apiFetchGoals(): Promise<Goal[]> {
  const response = await fetch(`${BASE}/goals`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch goals: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiCreateGoal(data: CreateGoalPayload): Promise<Goal> {
  const response = await fetch(`${BASE}/goals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to create goal: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiUpdateGoal(id: string, data: UpdateGoalPayload): Promise<Goal> {
  const response = await fetch(`${BASE}/goals/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to update goal: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiDeleteGoal(id: string): Promise<void> {
  const response = await fetch(`${BASE}/goals/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to delete goal: ${response.status} ${response.statusText}`)
  }
}

export async function apiAddContribution(id: string, amount: number): Promise<Goal> {
  const response = await fetch(`${BASE}/goals/${id}/contributions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to add contribution: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiCloseGoal(id: string): Promise<Goal> {
  const response = await fetch(`${BASE}/goals/${id}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to close goal: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

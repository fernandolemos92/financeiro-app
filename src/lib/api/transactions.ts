import type { Transaction } from "@/lib/transactions/types"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function apiFetchTransactions(): Promise<Transaction[]> {
  const response = await fetch(`${BASE}/transactions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiCreateTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const response = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to create transaction: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiUpdateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
  const response = await fetch(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to update transaction: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiDeleteTransaction(id: string): Promise<void> {
  const response = await fetch(`${BASE}/transactions/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete transaction: ${response.status} ${response.statusText}`)
  }
}

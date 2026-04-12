import { Transaction } from "./types"

const STORAGE_KEY = "financeiro-app-transactions"

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export interface TransactionStorage {
  loadAll(): Transaction[]
  saveAll(transactions: Transaction[]): void
  createId(): string
  getCurrentTimestamp(): string
}

export function createLocalStorageAdapter(): TransactionStorage {
  return {
    loadAll(): Transaction[] {
      if (typeof window === "undefined") return []
      
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      try {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    
    saveAll(transactions: Transaction[]): void {
      if (typeof window === "undefined") return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    },
    
    createId(): string {
      return generateId()
    },
    
    getCurrentTimestamp(): string {
      return new Date().toISOString()
    },
  }
}

export const storage = createLocalStorageAdapter()
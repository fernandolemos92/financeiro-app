"use client"

import * as React from "react"
import { AddTransactionModal } from "@/components/transaction-modal"
import { useTransactions, Transaction } from "@/hooks/use-transactions"
import { toast } from "sonner"

export interface TransactionModalState {
  isOpen: boolean
}

export interface TransactionModalActions {
  openModal: () => void
  closeModal: () => void
  toggleModal: () => void
}

export interface TransactionModalMutations {
  createTransaction: (data: Omit<Transaction, "id" | "createdAt">) => Promise<void>
}

const TransactionModalContext = React.createContext<TransactionModalState & TransactionModalActions & TransactionModalMutations | undefined>(undefined)

export function TransactionModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const { addTransaction } = useTransactions()

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)
  const toggleModal = () => setIsOpen(prev => !prev)

  const createTransaction = async (data: Omit<Transaction, "id" | "createdAt">) => {
    try {
      await addTransaction(data)
      toast.success("Transação criada com sucesso")
    } catch (error) {
      toast.error("Erro ao criar transação")
      throw error
    }
  }

  const handleAdd = async (data: Omit<Transaction, "id" | "createdAt">) => {
    try {
      await createTransaction(data)
      closeModal()
    } catch {
      // error already toasted in createTransaction
    }
  }

  return (
    <TransactionModalContext.Provider value={{ isOpen, openModal, closeModal, toggleModal, createTransaction }}>
      {children}
      <AddTransactionModal
        isOpen={isOpen}
        onClose={closeModal}
        onAdd={handleAdd}
      />
    </TransactionModalContext.Provider>
  )
}

export function useTransactionModal() {
  const context = React.useContext(TransactionModalContext)
  if (!context) {
    throw new Error("useTransactionModal must be used within TransactionModalProvider")
  }
  return context
}
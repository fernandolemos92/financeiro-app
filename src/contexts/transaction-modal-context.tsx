"use client"

import * as React from "react"
import { AddTransactionModal } from "@/components/transaction-modal"
import { useTransactions } from "@/hooks/use-transactions"
import { toast } from "sonner"

interface TransactionModalContextType {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const TransactionModalContext = React.createContext<TransactionModalContextType | undefined>(undefined)

export function TransactionModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const { addTransaction } = useTransactions()

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  const handleAdd = (data: Parameters<typeof addTransaction>[0]) => {
    addTransaction(data)
    closeModal()
    toast.success("Transação criada com sucesso")
  }

  return (
    <TransactionModalContext.Provider value={{ isOpen, openModal, closeModal }}>
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
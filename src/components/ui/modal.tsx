"use client"

import * as React from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, children, className = "" }: ModalProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isMounted || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isMounted, onClose])

  if (!isMounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl ${className}`}>
        {children}
      </div>
    </div>
  )
}

interface ModalLargeProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function ModalLarge({ isOpen, onClose, children, className = "" }: ModalLargeProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isMounted || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isMounted, onClose])

  if (!isMounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl ${className}`}>
        {children}
      </div>
    </div>
  )
}

/**
 * CANONICAL MODAL PATTERN FOR SCROLLABLE CONTENT
 * ================================================
 *
 * Use ModalLarge when modal content can exceed viewport height.
 * This pattern ensures all content remains accessible via scroll, with proper
 * header/footer positioning and no overflow-related accessibility issues.
 *
 * STRUCTURE:
 * <ModalLarge isOpen={isOpen} onClose={onClose}>
 *   <div className="space-y-4">
 *     [Header Title Element]
 *     <h2 className="text-xl font-semibold">Modal Title</h2>
 *
 *     [Body Content Area - grows within scrollable container]
 *     <form className="space-y-4">
 *       [form fields and content]
 *     </form>
 *
 *     [Footer Actions - scrollable with content, always reachable]
 *     <Button className="w-full">Action</Button>
 *   </div>
 * </ModalLarge>
 *
 * KEY BEHAVIORS:
 * - ModalLarge enforces max-h-[90vh] with internal vertical scrolling
 * - All content (header, body, footer) scrolls together
 * - Footer button is always accessible by scrolling
 * - Modal never exceeds 90% of viewport height
 * - Prevents layout shift on page scroll
 *
 * WHEN TO USE:
 * - Complex forms with many fields (TransactionModal, InvestmentModal)
 * - Dynamic content that grows conditionally
 * - Any modal that may exceed 500px on mobile
 *
 * WHEN NOT NEEDED:
 * - Simple, lightweight modals under 400px (use base Modal)
 * - Modals with minimal form fields
 */
interface CloseButtonProps {
  onClick: () => void
  ariaLabel?: string
  className?: string
}

export function CloseButton({ onClick, ariaLabel = "Fechar", className = "absolute top-4 right-4" }: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={ariaLabel}
    >
      ✕
    </button>
  )
}
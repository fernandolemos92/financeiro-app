interface ChipItem {
  label: string
  value: string
  color?: "green" | "red" | "primary" | "secondary" | "neutral"
}

interface ChipsProps {
  items: ChipItem[]
}

export function Chips({ items }: ChipsProps) {
  if (items.length === 0) return null

  const colorClasses = {
    green: "text-green-400",
    red: "text-red-400",
    primary: "text-primary",
    secondary: "text-secondary",
    neutral: "text-foreground",
  }

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, index) => (
        <div key={index} className="px-4 py-2 rounded-lg bg-card border border-border">
          <span className="text-xs text-muted-foreground">{item.label} </span>
          <span className={`text-sm font-medium ${item.color ? colorClasses[item.color] : "text-foreground"}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
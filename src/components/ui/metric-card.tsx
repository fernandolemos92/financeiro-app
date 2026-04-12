interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  className?: string
}

export function MetricCard({ label, value, subValue, className = "" }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-xl bg-muted ${className}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </div>
  )
}
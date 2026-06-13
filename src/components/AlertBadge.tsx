import { cn } from '@/lib/utils'

interface AlertBadgeProps {
  level: 'info' | 'warning' | 'critical'
}

const levelConfig = {
  info: { className: 'bg-accent-primary/20 text-accent-primary border-accent-primary/50', label: '提示' },
  warning: { className: 'bg-accent-warning/20 text-accent-warning border-accent-warning/50', label: '警告' },
  critical: { className: 'bg-accent-danger/20 text-accent-danger border-accent-danger/50', label: '严重' },
}

export default function AlertBadge({ level }: AlertBadgeProps) {
  const config = levelConfig[level]
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', config.className)}>
      {config.label}
    </span>
  )
}

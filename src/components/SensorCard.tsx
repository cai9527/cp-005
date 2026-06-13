import { cn } from '@/lib/utils'
import { Weight, Gauge, MoveHorizontal, ArrowUp, RotateCw, Wind, type LucideIcon } from 'lucide-react'

interface SensorCardProps {
  type: string
  value: number
  unit: string
  max: number
  timestamp?: string
}

const typeConfig: Record<string, { icon: LucideIcon; label: string }> = {
  load: { icon: Weight, label: '起重量' },
  moment: { icon: Gauge, label: '力矩' },
  radius: { icon: MoveHorizontal, label: '幅度' },
  height: { icon: ArrowUp, label: '高度' },
  rotation: { icon: RotateCw, label: '回转角度' },
  wind: { icon: Wind, label: '风速' },
}

function getValueColor(percent: number) {
  if (percent >= 95) return 'text-accent-danger'
  if (percent >= 80) return 'text-accent-warning'
  return 'text-accent-secondary'
}

function getBarColor(percent: number) {
  if (percent >= 95) return 'bg-accent-danger'
  if (percent >= 80) return 'bg-accent-warning'
  return 'bg-accent-secondary'
}

export default function SensorCard({ type, value, unit, max, timestamp }: SensorCardProps) {
  const config = typeConfig[type] ?? { icon: Gauge, label: type }
  const Icon = config.icon
  const percent = Math.min((value / max) * 100, 100)

  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{config.label}</span>
        <Icon className="w-4 h-4 text-text-muted" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('font-display font-bold text-xl', getValueColor(percent))}>
          {value}
        </span>
        <span className="text-xs text-text-muted">{unit}</span>
      </div>
      <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
      {timestamp && (
        <span className="text-[10px] text-text-muted text-right">{timestamp}</span>
      )}
    </div>
  )
}

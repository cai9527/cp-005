import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'alarm'
}

const statusConfig = {
  online: { dotClass: 'status-online', label: '在线' },
  offline: { dotClass: 'status-offline', label: '离线' },
  alarm: { dotClass: 'status-alarm', label: '报警' },
} as const

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('status-dot', config.dotClass)} />
      <span className="text-xs text-text-secondary">{config.label}</span>
    </span>
  )
}

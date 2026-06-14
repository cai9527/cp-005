import { Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/stores/authStore'

export interface AccountOption {
  role: UserRole
  label: string
  description: string
  icon: typeof Shield
  username: string
  password: string
}

export const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    role: 'admin',
    label: '管理员',
    description: '拥有系统全部权限，可管理塔机、预警规则等',
    icon: Shield,
    username: 'admin',
    password: 'Admin123',
  },
  {
    role: 'user',
    label: '个人账号',
    description: '查看监控数据和预警信息，无法修改系统配置',
    icon: User,
    username: 'user',
    password: 'User123',
  },
]

interface AccountTypeSelectorProps {
  selected: UserRole
  onChange: (role: UserRole, username: string, password: string) => void
}

export default function AccountTypeSelector({
  selected,
  onChange,
}: AccountTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACCOUNT_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = selected === option.role
        return (
          <button
            key={option.role}
            type="button"
            onClick={() => onChange(option.role, option.username, option.password)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200',
              'hover:bg-bg-tertiary/50 active:scale-[0.98]',
              isActive
                ? 'border-accent-primary/60 bg-accent-primary/10 shadow-glow-primary'
                : 'border-border-primary bg-bg-tertiary/30'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'bg-bg-tertiary text-text-muted'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                isActive ? 'text-accent-primary' : 'text-text-secondary'
              )}
            >
              {option.label}
            </span>
            <span className="text-[11px] text-text-muted leading-tight text-center">
              {option.description}
            </span>
            {isActive && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-primary shadow-glow-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}

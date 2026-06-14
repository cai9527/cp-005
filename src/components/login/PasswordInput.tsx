import { Lock, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  showPassword: boolean
  onToggleShowPassword: () => void
  error?: string
  touched?: boolean
  autoComplete?: string
}

export default function PasswordInput({
  value,
  onChange,
  onBlur,
  showPassword,
  onToggleShowPassword,
  error = '',
  touched = false,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const hasError = !!(error && touched)
  const isValid = !!value && !error

  return (
    <div>
      <label
        htmlFor="login-password"
        className="block text-sm font-medium text-text-secondary mb-1.5"
      >
        密码
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="请输入密码"
          autoComplete={autoComplete}
          className={cn(
            'input-field pl-10 pr-10',
            hasError &&
              'border-accent-danger focus:border-accent-danger focus:ring-accent-danger',
            isValid &&
              'border-accent-secondary/50 focus:border-accent-primary'
          )}
        />
        <button
          type="button"
          onClick={onToggleShowPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          aria-label={showPassword ? '隐藏密码' : '显示密码'}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {hasError && (
        <p className="mt-1.5 text-xs text-accent-danger animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  )
}

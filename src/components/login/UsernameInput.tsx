import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsernameInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  touched?: boolean
  autoComplete?: string
}

export default function UsernameInput({
  value,
  onChange,
  onBlur,
  error = '',
  touched = false,
  autoComplete = 'username',
}: UsernameInputProps) {
  const hasError = !!(error && touched)
  const isValid = !!value && !error

  return (
    <div>
      <label
        htmlFor="login-username"
        className="block text-sm font-medium text-text-secondary mb-1.5"
      >
        用户名
      </label>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          id="login-username"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="请输入用户名"
          autoComplete={autoComplete}
          className={cn(
            'input-field pl-10',
            hasError &&
              'border-accent-danger focus:border-accent-danger focus:ring-accent-danger',
            isValid &&
              'border-accent-secondary/50 focus:border-accent-primary'
          )}
        />
      </div>
      {hasError && (
        <p className="mt-1.5 text-xs text-accent-danger animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  )
}

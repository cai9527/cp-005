import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, Zap, CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculatePasswordStrength, type PasswordStrength } from '@/hooks/useLoginForm'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  showPassword: boolean
  onToggleShowPassword: () => void
  onValidate?: () => boolean
  error?: string
  touched?: boolean
  autoComplete?: string
  autoFilled?: boolean
  validated?: boolean
  validationResult?: 'idle' | 'success' | 'error'
}

export default function PasswordInput({
  value,
  onChange,
  onBlur,
  showPassword,
  onToggleShowPassword,
  onValidate,
  error = '',
  touched = false,
  autoComplete = 'current-password',
  autoFilled = false,
  validated = false,
  validationResult = 'idle',
}: PasswordInputProps) {
  const [strength, setStrength] = useState<PasswordStrength | null>(null)
  const [showStrength, setShowStrength] = useState(false)

  useEffect(() => {
    if (value) {
      setStrength(calculatePasswordStrength(value))
    } else {
      setStrength(null)
    }
  }, [value])

  const hasError = !!(error && touched)
  const isValid = validated && validationResult === 'success'
  const isError = validated && validationResult === 'error'

  const handleValidateClick = () => {
    if (onValidate) {
      const result = onValidate()
      setShowStrength(true)
      return result
    }
    return false
  }

  const handleFocus = () => {
    if (value) {
      setShowStrength(true)
    }
  }

  const handleInputChange = (newValue: string) => {
    onChange(newValue)
    if (!newValue) {
      setShowStrength(false)
    }
  }

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
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={onBlur}
          onFocus={handleFocus}
          placeholder="请输入密码"
          autoComplete={autoComplete}
          className={cn(
            'input-field pl-10 pr-28',
            hasError &&
              'border-accent-danger focus:border-accent-danger focus:ring-accent-danger',
            isError &&
              'border-accent-danger focus:border-accent-danger focus:ring-accent-danger',
            isValid && !autoFilled &&
              'border-accent-secondary focus:border-accent-secondary focus:ring-accent-secondary/30',
            autoFilled && isValid &&
              'border-accent-primary/40 bg-accent-primary/5 focus:border-accent-primary'
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {autoFilled && (
            <span className="flex items-center gap-1 text-[11px] text-accent-primary px-1.5 py-0.5 rounded bg-accent-primary/10">
              <Zap className="w-3 h-3" />
            </span>
          )}
          {onValidate && (
            <button
              type="button"
              onClick={handleValidateClick}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                'border border-transparent',
                isValid
                  ? 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30'
                  : isError
                    ? 'bg-accent-danger/15 text-accent-danger border-accent-danger/30'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80 border-border-primary'
              )}
              aria-label="验证密码强度"
            >
              {isValid ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">通过</span>
                </>
              ) : isError ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">不通过</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">验证</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="p-1 text-text-muted hover:text-text-secondary transition-colors rounded"
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
      </div>

      {(showStrength || hasError) && strength && (
        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-border-primary'
                  )}
                />
              ))}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                strength.score === 0 && 'text-accent-danger',
                strength.score === 1 && 'text-accent-warning',
                strength.score === 2 && 'text-accent-primary',
                strength.score >= 3 && 'text-accent-secondary'
              )}
            >
              {strength.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {strength.requirements.map((req, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  req.met ? 'text-accent-secondary' : 'text-text-muted'
                )}
              >
                {req.met ? (
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 flex-shrink-0 opacity-50" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasError && (
        <p className="mt-2 text-xs text-accent-danger animate-in fade-in">
          {error}
        </p>
      )}

      {isValid && !hasError && (
        <p className="mt-2 text-xs text-accent-secondary animate-in fade-in flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" />
          密码验证通过，符合要求
        </p>
      )}
    </div>
  )
}

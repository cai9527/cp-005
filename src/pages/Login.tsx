import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  UsernameInput,
  PasswordInput,
  RememberCheckbox,
  ForgotPasswordLink,
  ForgotPasswordModal,
  LoginButton,
  ErrorAlert,
  LoginHeader,
  AccountTypeSelector,
  useLoginForm,
} from '@/components/login'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const {
    state,
    setUsername,
    setPassword,
    setRemember,
    toggleShowPassword,
    handleUsernameBlur,
    handlePasswordBlur,
    validateAll,
    validatePasswordNow,
    setAccountType,
  } = useLoginForm(
    localStorage.getItem('remembered_username') || '',
    !!localStorage.getItem('remembered_username')
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return
    try {
      await login(state.username.trim(), state.password, state.remember)
      navigate('/', { replace: true })
    } catch {
      // 错误已在 authStore 中处理
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    if (error) clearError()
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (error) clearError()
  }

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
  }

  const handleAccountTypeChange = (role: 'admin' | 'user', username: string, password: string) => {
    setAccountType(role, username, password)
    if (error) clearError()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary grid-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, #00E676 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.015]"
          style={{
            background: 'radial-gradient(circle, #00D4FF 0%, transparent 50%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-3 sm:mx-4 md:mx-6 animate-in zoom-in-95">
        <div className="glass-card p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, #00D4FF, #00E676, transparent)',
            }}
          />

          <LoginHeader />

          <ErrorAlert message={error || ''} />

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                选择账号类型
              </label>
              <AccountTypeSelector
                selected={state.accountType}
                onChange={handleAccountTypeChange}
              />
            </div>

            <UsernameInput
              value={state.username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              error={state.usernameError}
              touched={state.touched.username}
              autoFilled={state.autoFilled}
            />

            <PasswordInput
              value={state.password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              showPassword={state.showPassword}
              onToggleShowPassword={toggleShowPassword}
              onValidate={validatePasswordNow}
              error={state.passwordError}
              touched={state.touched.password}
              autoComplete={state.remember ? 'current-password' : 'off'}
              autoFilled={state.autoFilled}
              validated={state.passwordValidated}
              validationResult={state.passwordValidationResult}
            />

            <div className="flex items-center justify-between">
              <RememberCheckbox
                checked={state.remember}
                onChange={setRemember}
              />
              <ForgotPasswordLink onClick={handleForgotPassword} />
            </div>

            <LoginButton loading={loading} />
          </form>

          <div className="mt-6 pt-5 border-t border-border-primary">
            <p className="text-center text-xs text-text-muted">
              系统仅限授权人员使用 · v1.0.0
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted/60">
          © 2026 智慧工地塔机监测平台 · 安全登录
        </p>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  )
}

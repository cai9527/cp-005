import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LoginHeader,
  ErrorAlert,
  UsernameInput,
  PasswordInput,
  calculatePasswordStrength,
  type PasswordStrength,
} from '@/components/login'
import {
  User, Mail, Phone, Eye, EyeOff, ShieldCheck,
  AlertTriangle, CheckCircle, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    email: '',
    phone: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordValidated, setPasswordValidated] = useState(false)
  const [passwordValidationResult, setPasswordValidationResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [showStrength, setShowStrength] = useState(false)

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return '请输入用户名'
        if (value.trim().length < 3) return '用户名至少3个字符'
        if (value.trim().length > 20) return '用户名不超过20个字符'
        if (!/^[a-zA-Z0-9_]+$/.test(value.trim()))
          return '用户名仅支持字母、数字和下划线'
        return ''
      case 'password':
        if (!value) return '请输入密码'
        if (value.length < 6) return '密码至少6个字符'
        if (value.length > 32) return '密码不超过32个字符'
        if (!/[a-z]/.test(value)) return '密码需包含小写字母'
        if (!/[A-Z]/.test(value)) return '密码需包含大写字母'
        if (!/[0-9]/.test(value)) return '密码需包含数字'
        return ''
      case 'confirmPassword':
        if (!value) return '请再次输入密码'
        if (value !== form.password) return '两次输入的密码不一致'
        return ''
      case 'displayName':
        if (!value.trim()) return '请输入显示名称'
        if (value.length > 30) return '显示名称不超过30个字符'
        return ''
      case 'email':
        if (!value) return ''
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '邮箱格式不正确'
        return ''
      case 'phone':
        if (!value) return ''
        if (!/^1[3-9]\d{9}$/.test(value)) return '手机号格式不正确'
        return ''
      default:
        return ''
    }
  }

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    }
    if (name === 'password' && touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', form.confirmPassword) }))
    }
    if (name === 'password') {
      if (value) {
        setPasswordStrength(calculatePasswordStrength(value))
      } else {
        setPasswordStrength(null)
        setShowStrength(false)
      }
      setPasswordValidated(false)
      setPasswordValidationResult('idle')
    }
    if (error) setError('')
  }

  const validatePasswordNow = (): boolean => {
    const pErr = validateField('password', form.password)
    const pValid = !pErr
    setTouched((prev) => ({ ...prev, password: true }))
    setErrors((prev) => ({ ...prev, password: pErr }))
    setPasswordValidated(true)
    setPasswordValidationResult(pValid ? 'success' : 'error')
    setShowStrength(true)
    return pValid
  }

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof typeof form]) }))
  }

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}
    const fields = ['username', 'password', 'confirmPassword', 'displayName', 'email', 'phone']
    fields.forEach((field) => {
      newErrors[field] = validateField(field, form[field as keyof typeof form])
    })
    setErrors(newErrors)
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}))
    return !fields.some((f) => newErrors[f])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          email: form.email || undefined,
          phone: form.phone || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '注册失败')
      }

      const data = await res.json()
      const authUser = {
        id: data.user?.id || '',
        username: data.user?.username || form.username,
        displayName: data.user?.displayName || form.displayName,
        email: data.user?.email || null,
        phone: data.user?.phone || null,
        role: data.user?.role || 'user',
        status: data.user?.status || 'active',
      }

      sessionStorage.setItem('auth_token', data.token)
      sessionStorage.setItem('auth_user', JSON.stringify(authUser))
      useAuthStore.setState({
        isAuthenticated: true,
        user: authUser,
        token: data.token,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
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
      </div>

      <div className="relative z-10 w-full max-w-md mx-3 sm:mx-4 md:mx-6 animate-in zoom-in-95">
        <div className="glass-card p-5 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, #00D4FF, #00E676, transparent)',
            }}
          />

          <LoginHeader title="创建账号" subtitle="注册新的监测平台账号" />

          {success && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-4 h-4 text-accent-secondary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-accent-secondary">注册成功！正在跳转...</span>
            </div>
          )}

          <ErrorAlert message={error} />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                用户名 *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  onBlur={() => handleBlur('username')}
                  placeholder="3-20位字母、数字、下划线"
                  className={`w-full h-11 pl-9 pr-3 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60 ${
                    touched.username && errors.username
                      ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                      : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                  }`}
                />
              </div>
              {touched.username && errors.username && (
                <p className="mt-1 text-xs text-accent-danger">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                显示名称 *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  onBlur={() => handleBlur('displayName')}
                  placeholder="您的显示名称"
                  className={`w-full h-11 pl-9 pr-3 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60 ${
                    touched.displayName && errors.displayName
                      ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                      : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                  }`}
                />
              </div>
              {touched.displayName && errors.displayName && (
                <p className="mt-1 text-xs text-accent-danger">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                密码 *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  onFocus={() => form.password && setShowStrength(true)}
                  placeholder="6-32位，包含大小写字母和数字"
                  className={cn(
                    'w-full h-11 px-3 pr-28 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60',
                    (touched.password && errors.password) || (passwordValidated && passwordValidationResult === 'error')
                      ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                      : passwordValidated && passwordValidationResult === 'success'
                        ? 'border-accent-secondary focus:border-accent-secondary focus:ring-2 focus:ring-accent-secondary/30'
                        : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={validatePasswordNow}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all border border-transparent',
                      passwordValidated && passwordValidationResult === 'success'
                        ? 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30'
                        : passwordValidated && passwordValidationResult === 'error'
                          ? 'bg-accent-danger/15 text-accent-danger border-accent-danger/30'
                          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80 border-border-primary'
                    )}
                    aria-label="验证密码强度"
                  >
                    {passwordValidated && passwordValidationResult === 'success' ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">通过</span>
                      </>
                    ) : passwordValidated && passwordValidationResult === 'error' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">不通过</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">验证</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-text-muted hover:text-text-secondary transition-colors rounded"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {(showStrength || (touched.password && errors.password)) && passwordStrength && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-all duration-300',
                            i <= passwordStrength.score ? passwordStrength.color : 'bg-border-primary'
                          )}
                        />
                      ))}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        passwordStrength.score === 0 && 'text-accent-danger',
                        passwordStrength.score === 1 && 'text-accent-warning',
                        passwordStrength.score === 2 && 'text-accent-primary',
                        passwordStrength.score >= 3 && 'text-accent-secondary'
                      )}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {passwordStrength.requirements.map((req, idx) => (
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
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 opacity-50" />
                        )}
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {touched.password && errors.password && (
                <p className="mt-2 text-xs text-accent-danger animate-in fade-in">{errors.password}</p>
              )}

              {passwordValidated && passwordValidationResult === 'success' && !errors.password && (
                <p className="mt-2 text-xs text-accent-secondary animate-in fade-in flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  密码验证通过，符合要求
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                确认密码 *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="再次输入密码"
                  className={`w-full h-11 px-3 pr-10 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60 ${
                    touched.confirmPassword && errors.confirmPassword
                      ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                      : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs text-accent-danger">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  邮箱
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="user@example.com"
                    className={`w-full h-11 pl-9 pr-3 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60 ${
                      touched.email && errors.email
                        ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                        : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                    }`}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="mt-1 text-xs text-accent-danger">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  手机号
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="13800000000"
                    className={`w-full h-11 pl-9 pr-3 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60 ${
                      touched.phone && errors.phone
                        ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
                        : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                    }`}
                  />
                </div>
                {touched.phone && errors.phone && (
                  <p className="mt-1 text-xs text-accent-danger">{errors.phone}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full h-11 mt-2 rounded-lg bg-accent-primary text-white font-medium text-sm
                hover:bg-accent-primary/90 active:scale-[0.98] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-accent-primary/20
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  注册中...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  注册成功
                </>
              ) : (
                '注册账号'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-primary">
            <p className="text-center text-sm text-text-muted">
              已有账号？
              <Link
                to="/login"
                className="text-accent-primary hover:text-accent-primary/80 font-medium ml-1 inline-flex items-center gap-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                立即登录
              </Link>
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-border-primary/50">
            <p className="text-center text-xs text-text-muted">
              系统仅限授权人员使用 · v1.0.0
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted/60">
          © 2026 智慧工地塔机监测平台 · 安全注册
        </p>
      </div>
    </div>
  )
}

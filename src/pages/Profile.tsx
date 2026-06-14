import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  User, Mail, Phone, Shield, KeyRound, Eye, EyeOff,
  AlertTriangle, CheckCircle, RefreshCw, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'profile' | 'password'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const changePassword = useAuthStore((s) => s.changePassword)
  const clearError = useAuthStore((s) => s.clearError)

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">个人中心</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={clearError} className="ml-auto">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'profile'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <User className="w-4 h-4 inline mr-1.5" />
          个人资料
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'password'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <KeyRound className="w-4 h-4 inline mr-1.5" />
          修改密码
        </button>
      </div>

      {activeTab === 'profile' && (
        <ProfileForm
          user={user}
          loading={loading}
          onSubmit={async (data) => {
            await updateProfile(data)
            setSuccessMessage('资料更新成功')
          }}
        />
      )}

      {activeTab === 'password' && (
        <PasswordForm
          loading={loading}
          onSubmit={async (oldPassword, newPassword) => {
            await changePassword(oldPassword, newPassword)
            setSuccessMessage('密码修改成功')
          }}
        />
      )}
    </div>
  )
}

function ProfileForm({
  user,
  loading,
  onSubmit,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user']
  loading: boolean
  onSubmit: (data: { displayName: string; email: string; phone: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'displayName':
        if (!value.trim()) return '显示名称不能为空'
        if (value.length > 30) return '显示名称不能超过30个字符'
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
  }

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof typeof form]) }))
  }

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}
    const fields = ['displayName', 'email', 'phone']
    fields.forEach((field) => {
      newErrors[field] = validateField(field, form[field as keyof typeof form])
    })
    setErrors(newErrors)
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}))
    return !fields.some((f) => newErrors[f])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return
    await onSubmit({
      displayName: form.displayName.trim(),
      email: form.email || '',
      phone: form.phone || '',
    })
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border-primary">
        <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center">
          <User className="w-8 h-8 text-accent-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{user?.displayName}</h3>
          <p className="text-sm text-text-muted">@{user?.username}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              user?.role === 'admin'
                ? 'bg-accent-primary/15 text-accent-primary'
                : 'bg-bg-tertiary text-text-secondary'
            )}>
              <Shield className="w-3 h-3" />
              {user?.role === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            用户名
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="input-field pl-9 opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            显示名称 <span className="text-accent-danger">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              onBlur={() => handleBlur('displayName')}
              className={cn(
                'input-field pl-9',
                touched.displayName && errors.displayName && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="您的显示名称"
            />
          </div>
          {touched.displayName && errors.displayName && (
            <p className="mt-1 text-xs text-accent-danger">{errors.displayName}</p>
          )}
        </div>

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
              className={cn(
                'input-field pl-9',
                touched.email && errors.email && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="user@example.com"
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
              className={cn(
                'input-field pl-9',
                touched.phone && errors.phone && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="13800000000"
            />
          </div>
          {touched.phone && errors.phone && (
            <p className="mt-1 text-xs text-accent-danger">{errors.phone}</p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存修改
          </button>
        </div>
      </form>
    </div>
  )
}

function PasswordForm({
  loading,
  onSubmit,
}: {
  loading: boolean
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void>
}) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'oldPassword':
        if (!value) return '请输入原密码'
        return ''
      case 'newPassword':
        if (!value) return '请输入新密码'
        if (value.length < 6) return '密码至少6个字符'
        if (value.length > 32) return '密码不超过32个字符'
        if (!/[a-z]/.test(value)) return '密码需包含小写字母'
        if (!/[A-Z]/.test(value)) return '密码需包含大写字母'
        if (!/[0-9]/.test(value)) return '密码需包含数字'
        return ''
      case 'confirmPassword':
        if (!value) return '请再次输入新密码'
        if (value !== newPassword) return '两次输入的密码不一致'
        return ''
      default:
        return ''
    }
  }

  const handleChange = (name: string, value: string) => {
    if (name === 'oldPassword') setOldPassword(value)
    if (name === 'newPassword') setNewPassword(value)
    if (name === 'confirmPassword') setConfirmPassword(value)
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    }
    if (name === 'newPassword' && touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', confirmPassword) }))
    }
  }

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const value = name === 'oldPassword' ? oldPassword : name === 'newPassword' ? newPassword : confirmPassword
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateAll = (): boolean => {
    const fields = ['oldPassword', 'newPassword', 'confirmPassword']
    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      const value = field === 'oldPassword' ? oldPassword : field === 'newPassword' ? newPassword : confirmPassword
      newErrors[field] = validateField(field, value)
    })
    setErrors(newErrors)
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}))
    return !fields.some((f) => newErrors[f])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return
    await onSubmit(oldPassword, newPassword)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTouched({})
    setErrors({})
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">修改密码</h3>
      <p className="text-sm text-text-muted mb-6">
        为了账户安全，建议定期更换密码。密码需包含大小写字母和数字。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            原密码 <span className="text-accent-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showOldPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => handleChange('oldPassword', e.target.value)}
              onBlur={() => handleBlur('oldPassword')}
              className={cn(
                'input-field pr-10',
                touched.oldPassword && errors.oldPassword && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="请输入原密码"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.oldPassword && errors.oldPassword && (
            <p className="mt-1 text-xs text-accent-danger">{errors.oldPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            新密码 <span className="text-accent-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              onBlur={() => handleBlur('newPassword')}
              className={cn(
                'input-field pr-10',
                touched.newPassword && errors.newPassword && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="6-32位，包含大小写字母和数字"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.newPassword && errors.newPassword && (
            <p className="mt-1 text-xs text-accent-danger">{errors.newPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            确认新密码 <span className="text-accent-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              className={cn(
                'input-field pr-10',
                touched.confirmPassword && errors.confirmPassword && 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              )}
              placeholder="再次输入新密码"
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            修改密码
          </button>
        </div>
      </form>
    </div>
  )
}

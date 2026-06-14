import { useState, useCallback } from 'react'
import type { UserRole } from '@/stores/authStore'

export interface LoginFormState {
  username: string
  password: string
  remember: boolean
  showPassword: boolean
  usernameError: string
  passwordError: string
  touched: { username: boolean; password: boolean }
  accountType: UserRole
  autoFilled: boolean
  passwordValidated: boolean
  passwordValidationResult: 'idle' | 'success' | 'error'
}

export interface UseLoginFormReturn {
  state: LoginFormState
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  setRemember: (value: boolean) => void
  toggleShowPassword: () => void
  handleUsernameBlur: () => void
  handlePasswordBlur: () => void
  validateAll: () => boolean
  validatePasswordNow: () => boolean
  reset: () => void
  setAccountType: (role: UserRole, username: string, password: string) => void
}

const initialState: LoginFormState = {
  username: '',
  password: '',
  remember: false,
  showPassword: false,
  usernameError: '',
  passwordError: '',
  touched: { username: false, password: false },
  accountType: 'admin',
  autoFilled: false,
  passwordValidated: false,
  passwordValidationResult: 'idle',
}

export const validateUsername = (value: string): string => {
  if (!value.trim()) return '请输入用户名'
  if (value.trim().length < 3) return '用户名至少3个字符'
  if (value.trim().length > 20) return '用户名不超过20个字符'
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value.trim()))
    return '用户名仅支持中文、字母、数字和下划线'
  return ''
}

export const validatePassword = (value: string): string => {
  if (!value) return '请输入密码'
  if (value.length < 6) return '密码至少6个字符'
  if (value.length > 32) return '密码不超过32个字符'
  if (!/[a-z]/.test(value)) return '密码需包含小写字母'
  if (!/[A-Z]/.test(value)) return '密码需包含大写字母'
  if (!/[0-9]/.test(value)) return '密码需包含数字'
  return ''
}

export interface PasswordStrength {
  score: number
  label: string
  color: string
  requirements: { label: string; met: boolean }[]
}

export const calculatePasswordStrength = (value: string): PasswordStrength => {
  const requirements = [
    { label: '至少6个字符', met: value.length >= 6 },
    { label: '不超过32个字符', met: value.length <= 32 },
    { label: '包含小写字母', met: /[a-z]/.test(value) },
    { label: '包含大写字母', met: /[A-Z]/.test(value) },
    { label: '包含数字', met: /[0-9]/.test(value) },
    { label: '包含特殊字符', met: /[!@#$%^&*(),.?":{}|<>]/.test(value) },
  ]

  const metCount = requirements.filter((r) => r.met).length
  let score = 0
  let label = '弱'
  let color = 'bg-accent-danger'

  if (metCount >= 3) {
    score = 1
    label = '一般'
    color = 'bg-accent-warning'
  }
  if (metCount >= 4) {
    score = 2
    label = '中等'
    color = 'bg-accent-primary'
  }
  if (metCount >= 5) {
    score = 3
    label = '强'
    color = 'bg-accent-secondary'
  }

  return { score, label, color, requirements }
}

export function useLoginForm(initialUsername = '', initialRemember = false): UseLoginFormReturn {
  const [state, setState] = useState<LoginFormState>(() => ({
    ...initialState,
    username: initialUsername,
    remember: initialRemember,
    autoFilled: !!initialUsername,
  }))

  const setUsername = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      username: value,
      usernameError: prev.touched.username ? validateUsername(value) : '',
      autoFilled: false,
    }))
  }, [])

  const setPassword = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      password: value,
      passwordError: prev.touched.password ? validatePassword(value) : '',
      autoFilled: false,
      passwordValidated: false,
      passwordValidationResult: 'idle',
    }))
  }, [])

  const setRemember = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, remember: value }))
  }, [])

  const toggleShowPassword = useCallback(() => {
    setState((prev) => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const handleUsernameBlur = useCallback(() => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, username: true },
      usernameError: validateUsername(prev.username),
    }))
  }, [])

  const handlePasswordBlur = useCallback(() => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, password: true },
      passwordError: validatePassword(prev.password),
    }))
  }, [])

  const validateAll = useCallback((): boolean => {
    const uErr = validateUsername(state.username)
    const pErr = validatePassword(state.password)
    const pValid = !pErr
    setState((prev) => ({
      ...prev,
      touched: { username: true, password: true },
      usernameError: uErr,
      passwordError: pErr,
      passwordValidated: true,
      passwordValidationResult: pValid ? 'success' : 'error',
    }))
    return !uErr && !pErr
  }, [state.username, state.password])

  const validatePasswordNow = useCallback((): boolean => {
    const pErr = validatePassword(state.password)
    const pValid = !pErr
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, password: true },
      passwordError: pErr,
      passwordValidated: true,
      passwordValidationResult: pValid ? 'success' : 'error',
    }))
    return pValid
  }, [state.password])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const setAccountType = useCallback((role: UserRole, username: string, password: string) => {
    setState((prev) => ({
      ...prev,
      accountType: role,
      username,
      password,
      usernameError: '',
      passwordError: '',
      touched: { username: false, password: false },
      autoFilled: true,
      passwordValidated: false,
      passwordValidationResult: 'idle',
    }))
  }, [])

  return {
    state,
    setUsername,
    setPassword,
    setRemember,
    toggleShowPassword,
    handleUsernameBlur,
    handlePasswordBlur,
    validateAll,
    validatePasswordNow,
    reset,
    setAccountType,
  }
}

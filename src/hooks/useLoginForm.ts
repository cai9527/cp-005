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
  return ''
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
    setState((prev) => ({
      ...prev,
      touched: { username: true, password: true },
      usernameError: uErr,
      passwordError: pErr,
    }))
    return !uErr && !pErr
  }, [state.username, state.password])

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
    reset,
    setAccountType,
  }
}

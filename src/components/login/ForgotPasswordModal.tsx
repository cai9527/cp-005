import { useState } from 'react'
import { Mail, Phone, AlertCircle, CheckCircle, User, ArrowRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'info' | 'confirm' | 'success'

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('info')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  const handleReset = () => {
    setStep('confirm')
  }

  const handleConfirm = () => {
    setStep('success')
    setTimeout(() => {
      handleClose()
    }, 2000)
  }

  const handleClose = () => {
    setStep('info')
    setUsername('')
    setEmail('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="找回密码"
      maxWidth="max-w-md"
    >
      {step === 'info' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
            <AlertCircle className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text-primary font-medium">
                为保障账户安全，系统不支持自助密码重置
              </p>
              <p className="text-xs text-text-secondary mt-1">
                请通过以下方式联系系统管理员进行密码重置
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border-primary">
              <div className="w-10 h-10 rounded-full bg-accent-primary/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-xs text-text-muted">电子邮箱</p>
                <p className="text-sm text-text-primary font-medium">
                  admin@example.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border-primary">
              <div className="w-10 h-10 rounded-full bg-accent-secondary/15 flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent-secondary" />
              </div>
              <div>
                <p className="text-xs text-text-muted">联系电话</p>
                <p className="text-sm text-text-primary font-medium">
                  138-0000-0001
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary pt-4">
            <p className="text-xs text-text-muted mb-3">
              或者，您可以填写以下信息提交重置申请
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  用户名 <span className="text-accent-danger">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入您的用户名"
                    className="input-field pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  注册邮箱 <span className="text-accent-danger">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册时使用的邮箱"
                    className="input-field pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-secondary"
            >
              返回登录
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!username.trim() || !email.trim()}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交申请
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
            <AlertCircle className="w-5 h-5 text-accent-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text-primary font-medium">
                请确认您的申请信息
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-primary space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">用户名</span>
              <span className="text-sm text-text-primary font-medium">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">注册邮箱</span>
              <span className="text-sm text-text-primary font-medium">{email}</span>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            系统管理员将在 1-2 个工作日内处理您的申请，并通过邮件发送临时密码。请注意查收。
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('info')}
              className="flex-1 btn-secondary"
            >
              返回修改
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              确认提交
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-secondary/15 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent-secondary" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-text-primary mb-1">
              申请提交成功！
            </h4>
            <p className="text-sm text-text-secondary">
              我们已收到您的密码重置申请
            </p>
          </div>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            管理员将尽快处理，并通过 {email} 发送临时密码，请耐心等待。
          </p>
        </div>
      )}
    </Modal>
  )
}

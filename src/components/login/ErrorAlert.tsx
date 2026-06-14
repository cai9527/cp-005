import { AlertCircle } from 'lucide-react'

interface ErrorAlertProps {
  message: string
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null

  return (
    <div className="mb-5 px-4 py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
      <AlertCircle className="w-4 h-4 text-accent-danger flex-shrink-0 mt-0.5" />
      <span className="text-sm text-accent-danger">{message}</span>
    </div>
  )
}

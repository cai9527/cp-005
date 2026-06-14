import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoginButtonProps {
  loading?: boolean
  disabled?: boolean
  label?: string
  loadingLabel?: string
}

export default function LoginButton({
  loading = false,
  disabled = false,
  label = '登 录',
  loadingLabel = '登录中...',
}: LoginButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={cn(
        'w-full h-11 flex items-center justify-center gap-2 rounded-lg font-medium text-sm',
        'transition-all duration-200 active:scale-[0.98] select-none',
        loading
          ? 'bg-accent-primary/10 text-accent-primary/50 cursor-wait border border-accent-primary/30'
          : disabled
            ? 'bg-bg-tertiary text-text-muted border border-border-primary cursor-not-allowed'
            : 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50 hover:bg-accent-primary/30 hover:shadow-glow-primary'
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  )
}

import { cn } from '@/lib/utils'

interface RememberCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function RememberCheckbox({
  checked,
  onChange,
  label = '记住我',
}: RememberCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-all duration-200',
          checked
            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
            : 'border-border-secondary bg-bg-tertiary group-hover:border-border-secondary/80'
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
        {label}
      </span>
    </label>
  )
}

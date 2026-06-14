import { Radio } from 'lucide-react'

interface LoginHeaderProps {
  title?: string
  subtitle?: string
}

export default function LoginHeader({
  title = '智慧工地塔机监测',
  subtitle = 'Tower Crane Monitoring System',
}: LoginHeaderProps) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-16 h-16 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center mb-4 shadow-glow-primary">
        <Radio className="w-8 h-8 text-accent-primary" />
      </div>
      <h1 className="font-display text-2xl font-bold text-text-primary tracking-wide">
        {title}
      </h1>
      <p className="text-sm text-text-muted mt-2">{subtitle}</p>
    </div>
  )
}

import { cn } from '@/lib/utils'

interface GaugeChartProps {
  value: number
  max: number
  label: string
  unit: string
  size?: number
  warnPercent?: number
  dangerPercent?: number
}

export default function GaugeChart({
  value,
  max,
  label,
  unit,
  size = 120,
  warnPercent = 80,
  dangerPercent = 95,
}: GaugeChartProps) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const arcAngle = 270
  const startAngle = 135

  const circumference = 2 * Math.PI * radius
  const arcLength = (arcAngle / 360) * circumference

  const percent = Math.min((value / max) * 100, 100)
  const valueLength = (percent / 100) * arcLength

  const color =
    percent >= dangerPercent
      ? '#FF6B35'
      : percent >= warnPercent
        ? '#FFD600'
        : '#00E676'

  const startRad = (startAngle * Math.PI) / 180
  const x1 = center + radius * Math.cos(startRad)
  const y1 = center + radius * Math.sin(startRad)
  const endRad = ((startAngle + arcAngle) * Math.PI) / 180
  const x2 = center + radius * Math.cos(endRad)
  const y2 = center + radius * Math.sin(endRad)

  const largeArc = arcAngle > 180 ? 1 : 0

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke="#2A3A4E"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={arcLength - valueLength}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-display font-bold"
          fill="#FFFFFF"
          fontSize={size * 0.22}
        >
          {value}
        </text>
        <text
          x={center}
          y={center + size * 0.14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#A0AEC0"
          fontSize={size * 0.1}
        >
          {unit}
        </text>
      </svg>
      <span className="text-xs text-text-secondary mt-0.5">{label}</span>
    </div>
  )
}

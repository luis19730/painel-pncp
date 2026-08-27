'use client'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
}

function getScoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 80) return { bg: 'bg-emerald-100 border-emerald-400', text: 'text-emerald-700', label: 'Excelente' }
  if (score >= 60) return { bg: 'bg-blue-100 border-blue-400', text: 'text-blue-700', label: 'Boa' }
  if (score >= 40) return { bg: 'bg-yellow-100 border-yellow-400', text: 'text-yellow-700', label: 'Avaliar' }
  return { bg: 'bg-gray-100 border-gray-400', text: 'text-gray-500', label: 'Baixa' }
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const { bg, text, label } = getScoreColor(clamped)

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} ${bg} ${text} rounded-full border-2 flex items-center justify-center font-bold`}
      >
        {clamped}
      </div>
      <span className={`${text} text-xs font-medium`}>{label}</span>
    </div>
  )
}

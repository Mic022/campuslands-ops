import React from 'react'

interface BadgeProps {
  label: string
  variant?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'neutral'
  size?: 'sm' | 'md'
  showDot?: boolean
}

const variantStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  emerald: {
    bg: 'bg-[#00FF9D]/10',
    text: 'text-[#00FF9D]',
    dot: 'bg-[#00FF9D] shadow-[0_0_10px_#00FF9D]',
    border: 'border-[#00FF9D]/40'
  },
  amber: {
    bg: 'bg-[#FFB703]/10',
    text: 'text-[#FFB703]',
    dot: 'bg-[#FFB703] shadow-[0_0_10px_#FFB703]',
    border: 'border-[#FFB703]/40'
  },
  rose: {
    bg: 'bg-[#FF2A55]/15',
    text: 'text-[#FF2A55]',
    dot: 'bg-[#FF2A55] shadow-[0_0_10px_#FF2A55]',
    border: 'border-[#FF2A55]/40'
  },
  sky: {
    bg: 'bg-[#00F5FF]/10',
    text: 'text-[#00F5FF]',
    dot: 'bg-[#00F5FF] shadow-[0_0_10px_#00F5FF]',
    border: 'border-[#00F5FF]/40'
  },
  violet: {
    bg: 'bg-[#9D4EDD]/15',
    text: 'text-[#C77DFF]',
    dot: 'bg-[#9D4EDD] shadow-[0_0_10px_#9D4EDD]',
    border: 'border-[#9D4EDD]/40'
  },
  neutral: {
    bg: 'bg-white/5',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    border: 'border-white/10'
  }
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral
  const sizeClass = size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full border backdrop-blur-md ${styles.bg} ${styles.text} ${styles.border} ${sizeClass}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      <span className="capitalize tracking-wider">{label}</span>
    </span>
  )
}

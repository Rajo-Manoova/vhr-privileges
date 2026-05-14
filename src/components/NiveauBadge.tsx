import type { Palier } from '@/types'
import { PALIER_LABELS, PALIER_COLORS, PALIER_EMOJI } from '@/types'

interface Props {
  niveau: Palier
  size?: 'sm' | 'md'
  showEmoji?: boolean
}

export default function NiveauBadge({ niveau, size = 'sm', showEmoji = false }: Props) {
  const c = PALIER_COLORS[niveau]
  const fontSize = size === 'md' ? '0.8125rem' : '0.6875rem'
  const padding  = size === 'md' ? '0.3rem 0.7rem' : '0.15rem 0.5rem'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding,
      borderRadius: 9999,
      fontSize,
      fontWeight: 700,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap' as const,
      letterSpacing: '0.02em',
      fontFamily: 'var(--font-body)',
    }}>
      {showEmoji && <span style={{ fontSize: '0.75em' }}>{PALIER_EMOJI[niveau]}</span>}
      {PALIER_LABELS[niveau]}
    </span>
  )
}
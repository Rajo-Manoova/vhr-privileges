'use client'

import { useState, useTransition } from 'react'
import { updateMemberNiveau } from '@/app/actions/members'
import type { Palier } from '@/types'
import { PALIER_LABELS, PALIER_COLORS } from '@/types'

interface Props {
  memberId: string
  niveau: Palier
  memberName: string
}

const PALIERS: Palier[] = ['membre', 'argent', 'or', 'vip']

export default function NiveauSelect({ memberId, niveau: initial, memberName }: Props) {
  const [niveau, setNiveau] = useState<Palier>(initial)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Palier
    setNiveau(next)
    startTransition(async () => {
      await updateMemberNiveau(memberId, next)
    })
  }

  const c = PALIER_COLORS[niveau]

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={niveau}
        onChange={handleChange}
        disabled={isPending}
        title={`Niveau de ${memberName}`}
        style={{
          appearance: 'none',
          padding: '0.15rem 1.5rem 0.15rem 0.5rem',
          borderRadius: 9999,
          fontSize: '0.6875rem',
          fontWeight: 700,
          background: isPending ? 'var(--bg-2)' : c.bg,
          color: isPending ? 'var(--text-4)' : c.color,
          border: `1px solid ${isPending ? 'var(--border)' : c.border}`,
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.02em',
          transition: 'all 150ms ease',
          outline: 'none',
        }}
      >
        {PALIERS.map(p => (
          <option key={p} value={p}>{PALIER_LABELS[p]}</option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        style={{
          position: 'absolute', right: '0.375rem', top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          color: isPending ? 'var(--text-4)' : c.color,
        }}
        width="8" height="8" viewBox="0 0 10 6" fill="none"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
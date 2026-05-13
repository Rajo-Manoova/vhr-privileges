'use client'

import { useState } from 'react'
import { toggleLotField } from '@/app/actions/lots'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  lotId: string
  disponible: boolean
  lotNom: string
}

export default function ToggleLotButton({ lotId, disponible, lotNom }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    const action = disponible ? 'Désactiver' : 'Réactiver'
    if (!confirm(`${action} le lot "${lotNom}" ?`)) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 0))
    await toggleLotField(lotId, 'disponible', !disponible)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={disponible ? `Désactiver "${lotNom}"` : `Réactiver "${lotNom}"`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
        border: `1px solid ${disponible ? '#fca5a5' : '#86efac'}`,
        background: disponible ? '#fff1f2' : '#f0fdf4',
        color: disponible ? '#dc2626' : '#16a34a',
        fontSize: '0.6875rem', fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >
      {loading ? (
        <span className="animate-spin" style={{
          width: 11, height: 11, borderRadius: '50%',
          border: '2px solid currentColor', borderTopColor: 'transparent',
          display: 'inline-block', opacity: 0.6,
        }} />
      ) : disponible ? (
        <><EyeOff size={11} /> Désactiver</>
      ) : (
        <><Eye size={11} /> Activer</>
      )}
    </button>
  )
}
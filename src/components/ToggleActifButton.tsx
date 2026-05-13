'use client'

import { useState } from 'react'
import { toggleMemberActif } from '@/app/actions/members'
import { useRouter } from 'next/navigation'
import { UserCheck, UserX } from 'lucide-react'

interface Props {
  memberId: string
  actif: boolean
  memberName: string
}

export default function ToggleActifButton({ memberId, actif, memberName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    const action = actif ? 'désactiver' : 'réactiver'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le compte de ${memberName} ?`)) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 0))
    await toggleMemberActif(memberId, !actif)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={actif ? `Désactiver ${memberName}` : `Réactiver ${memberName}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
        border: `1px solid ${actif ? '#fca5a5' : '#86efac'}`,
        background: actif ? '#fff1f2' : '#f0fdf4',
        color: actif ? '#dc2626' : '#16a34a',
        fontSize: '0.6875rem', fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {loading ? (
        <span className="animate-spin" style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', opacity: 0.6 }} />
      ) : actif ? (
        <><UserX size={11} /> Désactiver</>
      ) : (
        <><UserCheck size={11} /> Réactiver</>
      )}
    </button>
  )
}
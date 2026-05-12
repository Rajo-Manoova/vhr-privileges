'use client'

import { useState } from 'react'
import { removeCommande } from '@/app/actions/commandes'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteCommandeButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    if (!confirm('Supprimer cette commande ?')) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 0))
    await removeCommande(id)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      style={{
        width: 30, height: 30, borderRadius: '0.5rem',
        border: 'none', background: 'transparent',
        color: 'var(--text-4)',
        cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms ease', flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!loading) {
          (e.currentTarget as HTMLElement).style.background = '#fee2e2'
          ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-4)'
      }}
    >
      {loading
        ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#dc2626', display: 'inline-block' }} />
        : <Trash2 size={13} />
      }
    </button>
  )
}
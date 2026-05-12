'use client'

import { useActionState } from 'react'
import { updateMember } from '@/app/actions/members'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'
import { CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'

interface Member {
  id: string
  prenom: string
  nom: string | null
  email: string
  whatsapp: string
  etape: Etape
}

export default function MemberEditForm({ member }: { member: Member }) {
  const [state, action, isPending] = useActionState(updateMember, null)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={member.id} />

      {state?.error && (
        <div className="alert alert-error">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem' }}>{state.error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label className="label" htmlFor="edit-prenom">Prénom *</label>
          <input id="edit-prenom" name="prenom" type="text" className="input" defaultValue={member.prenom} required />
        </div>
        <div>
          <label className="label" htmlFor="edit-nom">Nom</label>
          <input id="edit-nom" name="nom" type="text" className="input" defaultValue={member.nom ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="edit-email">Email *</label>
          <input id="edit-email" name="email" type="email" className="input" defaultValue={member.email} required />
        </div>
        <div>
          <label className="label" htmlFor="edit-whatsapp">WhatsApp *</label>
          <input id="edit-whatsapp" name="whatsapp" type="tel" className="input" defaultValue={member.whatsapp} required />
        </div>
        <div>
          <label className="label" htmlFor="edit-etape">Étape *</label>
          <div style={{ position: 'relative' }}>
            <select id="edit-etape" name="etape" className="input" defaultValue={member.etape} required
              style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
              {(Object.entries(ETAPE_LABELS) as [Etape, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
            border: 'none', background: isPending ? 'var(--brand-mid)' : 'var(--brand)',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
            cursor: isPending ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 150ms ease',
          }}
        >
          {isPending
            ? <><span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Enregistrement…</>
            : <><CheckCircle2 size={13} /> Enregistrer</>
          }
        </button>
      </div>
    </form>
  )
}
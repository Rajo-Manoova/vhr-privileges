'use client'

import { useActionState } from 'react'
import { updateCommande } from '@/app/actions/commandes'
import { CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'

type Commande = {
  id: string
  montant_ar: number
  commande_date: string
  statut: string
  members: { prenom: string; nom: string | null } | null
}

export default function CommandeEditForm({ commande }: { commande: Commande }) {
  const [state, action, isPending] = useActionState(updateCommande, null)

  const memberName = commande.members
    ? `${commande.members.prenom} ${commande.members.nom ?? ''}`.trim()
    : '—'

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={commande.id} />

      <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '-0.25rem' }}>
        Commande de <strong>{memberName}</strong>
      </div>

      {state?.error && (
        <div className="alert alert-error">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem' }}>{state.error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label className="label" htmlFor="edit-montant">Montant (Ar) *</label>
          <input
            id="edit-montant" name="montant_ar" type="number"
            className="input" defaultValue={commande.montant_ar}
            min={1} required
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-date">Date *</label>
          <input
            id="edit-date" name="commande_date" type="date"
            className="input" defaultValue={commande.commande_date.split('T')[0]}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-statut">Statut *</label>
          <div style={{ position: 'relative' }}>
            <select
              id="edit-statut" name="statut" className="input"
              defaultValue={commande.statut}
              style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
            >
              <option value="active">Active</option>
              <option value="annulee">Annulée</option>
              <option value="remboursee">Remboursée</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          type="submit" disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
            border: 'none', background: isPending ? 'rgba(15,45,53,0.5)' : 'var(--brand)',
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
        <Link
          href="/commandes"
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            border: '1.5px solid var(--border)', background: 'transparent',
            color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600,
            textDecoration: 'none', fontFamily: 'var(--font-body)',
          }}
        >
          Annuler
        </Link>
      </div>
    </form>
  )
}
'use client'

import { useState, useActionState } from 'react'
import { addCommande } from '@/app/actions/commandes'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'

type Member = { id: string; prenom: string; nom: string | null; email: string }

export default function CommandeAddForm({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]

  const [formState, formAction, isPending] = useActionState(
    async (prev: any, fd: FormData) => {
      const result = await addCommande(prev, fd)
      if (result.success) { setOpen(false); router.refresh() }
      return result
    }, null
  )

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          background: open ? 'var(--bg-2)' : 'var(--brand)',
          color: open ? 'var(--text-2)' : 'white',
          border: 'none', cursor: 'pointer',
          fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          transition: 'all 150ms ease',
        }}
      >
        <Plus size={13} /> Ajouter
      </button>

      {open && (
        <div style={{
          marginTop: '1rem',
          padding: '1.25rem',
          background: 'var(--bg-0)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          animation: 'fadeIn 0.2s ease both',
        }}>
          {formState?.error && (
            <div className="alert alert-error" style={{ marginBottom: '0.875rem' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>{formState.error}</span>
            </div>
          )}

          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="label" htmlFor="add-member">Membre *</label>
              <div style={{ position: 'relative' }}>
                <select id="add-member" name="member_id" className="input" required defaultValue=""
                  style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                  <option value="" disabled>Sélectionner un membre…</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.prenom} {m.nom ?? ''} — {m.email}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label className="label" htmlFor="add-montant">Montant (Ar) *</label>
                <input id="add-montant" name="montant_ar" type="number" className="input" placeholder="800000" min={1} required />
              </div>
              <div>
                <label className="label" htmlFor="add-date">Date *</label>
                <input id="add-date" name="commande_date" type="date" className="input" defaultValue={today} required />
              </div>
              <div>
                <label className="label" htmlFor="add-statut">Statut</label>
                <div style={{ position: 'relative' }}>
                  <select id="add-statut" name="statut" className="input" defaultValue="active"
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="active">Active</option>
                    <option value="annulee">Annulée</option>
                    <option value="remboursee">Remboursée</option>
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Annuler
              </button>
              <button type="submit" disabled={isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: isPending ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isPending ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                {isPending
                  ? <><span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Ajout…</>
                  : <><CheckCircle2 size={13} /> Enregistrer</>
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
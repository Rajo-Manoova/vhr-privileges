'use client'

import { useActionState } from 'react'
import { updateLot } from '@/app/actions/lots'
import { CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { Lot, LotCategorie, LotPalier } from '@/types'

const PALIER_LABELS: Record<LotPalier, string> = {
  soiree: 'Soirée 16 Mai', tirage_27mai: 'Tirage 27 Mai',
  argent: 'Argent', or: 'Or', vip: 'VIP',
}

export default function LotEditForm({ lot }: { lot: Lot }) {
  const [state, action, isPending] = useActionState(updateLot, null)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={lot.id} />

      {state?.error && (
        <div className="alert alert-error">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem' }}>{state.error}</span>
        </div>
      )}

      <div>
        <label className="label" htmlFor="edit-lot-nom">Nom *</label>
        <input id="edit-lot-nom" name="nom" type="text" className="input" defaultValue={lot.nom} required />
      </div>

      <div>
        <label className="label" htmlFor="edit-lot-desc">Description</label>
        <input id="edit-lot-desc" name="description" type="text" className="input" defaultValue={lot.description ?? ''} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label className="label" htmlFor="edit-lot-cat">Catégorie *</label>
          <div style={{ position: 'relative' }}>
            <select id="edit-lot-cat" name="categorie" className="input" defaultValue={lot.categorie} required
              style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
              <option value="petit">Découverte</option>
              <option value="gros">Prestige</option>
              <option value="tres_gros">Grand Prix</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="edit-lot-pal">Programme *</label>
          <div style={{ position: 'relative' }}>
            <select id="edit-lot-pal" name="palier" className="input" defaultValue={lot.palier} required
              style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
              {(Object.entries(PALIER_LABELS) as [LotPalier, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="edit-lot-stock">Stock</label>
          <input id="edit-lot-stock" name="stock" type="number" className="input" defaultValue={lot.stock} min={0} />
        </div>
        <div>
          <label className="label" htmlFor="edit-lot-valeur">Valeur (Ar)</label>
          <input id="edit-lot-valeur" name="valeur_ar" type="number" className="input" defaultValue={lot.valeur_ar ?? ''} min={0} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button type="submit" disabled={isPending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: isPending ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isPending ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
          {isPending
            ? <><span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Enregistrement…</>
            : <><CheckCircle2 size={13} /> Enregistrer</>
          }
        </button>
        <Link href="/catalogue" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
          Annuler
        </Link>
      </div>
    </form>
  )
}
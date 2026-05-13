'use client'

import { useState, useActionState } from 'react'
import { addLot, deleteLot, toggleLotField } from '@/app/actions/lots'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import type { LotPalier, LotCategorie } from '@/types'
import { PALIER_LOT_LABELS, CATEGORIE_LABELS } from '@/types'

export default function CatalogueManager() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [formState, formAction, isPending] = useActionState(
    async (prev: any, fd: FormData) => {
      const result = await addLot(prev, fd)
      if (result.success) { setOpen(false); router.refresh() }
      return result
    }, null
  )

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
          background: open ? 'var(--bg-2)' : 'var(--brand)',
          color: open ? 'var(--text-2)' : 'white',
          border: 'none', cursor: 'pointer',
          fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          transition: 'all 150ms ease',
        }}
      >
        <Plus size={15} />
        {open ? 'Annuler' : 'Ajouter un lot'}
      </button>

      {open && (
        <div className="card animate-fade-in" style={{ marginTop: '1rem', maxWidth: 640, borderLeft: '3px solid var(--brand)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Nouveau lot
          </div>

          {formState?.error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>{formState.error}</span>
            </div>
          )}

          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="lot-nom">Nom *</label>
              <input id="lot-nom" name="nom" type="text" className="input" placeholder="dreame H15 Pro Aspirateur" required />
            </div>
            <div>
              <label className="label" htmlFor="lot-desc">Description</label>
              <input id="lot-desc" name="description" type="text" className="input" placeholder="Description courte (optionnel)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>

              {/* Catégorie */}
              <div>
                <label className="label" htmlFor="lot-cat">Catégorie *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-cat" name="categorie" className="input" required defaultValue=""
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Catégorie…</option>
                    {(Object.entries(CATEGORIE_LABELS) as [LotCategorie, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Programme */}
              <div>
                <label className="label" htmlFor="lot-pal">Programme *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-pal" name="palier" className="input" required defaultValue=""
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Programme…</option>
                    {(Object.entries(PALIER_LOT_LABELS) as [LotPalier, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="lot-stock">Stock</label>
                <input id="lot-stock" name="stock" type="number" className="input" defaultValue={1} min={0} />
              </div>

              <div>
                <label className="label" htmlFor="lot-valeur">Valeur (Ar)</label>
                <input id="lot-valeur" name="valeur_ar" type="number" className="input" placeholder="Interne" min={0} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Annuler
              </button>
              <button type="submit" disabled={isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: isPending ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isPending ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                {isPending
                  ? <><span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Ajout…</>
                  : <><CheckCircle2 size={14} /> Ajouter au catalogue</>
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
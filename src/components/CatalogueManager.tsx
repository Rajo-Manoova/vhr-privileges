'use client'

import { useState, useActionState } from 'react'
import { addLot, deleteLot, toggleLotField } from '@/app/actions/lots'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, EyeOff, Star, ChevronDown, AlertCircle, CheckCircle2, Package } from 'lucide-react'
import type { Lot, LotPalier } from '@/types'

const PALIER_LABELS: Record<LotPalier, string> = {
  soiree:      'Soirée 16 Mai',
  tirage_27mai: 'Tirage 27 Mai',
  argent:      'Argent',
  or:          'Or',
  vip:         'VIP',
}

const PALIER_ORDER: LotPalier[] = ['soiree', 'tirage_27mai', 'argent', 'or', 'vip']

interface Props { initialLots: Lot[] }

export default function CatalogueManager({ initialLots }: Props) {
  const [lots, setLots] = useState(initialLots)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouter()

  const [formState, formAction, isPending] = useActionState(
    async (prev: any, fd: FormData) => {
      const result = await addLot(prev, fd)
      if (result.success) { setShowForm(false); router.refresh() }
      return result
    }, null
  )

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer le lot « ${nom} » ?`)) return
    setDeletingId(id)
    const result = await deleteLot(id)
    if (result.success) setLots(prev => prev.filter(l => l.id !== id))
    setDeletingId(null)
  }

  async function handleToggle(id: string, field: 'disponible' | 'mis_en_avant', current: boolean) {
    setTogglingId(`${id}-${field}`)
    const result = await toggleLotField(id, field, !current)
    if (result.success) {
      setLots(prev => prev.map(l => l.id === id ? { ...l, [field]: !current } : l))
    }
    setTogglingId(null)
  }

  const byPalier = (palier: LotPalier) => lots.filter(l => l.palier === palier)

  return (
    <div>
      {/* Bouton ajouter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
            background: showForm ? 'var(--bg-2)' : 'var(--brand)',
            color: showForm ? 'var(--text-2)' : 'white',
            border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={14} /> {showForm ? 'Annuler' : 'Ajouter un lot'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Nouveau lot
          </div>
          {formState?.error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>{formState.error}</span>
            </div>
          )}
          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="label" htmlFor="lot-nom">Nom du lot *</label>
              <input id="lot-nom" name="nom" type="text" className="input" placeholder="Kit Atelier DeWalt T-Stak" required />
            </div>
            <div>
              <label className="label" htmlFor="lot-desc">Description</label>
              <input id="lot-desc" name="description" type="text" className="input" placeholder="Description courte (optionnel)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {/* Catégorie */}
              <div>
                <label className="label" htmlFor="lot-cat">Catégorie *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-cat" name="categorie" className="input" required defaultValue="" style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Catégorie…</option>
                    <option value="petit">Petit</option>
                    <option value="gros">Gros</option>
                    <option value="tres_gros">Très gros</option>
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>
              {/* Palier */}
              <div>
                <label className="label" htmlFor="lot-pal">Palier *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-pal" name="palier" className="input" required defaultValue="" style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Palier…</option>
                    {PALIER_ORDER.map(p => <option key={p} value={p}>{PALIER_LABELS[p]}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>
              {/* Stock */}
              <div>
                <label className="label" htmlFor="lot-stock">Stock</label>
                <input id="lot-stock" name="stock" type="number" className="input" defaultValue={1} min={0} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="lot-valeur">Valeur estimée (Ar)</label>
              <input id="lot-valeur" name="valeur_ar" type="number" className="input" placeholder="800000 (optionnel — interne)" min={0} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: isPending ? 0.7 : 1 }}>
                {isPending ? 'Ajout…' : <><CheckCircle2 size={13} /> Ajouter</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste par palier */}
      {PALIER_ORDER.map(palier => {
        const items = byPalier(palier)
        if (items.length === 0) return null
        return (
          <div key={palier} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
                {PALIER_LABELS[palier]}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontWeight: 600 }}>({items.length})</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {items.map((lot, i) => (
                <div key={lot.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto auto',
                  alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Nom */}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: lot.disponible ? 'var(--text-1)' : 'var(--text-4)', textDecoration: lot.disponible ? 'none' : 'line-through' }}>
                      {lot.nom}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', marginTop: '0.125rem' }}>
                      {lot.categorie} · stock {lot.stock}
                      {lot.valeur_ar ? ` · ${new Intl.NumberFormat('fr-FR').format(lot.valeur_ar)} Ar` : ''}
                    </div>
                  </div>

                  {/* Mis en avant */}
                  <button
                    onClick={() => handleToggle(lot.id, 'mis_en_avant', lot.mis_en_avant)}
                    disabled={togglingId === `${lot.id}-mis_en_avant`}
                    title={lot.mis_en_avant ? 'Retirer la mise en avant' : 'Mettre en avant'}
                    style={{
                      width: 28, height: 28, borderRadius: '0.375rem',
                      border: 'none', background: lot.mis_en_avant ? '#fef3c7' : 'transparent',
                      color: lot.mis_en_avant ? 'var(--accent)' : 'var(--text-4)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Star size={13} fill={lot.mis_en_avant ? 'currentColor' : 'none'} />
                  </button>

                  {/* Disponible */}
                  <button
                    onClick={() => handleToggle(lot.id, 'disponible', lot.disponible)}
                    disabled={togglingId === `${lot.id}-disponible`}
                    title={lot.disponible ? 'Désactiver' : 'Activer'}
                    style={{
                      width: 28, height: 28, borderRadius: '0.375rem',
                      border: 'none', background: lot.disponible ? '#dcfce7' : 'var(--bg-1)',
                      color: lot.disponible ? '#16a34a' : 'var(--text-4)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {lot.disponible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => handleDelete(lot.id, lot.nom)}
                    disabled={deletingId === lot.id}
                    style={{
                      width: 28, height: 28, borderRadius: '0.375rem',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-4)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                  >
                    {deletingId === lot.id
                      ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text-4)', display: 'inline-block' }} />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {lots.length === 0 && (
        <div className="empty-state">
          <Package size={32} />
          <h3>Aucun lot</h3>
          <p>Ajoutez des lots au catalogue.</p>
        </div>
      )}
    </div>
  )
}
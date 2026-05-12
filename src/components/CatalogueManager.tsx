'use client'

import { useState, useActionState } from 'react'
import { addLot, deleteLot, toggleLotField } from '@/app/actions/lots'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Eye, EyeOff, Star, ChevronDown,
  AlertCircle, CheckCircle2, Package, Sparkles, Crown, Trophy
} from 'lucide-react'
import type { Lot, LotPalier, LotCategorie } from '@/types'
import { CATEGORIE_LABELS, CATEGORIE_COLORS } from '@/types'

const PALIER_LABELS: Record<LotPalier, string> = {
  soiree:       'Soirée 16 Mai',
  tirage_27mai: 'Tirage 27 Mai',
  argent:       'Argent',
  or:           'Or',
  vip:          'VIP',
}

const PALIER_ICONS: Record<LotPalier, React.ElementType> = {
  soiree:       Sparkles,
  tirage_27mai: Trophy,
  argent:       Package,
  or:           Star,
  vip:          Crown,
}

const PALIER_ORDER: LotPalier[] = ['soiree', 'tirage_27mai', 'argent', 'or', 'vip']

const PALIER_COLORS: Record<LotPalier, { header: string; text: string }> = {
  soiree:       { header: 'var(--brand)',  text: 'white'   },
  tirage_27mai: { header: '#0f766e',       text: 'white'   },
  argent:       { header: '#475569',       text: 'white'   },
  or:           { header: '#d97706',       text: 'white'   },
  vip:          { header: '#7c3aed',       text: 'white'   },
}

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
    if (!confirm(`Supprimer « ${nom} » ?`)) return
    setDeletingId(id)
    await new Promise(r => setTimeout(r, 0))
    const result = await deleteLot(id)
    if (result.success) setLots(prev => prev.filter(l => l.id !== id))
    setDeletingId(null)
  }

  async function handleToggle(id: string, field: 'disponible' | 'mis_en_avant', current: boolean) {
    setTogglingId(`${id}-${field}`)
    await new Promise(r => setTimeout(r, 0))
    const result = await toggleLotField(id, field, !current)
    if (result.success) setLots(prev => prev.map(l => l.id === id ? { ...l, [field]: !current } : l))
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
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
            background: showForm ? 'var(--bg-2)' : 'var(--brand)',
            color: showForm ? 'var(--text-2)' : 'white',
            border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
            transition: 'all 150ms ease',
          }}
        >
          <Plus size={15} />
          {showForm ? 'Annuler' : 'Ajouter un lot'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="card animate-fade-in" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--brand)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1.25rem' }}>
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
              <label className="label" htmlFor="lot-nom">Nom du lot *</label>
              <input id="lot-nom" name="nom" type="text" className="input" placeholder="dreame H15 Pro Aspirateur Laveur" required />
            </div>
            <div>
              <label className="label" htmlFor="lot-desc">Description</label>
              <input id="lot-desc" name="description" type="text" className="input" placeholder="Description courte (optionnel)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label className="label" htmlFor="lot-cat">Catégorie *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-cat" name="categorie" className="input" required defaultValue="" style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Catégorie…</option>
                    <option value="petit">Découverte</option>
                    <option value="gros">Prestige</option>
                    <option value="tres_gros">Grand Prix</option>
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="lot-pal">Programme *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-pal" name="palier" className="input" required defaultValue="" style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Programme…</option>
                    {PALIER_ORDER.map(p => <option key={p} value={p}>{PALIER_LABELS[p]}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: isPending ? 'var(--brand-mid)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isPending ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                {isPending
                  ? <><span className="animate-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Ajout en cours…</>
                  : <><CheckCircle2 size={14} /> Ajouter au catalogue</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Catalogue par palier */}
      {PALIER_ORDER.map(palier => {
        const items = byPalier(palier)
        if (items.length === 0) return null
        const pc = PALIER_COLORS[palier]
        const Icon = PALIER_ICONS[palier]

        return (
          <div key={palier} style={{ marginBottom: '2rem' }}>
            {/* Header du palier */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              background: pc.header,
              borderRadius: '0.875rem 0.875rem 0 0',
              borderBottom: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Icon size={16} style={{ color: pc.text, opacity: 0.9 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9375rem', color: pc.text, letterSpacing: '-0.01em' }}>
                  {PALIER_LABELS[palier]}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {items.length} lot{items.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Lots */}
            <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 0.875rem 0.875rem', overflow: 'hidden' }}>
              {items.map((lot, i) => {
                const cc = CATEGORIE_COLORS[lot.categorie as LotCategorie]
                return (
                  <div
                    key={lot.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1.25rem',
                      background: lot.disponible ? 'white' : 'var(--bg-1)',
                      borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 150ms ease',
                    }}
                  >
                    {/* Infos lot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {/* Badge catégorie */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '0.2rem 0.625rem',
                        borderRadius: 9999,
                        fontSize: '0.6875rem', fontWeight: 700,
                        whiteSpace: 'nowrap',
                        background: cc.bg, color: cc.color,
                        flexShrink: 0,
                      }}>
                        {CATEGORIE_LABELS[lot.categorie as LotCategorie]}
                      </span>

                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.875rem', fontWeight: 600,
                          color: lot.disponible ? 'var(--text-1)' : 'var(--text-4)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: lot.disponible ? 'none' : 'line-through',
                        }}>
                          {lot.nom}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', marginTop: '0.125rem' }}>
                          Stock : {lot.stock}
                          {lot.valeur_ar ? ` · ${new Intl.NumberFormat('fr-FR').format(lot.valeur_ar)} Ar` : ''}
                          {!lot.disponible && ' · Désactivé'}
                          {lot.mis_en_avant && ' · ★ Mis en avant'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      {/* Mise en avant */}
                      <button
                        onClick={() => handleToggle(lot.id, 'mis_en_avant', lot.mis_en_avant)}
                        disabled={!!togglingId}
                        title={lot.mis_en_avant ? 'Retirer la mise en avant' : 'Mettre en avant'}
                        style={{
                          width: 30, height: 30, borderRadius: '0.5rem',
                          border: 'none',
                          background: lot.mis_en_avant ? '#fef3c7' : 'var(--bg-1)',
                          color: lot.mis_en_avant ? '#d97706' : 'var(--text-4)',
                          cursor: togglingId ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                          flexShrink: 0,
                        }}
                      >
                        {togglingId === `${lot.id}-mis_en_avant`
                          ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#d97706', display: 'inline-block' }} />
                          : <Star size={13} fill={lot.mis_en_avant ? 'currentColor' : 'none'} />
                        }
                      </button>

                      {/* Disponibilité */}
                      <button
                        onClick={() => handleToggle(lot.id, 'disponible', lot.disponible)}
                        disabled={!!togglingId}
                        title={lot.disponible ? 'Désactiver' : 'Activer'}
                        style={{
                          width: 30, height: 30, borderRadius: '0.5rem',
                          border: 'none',
                          background: lot.disponible ? '#dcfce7' : 'var(--bg-1)',
                          color: lot.disponible ? '#16a34a' : 'var(--text-4)',
                          cursor: togglingId ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                          flexShrink: 0,
                        }}
                      >
                        {togglingId === `${lot.id}-disponible`
                          ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#16a34a', display: 'inline-block' }} />
                          : lot.disponible ? <Eye size={13} /> : <EyeOff size={13} />
                        }
                      </button>

                      {/* Supprimer */}
                      <button
                        onClick={() => handleDelete(lot.id, lot.nom)}
                        disabled={deletingId === lot.id || !!togglingId}
                        title="Supprimer"
                        style={{
                          width: 30, height: 30, borderRadius: '0.5rem',
                          border: 'none', background: 'transparent',
                          color: 'var(--text-4)',
                          cursor: deletingId === lot.id ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                          if (deletingId !== lot.id) {
                            (e.currentTarget as HTMLElement).style.background = '#fee2e2'
                            ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
                          }
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-4)'
                        }}
                      >
                        {deletingId === lot.id
                          ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#dc2626', display: 'inline-block' }} />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {lots.length === 0 && (
        <div className="empty-state">
          <Package size={32} />
          <h3>Catalogue vide</h3>
          <p>Ajoutez des lots pour démarrer.</p>
        </div>
      )}
    </div>
  )
}
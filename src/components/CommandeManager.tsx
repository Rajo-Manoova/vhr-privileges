'use client'

import { useState, useActionState } from 'react'
import { addCommande, removeCommande } from '@/app/actions/commandes'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, ShoppingCart, AlertCircle,
  CheckCircle2, ChevronDown, TrendingUp, Users
} from 'lucide-react'

type Commande = {
  id: string
  member_id: string
  montant_ar: number
  commande_date: string
  statut: 'active' | 'annulee' | 'remboursee'
  created_at: string
  members: { id: string; prenom: string; nom: string | null; email: string } | null
}

type Member = { id: string; prenom: string; nom: string | null; email: string }

interface Props {
  initialCommandes: Commande[]
  members: Member[]
}

function formatAr(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' Ar'
}

const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:     { bg: '#dcfce7', color: '#16a34a', label: 'Active'     },
  annulee:    { bg: '#fee2e2', color: '#dc2626', label: 'Annulée'    },
  remboursee: { bg: '#fef3c7', color: '#d97706', label: 'Remboursée' },
}

export default function CommandeManager({ initialCommandes, members }: Props) {
  const [commandes, setCommandes] = useState(initialCommandes)
  const [showForm, setShowForm]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  const [formState, formAction, isPending] = useActionState(
    async (prev: { error?: string; success?: boolean } | null, fd: FormData) => {
      const result = await addCommande(prev, fd)
      if (result.success) {
        setShowForm(false)
        router.refresh()
      }
      return result
    },
    null
  )

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette commande ?')) return
    setDeletingId(id)
    // Garantit que le spinner s'affiche avant l'appel réseau
    await new Promise(r => setTimeout(r, 0))
    const result = await removeCommande(id)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setCommandes(prev => prev.filter(c => c.id !== id))
    }
    setDeletingId(null)
  }

  // Stats
  const active   = commandes.filter(c => c.statut === 'active')
  const totalCA  = active.reduce((sum, c) => sum + c.montant_ar, 0)
  const eligible = new Set(active.map(c => c.member_id)).size

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Stats — responsive avec auto-fit */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.875rem',
        marginBottom: '1.5rem',
      }}>
        {[
          { icon: ShoppingCart, label: 'Commandes actives', value: active.length.toString(),  color: 'var(--brand)'  },
          { icon: TrendingUp,   label: 'CA total',           value: formatAr(totalCA),         color: 'var(--accent)' },
          { icon: Users,        label: 'Éligibles 27 Mai',   value: `${eligible}`,             color: '#16a34a'       },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Icon size={14} style={{ color }} />
              <span className="stat-label">{label}</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(1rem, 2.5vw, 1.375rem)',
              letterSpacing: '-0.03em',
              color: 'var(--text-1)',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Erreur suppression */}
      {deleteError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Card principale */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-1)',
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
            Historique ({commandes.length})
          </span>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              background: showForm ? 'var(--bg-2)' : 'var(--brand)',
              color: showForm ? 'var(--text-2)' : 'white',
              border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-body)',
              transition: 'all 150ms ease',
            }}
          >
            <Plus size={13} />
            Ajouter
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-0)',
            animation: 'fadeIn 0.2s ease both',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-1)' }}>
              Nouvelle commande
            </div>

            {formState?.error && (
              <div className="alert alert-error" style={{ marginBottom: '0.875rem' }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem' }}>{formState.error}</span>
              </div>
            )}

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Membre */}
              <div>
                <label className="label" htmlFor="cmd-member">Membre *</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="cmd-member"
                    name="member_id"
                    className="input"
                    required
                    defaultValue=""
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                  >
                    <option value="" disabled>Sélectionner un membre…</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.prenom} {m.nom ?? ''} — {m.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Montant / Date / Statut */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem',
              }}>
                <div>
                  <label className="label" htmlFor="cmd-montant">Montant (Ar) *</label>
                  <input
                    id="cmd-montant"
                    name="montant_ar"
                    type="number"
                    className="input"
                    placeholder="800000"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cmd-date">Date *</label>
                  <input
                    id="cmd-date"
                    name="commande_date"
                    type="date"
                    className="input"
                    defaultValue={today}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cmd-statut">Statut</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="cmd-statut"
                      name="statut"
                      className="input"
                      defaultValue="active"
                      style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                    >
                      <option value="active">Active</option>
                      <option value="annulee">Annulée</option>
                      <option value="remboursee">Remboursée</option>
                    </select>
                    <ChevronDown size={13} style={{
                      position: 'absolute', right: '0.625rem', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
                    }} />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem',
                    border: '1.5px solid var(--border)', background: 'transparent',
                    color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
                    border: 'none',
                    background: isPending ? 'var(--brand-mid)' : 'var(--brand)',
                    color: 'white',
                    fontSize: '0.875rem', fontWeight: 600,
                    cursor: isPending ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} />
                      Enregistrement…
                    </>
                  ) : (
                    <><CheckCircle2 size={13} /> Enregistrer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {commandes.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <ShoppingCart size={32} />
            <h3>Aucune commande</h3>
            <p>Les commandes Cart&apos;In enregistrées apparaîtront ici.</p>
          </div>
        ) : (
          commandes.map((c, i) => {
            const m = c.members
            const style = STATUT_STYLES[c.statut] ?? STATUT_STYLES.active
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.5rem',
                  borderBottom: i < commandes.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Membre */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m ? `${m.prenom} ${m.nom ?? ''}` : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                    {new Date(c.commande_date).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Montant */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: 'var(--text-1)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}>
                  {formatAr(c.montant_ar)}
                </div>

                {/* Statut */}
                <span style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 9999,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  background: style.bg,
                  color: style.color,
                  whiteSpace: 'nowrap' as const,
                }}>
                  {style.label}
                </span>

                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  style={{
                    width: 30, height: 30, borderRadius: '0.5rem',
                    border: 'none', background: 'transparent',
                    color: 'var(--text-4)',
                    cursor: deletingId === c.id ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (deletingId !== c.id) {
                      (e.currentTarget as HTMLElement).style.background = '#fee2e2'
                      ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-4)'
                  }}
                >
                  {deletingId === c.id
                    ? <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#dc2626', display: 'inline-block' }} />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
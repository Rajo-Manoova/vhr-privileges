'use client'

import { useState, useTransition } from 'react'
import { createTirageSession, deleteTirageSession, updateTirageSession } from '@/app/actions/tirages'
import { useRouter } from 'next/navigation'
import {
  Plus, Play, Trash2, ChevronDown,
  Trophy, Calendar, Loader2, AlertTriangle, Info, Pencil, Check, X,
} from 'lucide-react'
import { TIRAGE_TYPE_LABELS } from '@/types'
import type { TirageType } from '@/types'

/* ── Constantes ── */
const LEGACY_LABELS: Record<string, string> = {
  soiree_16mai: 'Soirée 16 Mai 2026',
  tirage_27mai: 'Tirage 27 Mai 2026',
}

function getTirageLabel(type: string, label?: string | null): string {
  if (label?.trim()) return label.trim()
  return TIRAGE_TYPE_LABELS[type as TirageType] ?? LEGACY_LABELS[type] ?? type
}

const TYPE_DEFAULTS: Partial<Record<TirageType, string>> = {}

/* ── Types ── */
type Session = {
  id: string
  type: string
  label?: string | null
  status: string
  created_at: string
  scheduled_at: string | null
  wins_count: number
}
type ComputedStatus = 'completed' | 'today' | 'overdue' | 'upcoming'

/* ── Helpers ── */
function computeStatus(s: Session): ComputedStatus {
  if (s.wins_count > 0) return 'completed'
  if (!s.scheduled_at) return 'upcoming'
  const scheduled  = new Date(s.scheduled_at)
  const now        = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000)
  if (scheduled >= todayStart && scheduled < todayEnd) return 'today'
  if (scheduled < now) return 'overdue'
  return 'upcoming'
}

const STATUS_CONFIG: Record<ComputedStatus, { bg: string; color: string; label: string }> = {
  completed: { bg: '#f1f5f9', color: '#475569', label: 'Terminé'      },
  today:     { bg: '#fee2e2', color: '#dc2626', label: "Aujourd'hui"  },
  overdue:   { bg: '#fef3c7', color: '#b45309', label: 'En retard'    },
  upcoming:  { bg: '#dcfce7', color: '#166534', label: 'Planifié'     },
}

function formatScheduled(scheduled_at: string | null): string | null {
  if (!scheduled_at) return null
  const d = new Date(scheduled_at)
  const now = new Date()
  const diffDays = Math.ceil(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
    / 86_400_000
  )
  // Afficher l'heure en heure Madagascar (UTC+3)
  const time = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Indian/Antananarivo',
  })
  const dateStr = d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short',
    timeZone: 'Indian/Antananarivo',
  })
  if (diffDays === 0) return `Aujourd'hui à ${time}`
  if (diffDays === 1) return `Demain à ${time}`
  if (diffDays > 1)   return `Dans ${diffDays} jours — ${dateStr} à ${time}`
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Indian/Antananarivo',
  }) + ` à ${time}`
}

// Convertit un ISO UTC en datetime-local heure Madagascar
function toMadagascarLocal(iso: string | null): string {
  if (!iso) return todayMadagascarLocal()
  const d = new Date(iso)
  // UTC+3 = ajouter 3h
  const mada = new Date(d.getTime() + 3 * 60 * 60 * 1000)
  return mada.toISOString().slice(0, 16)
}

// Datetime-local maintenant en heure Madagascar
function todayMadagascarLocal(): string {
  const now = new Date()
  const mada = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return mada.toISOString().slice(0, 16)
}

// Convertit datetime-local Madagascar → ISO avec offset +03:00
function madaLocalToISO(datetimeLocal: string): string {
  return datetimeLocal + ':00+03:00'
}

function todayDatetimeLocal(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

/* ── Composant principal ── */
export default function TiragesList({ initialSessions, readonly = false }: { initialSessions: Session[]; readonly?: boolean }) {
  const [sessions,    setSessions]    = useState(initialSessions)
  const [showForm,    setShowForm]    = useState(false)
  const [type,        setType]        = useState<TirageType>('ponctuel')
  const [label,       setLabel]       = useState('')
  const [scheduledAt, setScheduledAt] = useState(todayMadagascarLocal())
  const [forceCreate, setForceCreate] = useState(false)
  const [ticketsActifs,    setTicketsActifs]    = useState(true)
  const [maxWins,          setMaxWins]          = useState(0)
  const [creating,      startCreate]    = useTransition()
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  // État édition inline
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editLabel,   setEditLabel]   = useState('')
  const [editDate,    setEditDate]    = useState('')
  const [saving,      startSave]      = useTransition()
  const [editError,   setEditError]   = useState<string | null>(null)

  const router = useRouter()

  const existingOfType  = sessions.find(s => s.type === type)
  const isDuplicate     = !!existingOfType && !forceCreate
  const isCompleted     = (existingOfType?.wins_count ?? 0) > 0

  function handleTypeChange(newType: TirageType) {
    setType(newType)
    setForceCreate(false)
    setScheduledAt(TYPE_DEFAULTS[newType] ?? todayMadagascarLocal())
  }

  function handleCreate() {
    setError(null)
    if (!label.trim()) { setError('Le nom du tirage est requis.'); return }
    startCreate(async () => {
      const result = await createTirageSession(
        type, label, scheduledAt ? madaLocalToISO(scheduledAt) : null,
        ticketsActifs, maxWins
      )
      if (result?.error) setError(result.error)
    })
  }

  function startEdit(session: Session) {
    setEditingId(session.id)
    setEditLabel(getTirageLabel(session.type, session.label))
    setEditDate(toMadagascarLocal(session.scheduled_at))
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function handleSave(sessionId: string) {
    setEditError(null)
    if (!editLabel.trim()) { setEditError('Le nom est requis.'); return }
    startSave(async () => {
      const result = await updateTirageSession(
        sessionId,
        editLabel,
        editDate ? madaLocalToISO(editDate) : null,
      )
      if (result?.error) { setEditError(result.error); return }
      // Mettre à jour localement
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, label: editLabel, scheduled_at: editDate ? madaLocalToISO(editDate) : null }
          : s
      ))
      setEditingId(null)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette session de tirage et tous ses résultats ?')) return
    setDeletingId(id)
    const result = await deleteTirageSession(id)
    if (result.error) setError(result.error)
    else setSessions(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      {/* Bouton Nouveau tirage */}
      {!readonly && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setShowForm(v => !v); setError(null); setForceCreate(false) }}
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
          {showForm ? 'Annuler' : 'Nouveau tirage'}
        </button>
      </div>}

      {/* Formulaire de création */}
      {showForm && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--brand)', maxWidth: 520 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1.25rem' }}>
            Créer une session de tirage
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>{error}</span>
            </div>
          )}

          {existingOfType && !forceCreate && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 1rem', background: isCompleted ? '#f0f7f8' : '#fef9c3', border: `1px solid ${isCompleted ? 'rgba(51,128,141,0.2)' : '#fde68a'}`, borderRadius: '0.625rem', marginBottom: '1.25rem' }}>
              {isCompleted ? <Info size={16} style={{ color: 'var(--brand-light)', flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.375rem' }}>
                  {isCompleted ? 'Ce type de tirage a déjà eu lieu.' : 'Un tirage de ce type existe déjà.'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
                  {isCompleted ? 'Vous pouvez quand même en créer un nouveau, ou consulter le tirage existant.' : "Ouvrez la session existante plutôt que d'en créer une nouvelle."}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => router.push(`/tirages/${existingOfType.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <Play size={12} /> Ouvrir l&apos;existant
                  </button>
                  <button onClick={() => setForceCreate(true)} style={{ padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Créer quand même
                  </button>
                </div>
              </div>
            </div>
          )}

          {(!existingOfType || forceCreate) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label" htmlFor="type-sel">Type de tirage</label>
                <div style={{ position: 'relative' }}>
                  <select id="type-sel" value={type} onChange={e => handleTypeChange(e.target.value as TirageType)} className="input" style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    {(Object.entries(TIRAGE_TYPE_LABELS) as [TirageType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="label-inp">
                  Nom du tirage *
                  <span style={{ fontWeight: 400, color: 'var(--text-4)', marginLeft: '0.375rem' }}>(ex : Soirée Ampefy 16 Mai)</span>
                </label>
                <input id="label-inp" type="text" className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Nom libre du tirage" autoComplete="off" />
              </div>

              <div>
                <label className="label" htmlFor="date-sel">
                  Date et heure <span style={{ fontWeight: 600, color: 'var(--brand)' }}>heure Madagascar</span>
                </label>
                <input id="date-sel" type="datetime-local" className="input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-4)', marginTop: '0.25rem' }}>Heure locale Madagascar (UTC+3)</p>
              </div>

              <div>
                <label className="label">Options</label>
                <button type="button" onClick={() => setTicketsActifs(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', borderRadius: '0.625rem', border: `1.5px solid ${ticketsActifs ? '#fde68a' : 'var(--border)'}`, background: ticketsActifs ? '#fef3c7' : 'var(--bg-1)', color: ticketsActifs ? '#92400e' : 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                  <span style={{ fontSize: '1rem' }}>🎫</span>
                  Tickets par niveau
                  <span style={{ marginLeft: '0.25rem', padding: '0.1rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: ticketsActifs ? '#92400e' : 'var(--border)', color: ticketsActifs ? 'white' : 'var(--text-4)' }}>
                    {ticketsActifs ? 'ON' : 'OFF'}
                  </span>
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                  {ticketsActifs ? 'Membre×1, Argent×2, Or×3, VIP×5 — plus de chances selon le niveau.' : '1 chance par membre, quel que soit le niveau.'}
                </p>
              </div>

              <div>
                <label className="label">Re-éligibilité des gagnants <span style={{ fontWeight: 400, color: 'var(--text-4)', marginLeft: '0.375rem' }}>(fois qu&apos;un gagnant peut regagner)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3].map(n => (
                    <button key={n} type="button" onClick={() => setMaxWins(n)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: `1.5px solid ${maxWins === n ? 'var(--brand)' : 'var(--border)'}`, background: maxWins === n ? 'rgba(15,45,53,0.08)' : 'transparent', color: maxWins === n ? 'var(--brand)' : 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                      {n === 0 ? '0 — exclu' : `${n}×`}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                  {maxWins === 0
                    ? 'Un gagnant ne peut plus être tiré lors des lots suivants.'
                    : `Un gagnant peut gagner jusqu'à ${maxWins + 1} lot${maxWins > 0 ? 's' : ''} au total.`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={handleCreate} disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: creating ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: creating ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                  {creating ? <><Loader2 size={14} className="animate-spin" /> Création…</> : <><Trophy size={14} /> Créer et ouvrir</>}
                </button>
                <button onClick={() => { setShowForm(false); setError(null); setForceCreate(false) }} style={{ padding: '0.625rem 1rem', borderRadius: '0.625rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des sessions */}
      {sessions.length === 0 ? (
        <div className="empty-state">
          <Trophy size={36} />
          <h3>Aucune session de tirage</h3>
          <p>Créez votre première session pour commencer.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sessions.map((session) => {
            const status      = computeStatus(session)
            const statusCfg   = STATUS_CONFIG[status]
            const dateDisplay = formatScheduled(session.scheduled_at)
            const displayName = getTirageLabel(session.type, session.label)
            const isEditing   = editingId === session.id

            return (
              <div key={session.id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: status === 'today' ? '3px solid #dc2626' : status === 'overdue' ? '3px solid #f59e0b' : '3px solid transparent' }}>

                {/* Mode édition inline */}
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {editError && <div className="alert alert-error"><span style={{ fontSize: '0.8125rem' }}>{editError}</span></div>}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '2 1 200px', minWidth: 0 }}>
                        <label className="label" style={{ marginBottom: '0.25rem' }}>Nom</label>
                        <input type="text" className="input" value={editLabel} onChange={e => setEditLabel(e.target.value)} autoFocus />
                      </div>
                      <div style={{ flex: '2 1 200px', minWidth: 0 }}>
                        <label className="label" style={{ marginBottom: '0.25rem' }}>
                          Date <span style={{ fontWeight: 500, color: 'var(--brand)', fontSize: '0.6875rem' }}>(heure Madagascar)</span>
                        </label>
                        <input type="datetime-local" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => handleSave(session.id)} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}>
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          {saving ? 'Enreg…' : 'Enregistrer'}
                        </button>
                        <button onClick={cancelEdit} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mode affichage normal */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Icône */}
                    <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: status === 'today' ? '#fee2e2' : status === 'completed' ? 'var(--bg-1)' : 'rgba(15,45,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trophy size={20} style={{ color: status === 'today' ? '#dc2626' : status === 'completed' ? 'var(--text-4)' : 'var(--brand)' }} />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {displayName}
                        </span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-4)' }}>
                          {TIRAGE_TYPE_LABELS[session.type as TirageType] ?? LEGACY_LABELS[session.type] ?? session.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Calendar size={11} />
                        {dateDisplay ?? new Date(session.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {session.wins_count > 0 && (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>· {session.wins_count} gagnant{session.wins_count > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      <button onClick={() => router.push(`/tirages/${session.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: status === 'completed' ? 'var(--bg-2)' : 'var(--brand)', color: status === 'completed' ? 'var(--text-2)' : 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        <Play size={13} />
                        {status === 'completed' ? 'Voir' : 'Ouvrir'}
                      </button>

                      {/* Bouton éditer */}
                      {!readonly && <button onClick={() => startEdit(session)} title="Modifier nom et date" style={{ width: 34, height: 34, borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,45,53,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                      >
                        <Pencil size={13} />
                      </button>}

                      {!readonly && <button onClick={() => handleDelete(session.id)} disabled={deletingId === session.id} title="Supprimer" style={{ width: 34, height: 34, borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: deletingId === session.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                      >
                        {deletingId === session.id ? <span className="animate-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#dc2626', display: 'inline-block' }} /> : <Trash2 size={14} />}
                      </button>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
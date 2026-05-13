'use client'

import { useState, useTransition } from 'react'
import { createTirageSession, deleteTirageSession } from '@/app/actions/tirages'
import { useRouter } from 'next/navigation'
import {
  Plus, Play, Trash2, ChevronDown,
  Trophy, Calendar, Loader2, AlertTriangle, Info,
} from 'lucide-react'

/* ── Constantes ── */

const TYPE_LABELS: Record<string, string> = {
  soiree_16mai: 'Soirée 16 Mai 2026',
  tirage_27mai: 'Tirage 27 Mai 2026',
  mensuel:      'Tirage mensuel',
  trimestriel:  'Tirage trimestriel',
  semestriel:   'Tirage semestriel',
}

// Date pré-remplie selon le type (format datetime-local)
const TYPE_DEFAULTS: Record<string, string> = {
  soiree_16mai: '2026-05-16T19:00',
  tirage_27mai: '2026-05-27T20:00',
}

/* ── Types ── */

type Session = {
  id: string
  type: string
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
    (d.setHours(0,0,0,0) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
    / 86_400_000
  )
  const time = new Date(scheduled_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })

  if (diffDays === 0) return `Aujourd'hui à ${time}`
  if (diffDays === 1) return `Demain à ${time}`
  if (diffDays > 1)   return `Dans ${diffDays} jours — ${new Date(scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à ${time}`
  // Passé
  return new Date(scheduled_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ` à ${time}`
}

function todayDatetimeLocal(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

/* ── Composant principal ── */

export default function TiragesList({ initialSessions }: { initialSessions: Session[] }) {
  const [sessions,   setSessions]   = useState(initialSessions)
  const [showForm,   setShowForm]   = useState(false)
  const [type,       setType]       = useState('soiree_16mai')
  const [scheduledAt, setScheduledAt] = useState(TYPE_DEFAULTS['soiree_16mai'] ?? todayDatetimeLocal())
  const [forceCreate, setForceCreate] = useState(false)
  const [creating,   startCreate]   = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const router = useRouter()

  // Doublon : session du même type déjà existante
  const existingOfType  = sessions.find(s => s.type === type)
  const isDuplicate     = !!existingOfType && !forceCreate
  const isCompleted     = (existingOfType?.wins_count ?? 0) > 0

  function handleTypeChange(newType: string) {
    setType(newType)
    setForceCreate(false)
    setScheduledAt(TYPE_DEFAULTS[newType] ?? todayDatetimeLocal())
  }

  function handleCreate() {
    setError(null)
    startCreate(async () => {
      const result = await createTirageSession(type, scheduledAt || null)
      if (result?.error) setError(result.error)
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
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
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div
          className="card animate-fade-in"
          style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--brand)', maxWidth: 520 }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1.25rem' }}>
            Créer une session de tirage
          </div>

          {/* Erreur serveur */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>{error}</span>
            </div>
          )}

          {/* Alerte doublon */}
          {existingOfType && !forceCreate && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: isCompleted ? '#f0f7f8' : '#fef9c3',
                border: `1px solid ${isCompleted ? 'rgba(51,128,141,0.2)' : '#fde68a'}`,
                borderRadius: '0.625rem',
                marginBottom: '1.25rem',
              }}
            >
              {isCompleted
                ? <Info size={16} style={{ color: 'var(--brand-light)', flexShrink: 0, marginTop: 1 }} />
                : <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.375rem' }}>
                  {isCompleted
                    ? 'Ce type de tirage a déjà eu lieu.'
                    : 'Un tirage de ce type existe déjà.'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
                  {isCompleted
                    ? 'Vous pouvez quand même en créer un nouveau, ou consulter le tirage existant.'
                    : 'Ouvrez la session existante plutôt que d\'en créer une nouvelle.'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push(`/tirages/${existingOfType.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.375rem 0.875rem', borderRadius: '0.5rem',
                      border: 'none', background: 'var(--brand)', color: 'white',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Play size={12} /> Ouvrir l&apos;existant
                  </button>
                  <button
                    onClick={() => setForceCreate(true)}
                    style={{
                      padding: '0.375rem 0.875rem', borderRadius: '0.5rem',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Créer quand même
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire (visible si pas de doublon actif, ou si forceCreate) */}
          {(!existingOfType || forceCreate) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Type */}
              <div>
                <label className="label" htmlFor="type-sel">Type de tirage</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="type-sel"
                    value={type}
                    onChange={e => handleTypeChange(e.target.value)}
                    className="input"
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Date et heure */}
              <div>
                <label className="label" htmlFor="date-sel">
                  Date et heure prévues
                  <span style={{ fontWeight: 400, color: 'var(--text-4)', marginLeft: '0.375rem' }}>
                    (pour les alertes et le statut)
                  </span>
                </label>
                <input
                  id="date-sel"
                  type="datetime-local"
                  className="input"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', lineHeight: 1.6, marginTop: '-0.25rem' }}>
                Les lots seront chargés depuis le catalogue selon le type choisi.
              </p>

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                    border: 'none',
                    background: creating ? 'rgba(15,45,53,0.5)' : 'var(--brand)',
                    color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: creating ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {creating
                    ? <><Loader2 size={14} className="animate-spin" /> Création…</>
                    : <><Trophy size={14} /> Créer et ouvrir</>
                  }
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(null); setForceCreate(false) }}
                  style={{
                    padding: '0.625rem 1rem', borderRadius: '0.625rem',
                    border: '1.5px solid var(--border)', background: 'transparent',
                    color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
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

            return (
              <div
                key={session.id}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderLeft: status === 'today'
                    ? '3px solid #dc2626'
                    : status === 'overdue'
                    ? '3px solid #f59e0b'
                    : '3px solid transparent',
                }}
              >
                {/* Icône */}
                <div style={{
                  width: 44, height: 44, borderRadius: '0.75rem',
                  background: status === 'today'
                    ? '#fee2e2'
                    : status === 'completed'
                    ? 'var(--bg-1)'
                    : 'rgba(15,45,53,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Trophy
                    size={20}
                    style={{
                      color: status === 'today'
                        ? '#dc2626'
                        : status === 'completed'
                        ? 'var(--text-4)'
                        : 'var(--brand)',
                    }}
                  />
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    flexWrap: 'wrap', marginBottom: '0.25rem',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
                      {TYPE_LABELS[session.type] ?? session.type}
                    </span>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 9999,
                      fontSize: '0.6875rem', fontWeight: 700,
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                      background: statusCfg.bg, color: statusCfg.color,
                    }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.75rem', color: 'var(--text-4)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                  }}>
                    <Calendar size={11} />
                    {dateDisplay ?? new Date(session.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                    {session.wins_count > 0 && (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        · {session.wins_count} gagnant{session.wins_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/tirages/${session.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem',
                      border: 'none',
                      background: status === 'completed' ? 'var(--bg-2)' : 'var(--brand)',
                      color: status === 'completed' ? 'var(--text-2)' : 'white',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Play size={13} />
                    {status === 'completed' ? 'Voir' : 'Ouvrir'}
                  </button>

                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    title="Supprimer"
                    style={{
                      width: 34, height: 34, borderRadius: '0.5rem',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-4)',
                      cursor: deletingId === session.id ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms ease', flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#fee2e2'
                      ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-4)'
                    }}
                  >
                    {deletingId === session.id
                      ? <span className="animate-spin" style={{
                          width: 13, height: 13, borderRadius: '50%',
                          border: '2px solid var(--border)', borderTopColor: '#dc2626',
                          display: 'inline-block',
                        }} />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
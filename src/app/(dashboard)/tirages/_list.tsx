'use client'

import { useState, useTransition } from 'react'
import { createTirageSession, deleteTirageSession } from '@/app/actions/tirages'
import { useRouter } from 'next/navigation'
import {
  Plus, Play, Trash2, ChevronDown,
  Trophy, Calendar, Loader2
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  soiree_16mai:  'Soirée 16 Mai 2026',
  tirage_27mai:  'Tirage 27 Mai 2026',
  mensuel:       'Tirage mensuel',
  trimestriel:   'Tirage trimestriel',
  semestriel:    'Tirage semestriel',
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#fef9c3', color: '#854d0e', label: 'En attente' },
  active:    { bg: '#dcfce7', color: '#166534', label: 'En cours'   },
  completed: { bg: '#f1f5f9', color: '#475569', label: 'Terminé'    },
}

type Session = {
  id: string
  type: string
  status: string
  created_at: string
  wins_count: number
}

interface Props {
  initialSessions: Session[]
}

export default function TiragesList({ initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions)
  const [showForm, setShowForm] = useState(false)
  const [type, setType]         = useState('soiree_16mai')
  const [creating, startCreate] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  function handleCreate() {
    setError(null)
    startCreate(async () => {
      const result = await createTirageSession(type as any)
      if (result?.error) {
        setError(result.error)
      }
      // Si succès, createTirageSession redirige automatiquement
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette session de tirage et tous ses résultats ?')) return
    setDeletingId(id)
    await new Promise(r => setTimeout(r, 0))
    const result = await deleteTirageSession(id)
    if (result.error) {
      setError(result.error)
    } else {
      setSessions(prev => prev.filter(s => s.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div>
      {/* Bouton Nouveau tirage */}
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
          {showForm ? 'Annuler' : 'Nouveau tirage'}
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div
          className="card animate-fade-in"
          style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--brand)', maxWidth: 480 }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Créer une session de tirage
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label className="label" htmlFor="type-sel">Type de tirage</label>
            <div style={{ position: 'relative' }}>
              <select
                id="type-sel"
                value={type}
                onChange={e => setType(e.target.value)}
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

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Les lots seront automatiquement chargés depuis le catalogue selon le type choisi.
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
              onClick={() => { setShowForm(false); setError(null) }}
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
            const statusStyle = STATUS_STYLES[session.status] ?? STATUS_STYLES.pending
            return (
              <div
                key={session.id}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem',
                }}
              >
                {/* Icône */}
                <div style={{
                  width: 44, height: 44, borderRadius: '0.75rem',
                  background: 'rgba(15,45,53,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Trophy size={20} style={{ color: 'var(--brand)' }} />
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
                      background: statusStyle.bg, color: statusStyle.color,
                    }}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--text-4)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <Calendar size={11} />
                    {new Date(session.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {session.wins_count > 0 && (
                      <span>
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
                      border: 'none', background: 'var(--brand)', color: 'white',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Play size={13} />
                    {session.status === 'completed' ? 'Voir' : 'Ouvrir'}
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
                      transition: 'all 150ms ease',
                      flexShrink: 0,
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
'use client'

import { useState, useActionState } from 'react'
import { createTeamMember, deleteTeamMember } from '@/app/actions/team'
import {
  UserCog, Trash2, Plus, Eye, EyeOff,
  AlertCircle, CheckCircle2, ShieldCheck, User, ChevronDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

type TeamMember = {
  id: string; email: string; role: 'admin' | 'animateur'
  prenom: string; nom: string; created_at: string
}

const PER_PAGE = 10

export default function EquipeManager({ initialMembers }: { initialMembers: TeamMember[] }) {
  const [members,    setMembers]    = useState(initialMembers)
  const [showForm,   setShowForm]   = useState(false)
  const [showPwd,    setShowPwd]    = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(members.length / PER_PAGE)
  const slice = members.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const [formState, formAction, isPending] = useActionState(
    async (prev: { error?: string; success?: boolean } | null, fd: FormData) => {
      const result = await createTeamMember(prev, fd)
      if (result.success) { setShowForm(false); window.location.reload() }
      return result
    }, null
  )

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Supprimer le compte de ${email} ?`)) return
    setDeletingId(id)
    setDeleteError(null)
    const result = await deleteTeamMember(id)
    if (result.error) { setDeleteError(result.error) }
    else { setMembers(prev => prev.filter(m => m.id !== id)) }
    setDeletingId(null)
  }

  return (
    <div style={{ maxWidth: 640 }}>

      {deleteError && (
        <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{deleteError}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCog size={16} style={{ color: 'var(--brand-light)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
              Membres de l&apos;équipe ({members.length})
            </span>
          </div>
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
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {/* Formulaire création */}
        {showForm && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-0)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
              Nouveau compte
            </div>

            {formState?.error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem' }}>{formState.error}</span>
              </div>
            )}

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Prénom + Nom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label" htmlFor="new-prenom">Prénom</label>
                  <input id="new-prenom" name="prenom" type="text" className="input" placeholder="Jean" />
                </div>
                <div>
                  <label className="label" htmlFor="new-nom">Nom</label>
                  <input id="new-nom" name="nom" type="text" className="input" placeholder="Rakoto" />
                </div>
              </div>

              {/* Email + Rôle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label className="label" htmlFor="new-email">Email *</label>
                  <input
                    id="new-email" name="email" type="email"
                    className="input" placeholder="animateur@cartin.mg" required
                  />
                </div>
                <div style={{ position: 'relative', minWidth: 140 }}>
                  <label className="label" htmlFor="new-role">Rôle</label>
                  <select
                    id="new-role" name="role" className="input"
                    defaultValue="animateur"
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                  >
                    <option value="animateur">Animateur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown size={13} style={{
                    position: 'absolute', right: '0.625rem', top: '67%',
                    transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="label" htmlFor="new-password">Mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password" name="password"
                    type={showPwd ? 'text' : 'password'}
                    className="input" placeholder="8 caractères minimum"
                    minLength={8} required style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Annuler
                </button>
                <button type="submit" disabled={isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? 'Création…' : <><CheckCircle2 size={13} /> Créer</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {members.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <User size={32} />
            <h3>Aucun membre</h3>
            <p>Ajoutez des animateurs pour le rallye.</p>
          </div>
        ) : (
          <>
            {slice.map((m, i) => {
              const displayName = [m.prenom, m.nom].filter(Boolean).join(' ') || null

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.875rem 1.5rem',
                    borderBottom: i < slice.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: m.role === 'admin' ? 'rgba(124,58,237,0.1)' : 'rgba(15,45,53,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.role === 'admin'
                      ? <ShieldCheck size={16} style={{ color: '#7c3aed' }} />
                      : <User        size={16} style={{ color: 'var(--brand-light)' }} />
                    }
                  </div>

                  {/* Info — flex: 1 minWidth: 0 pour éviter le débordement */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {displayName && (
                      <div style={{
                        fontSize: '0.875rem', fontWeight: 700,
                        color: 'var(--text-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: '0.125rem',
                      }}>
                        {displayName}
                      </div>
                    )}
                    <div style={{
                      fontSize: '0.8125rem',
                      fontWeight: displayName ? 400 : 600,
                      color: displayName ? 'var(--text-3)' : 'var(--text-1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.email}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', marginTop: '0.125rem' }}>
                      Depuis le {new Date(m.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Rôle badge — flexShrink: 0 pour ne jamais se comprimer */}
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.625rem', borderRadius: 9999,
                    fontSize: '0.6875rem', fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.07em',
                    background: m.role === 'admin' ? '#ede9fe' : 'rgba(15,45,53,0.07)',
                    color: m.role === 'admin' ? '#7c3aed' : 'var(--brand)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {m.role === 'admin' ? 'Admin' : 'Animateur'}
                  </span>

                  {/* Supprimer */}
                  <button
                    onClick={() => handleDelete(m.id, m.email)}
                    disabled={deletingId === m.id}
                    title={`Supprimer ${m.email}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: '0.5rem',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-4)', cursor: 'pointer',
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
                    {deletingId === m.id
                      ? <span className="animate-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text-4)', display: 'inline-block' }} />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border)', background: 'var(--bg-1)',
              }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: page === 1 ? 'var(--border)' : 'var(--text-2)', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={13} />
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontFamily: 'var(--font-body)' }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: page === totalPages ? 'var(--border)' : 'var(--text-2)', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note */}
      <div style={{
        padding: '0.875rem 1rem', background: 'var(--bg-1)',
        border: '1px solid var(--border)', borderRadius: '0.75rem',
        fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.6,
      }}>
        Les animateurs peuvent inscrire des membres et consulter la liste. Ils ne peuvent pas accéder au tirage, au catalogue ni à la gestion de l&apos;équipe. Transmettez l&apos;email + mot de passe en personne.
      </div>
    </div>
  )
}
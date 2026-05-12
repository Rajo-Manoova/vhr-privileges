import { createClient } from '@/lib/supabase/server'
import { Users, UserPlus, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Total membres
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  // Membres par étape
  const { data: allMembers } = await supabase
    .from('members')
    .select('etape, created_at, prenom, nom, email')
    .order('created_at', { ascending: false })

  const countByEtape: Partial<Record<Etape, number>> = {}
  allMembers?.forEach(m => {
    const e = m.etape as Etape
    countByEtape[e] = (countByEtape[e] ?? 0) + 1
  })

  // Dernières inscriptions (8 max)
  const recent = allMembers?.slice(0, 8) ?? []

  // Aujourd'hui
  const today = new Date().toISOString().split('T')[0]
  const todayCount = allMembers?.filter(m =>
    m.created_at.startsWith(today)
  ).length ?? 0

  return (
    <div className="animate-fade-up">
      {/* En-tête */}
      <div className="page-header">
        <div className="overline" style={{ marginBottom: '0.5rem' }}>
          Rallye VHR Madagascar 2026
        </div>
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">
          Vue d&apos;ensemble des inscriptions en temps réel.
        </p>
      </div>

      {/* Cartes stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div className="stat-card delay-75">
          <div className="stat-label">Total inscrits</div>
          <div className="stat-value">{totalMembers ?? 0}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
            sur ~150 attendus
          </div>
        </div>

        <div className="stat-card delay-150">
          <div className="stat-label">Aujourd&apos;hui</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            +{todayCount}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
            nouvelles inscriptions
          </div>
        </div>

        <div className="stat-card delay-225">
          <div className="stat-label">Étapes couvertes</div>
          <div className="stat-value">
            {Object.keys(countByEtape).length}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
            sur 5 étapes
          </div>
        </div>
      </div>

      {/* Répartition par étape */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <MapPin size={16} style={{ color: 'var(--brand-light)' }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-1)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              Répartition par étape
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(Object.keys(ETAPE_LABELS) as Etape[]).map(etape => {
              const count = countByEtape[etape] ?? 0
              const pct = totalMembers ? Math.round((count / totalMembers) * 100) : 0
              return (
                <div key={etape}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem',
                  }}>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: 'var(--text-2)',
                    }}>
                      {ETAPE_LABELS[etape]}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: count > 0 ? 'var(--brand)' : 'var(--text-4)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {count}
                    </span>
                  </div>
                  {/* Barre de progression */}
                  <div style={{
                    height: 4,
                    background: 'var(--bg-2)',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: count > 0 ? 'var(--brand)' : 'transparent',
                      borderRadius: 9999,
                      transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dernières inscriptions */}
        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Calendar size={16} style={{ color: 'var(--brand-light)' }} />
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-1)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}>
                Dernières inscriptions
              </h3>
            </div>
            <Link
              href="/membres"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--brand-light)',
                textDecoration: 'none',
              }}
            >
              Voir tout
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <Users size={32} />
              <h3>Aucune inscription</h3>
              <p>Les inscriptions apparaîtront ici.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {recent.map((m, i) => (
                <div
                  key={`${m.email}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Avatar initiales */}
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--bg-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--brand)',
                    flexShrink: 0,
                  }}>
                    {m.prenom.charAt(0).toUpperCase()}
                    {m.nom?.charAt(0).toUpperCase() ?? ''}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.prenom} {m.nom ?? ''}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-4)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.email}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--text-4)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA inscription */}
          <Link
            href="/inscription"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1.25rem',
              padding: '0.75rem',
              background: 'var(--bg-0)',
              border: '1.5px dashed var(--border)',
              borderRadius: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-3)',
              textDecoration: 'none',
              transition: 'all 200ms ease',
            }}
          >
            <UserPlus size={15} />
            Nouvelle inscription
          </Link>
        </div>
      </div>
    </div>
  )
}
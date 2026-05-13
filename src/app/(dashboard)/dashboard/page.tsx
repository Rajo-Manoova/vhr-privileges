import { createClient } from '@/lib/supabase/server'
import { Users, UserPlus, MapPin, Calendar, Trophy } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  const { data: allMembers } = await supabase
    .from('members')
    .select('etape, created_at, prenom, nom, email')
    .order('created_at', { ascending: false })

  const countByEtape: Partial<Record<Etape, number>> = {}
  allMembers?.forEach(m => {
    const e = m.etape as Etape
    countByEtape[e] = (countByEtape[e] ?? 0) + 1
  })

  // ✅ CORRECTION : limité à 5
  const recent = allMembers?.slice(0, 5) ?? []

  const today = new Date().toISOString().split('T')[0]
  const todayCount = allMembers?.filter(m =>
    m.created_at.startsWith(today)
  ).length ?? 0

  // Prochain tirage planifié (scheduled_at dans le futur, non terminé)
  const { data: prochainTirage } = await supabase
    .from('tirage_sessions')
    .select('id, type, scheduled_at, status')
    .gt('scheduled_at', new Date().toISOString())
    .neq('status', 'completed')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const TYPE_LABELS: Record<string, string> = {
    soiree_16mai: 'Soirée 16 Mai 2026',
    tirage_27mai: 'Tirage 27 Mai 2026',
    mensuel:      'Tirage mensuel',
    trimestriel:  'Tirage trimestriel',
    semestriel:   'Tirage semestriel',
  }

  function formatCountdown(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / 86_400_000)
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const dateLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })

    if (diffDays === 0) return `Aujourd'hui à ${time}`
    if (diffDays === 1) return `Demain à ${time}`
    return `${dateLabel} à ${time} — dans ${diffDays} jours`
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">
          Vue d&apos;ensemble des inscriptions en temps réel.
        </p>
      </div>

      {/* Bannière prochain tirage */}
      {prochainTirage?.scheduled_at && (
        <Link
          href={`/tirages/${prochainTirage.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--brand)',
            borderRadius: '0.875rem',
            marginBottom: '1.75rem',
            textDecoration: 'none',
            transition: 'opacity 150ms ease',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '0.625rem',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Trophy size={18} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.55)', marginBottom: '0.2rem',
            }}>
              Prochain tirage
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '0.9375rem', color: 'white', letterSpacing: '-0.015em',
            }}>
              {TYPE_LABELS[prochainTirage.type] ?? prochainTirage.type}
            </div>
          </div>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {formatCountdown(prochainTirage.scheduled_at)}
          </div>
        </Link>
      )}

      {/* ✅ CORRECTION : cartes stats avec alignement vertical (flex column + justifyContent) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>

        {/* Carte 1 — Total inscrits */}
        <div className="stat-card animate-fade-up" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div className="stat-label">Total inscrits</div>
          <div>
            <div className="stat-value">{totalMembers ?? 0}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
              sur ~150 attendus
            </div>
          </div>
        </div>

        {/* Carte 2 — Aujourd'hui */}
        <div className="stat-card delay-75" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div className="stat-label">Aujourd&apos;hui</div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              +{todayCount}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
              nouvelles inscriptions
            </div>
          </div>
        </div>

        {/* Carte 3 — Étapes couvertes */}
        <div className="stat-card delay-150" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div className="stat-label">Étapes couvertes</div>
          <div>
            <div className="stat-value">
              {Object.keys(countByEtape).length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
              sur 5 étapes
            </div>
          </div>
        </div>

        {/* ✅ AJOUT : Carte 4 — Cumul inscriptions par étape */}
        <div className="stat-card delay-200" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div className="stat-label">Cumul inscriptions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.625rem' }}>
            {(Object.keys(ETAPE_LABELS) as Etape[]).map(etape => (
              <div key={etape} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
                  {ETAPE_LABELS[etape]}
                </span>
                <span style={{
                  fontSize: '0.8125rem', fontWeight: 700,
                  color: (countByEtape[etape] ?? 0) > 0 ? 'var(--brand)' : 'var(--text-4)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {countByEtape[etape] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grille répartition + dernières inscriptions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Répartition par étape */}
        <div className="card">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <MapPin size={16} style={{ color: 'var(--brand-light)' }} />
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem',
              fontWeight: 700, color: 'var(--text-1)', margin: 0,
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
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '0.25rem',
                  }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>
                      {ETAPE_LABELS[etape]}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: 700,
                      color: count > 0 ? 'var(--brand)' : 'var(--text-4)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {count}
                    </span>
                  </div>
                  <div style={{
                    height: 4, background: 'var(--bg-2)',
                    borderRadius: 9999, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
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
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: 'var(--brand-light)' }} />
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: 'var(--text-1)', margin: 0,
                letterSpacing: '-0.01em',
              }}>
                Dernières inscriptions
              </h3>
            </div>
            <Link
              href="/membres"
              style={{
                fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--brand-light)', textDecoration: 'none',
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
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: '0.875rem', color: 'var(--brand)', flexShrink: 0,
                  }}>
                    {m.prenom.charAt(0).toUpperCase()}
                    {m.nom?.charAt(0).toUpperCase() ?? ''}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.prenom} {m.nom ?? ''}
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text-4)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.email}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: 'var(--text-4)', textAlign: 'right', flexShrink: 0,
                  }}>
                    {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ✅ CORRECTION : bouton "Nouvelle inscription" commenté */}
          {/* <Link
            href="/inscription"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', marginTop: '1.25rem', padding: '0.75rem',
              background: 'var(--bg-0)', border: '1.5px dashed var(--border)',
              borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--text-3)', textDecoration: 'none',
              transition: 'all 200ms ease',
            }}
          >
            <UserPlus size={15} />
            Nouvelle inscription
          </Link> */}
        </div>
      </div>
    </div>
  )
}
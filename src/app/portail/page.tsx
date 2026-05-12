import { getMemberPortal } from '@/app/actions/portail'
import PortailForm from './_form'
import Image from 'next/image'
import { PALIER_SEUILS, PALIER_CHANCES } from '@/types'
import type { Palier } from '@/types'
import Link from 'next/link'

const PALIER_CONFIG: Record<Palier, { label: string; color: string; bg: string; next: Palier | null }> = {
  membre:  { label: 'Membre',   color: '#64748b', bg: '#f1f5f9', next: 'argent' },
  argent:  { label: 'Argent',   color: '#475569', bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', next: 'or' },
  or:      { label: 'Or',       color: '#92400e', bg: 'linear-gradient(135deg,#fefce8,#fef9c3)', next: 'vip' },
  vip:     { label: 'VIP',      color: '#5b21b6', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', next: null },
}

function formatAr(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' Ar'
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 160, stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.9)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

export default async function PortailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  if (!email) return <PortailForm />

  const data = await getMemberPortal(email)
  if (!data) return <PortailForm notFound />

  const { member, cumul, palier, nbCommandes, wins, tierRewards } = data
  const cfg = PALIER_CONFIG[palier]
  const nextPalier = cfg.next
  const nextSeuil = nextPalier ? PALIER_SEUILS[nextPalier] : null
  const pct = nextSeuil ? Math.round((cumul / nextSeuil) * 100) : 100
  const remaining = nextSeuil ? nextSeuil - cumul : 0
  const chances = PALIER_CHANCES[palier]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-0)', fontFamily: 'var(--font-body)' }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'var(--brand)',
        paddingBottom: '5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(51,128,141,0.3) 0%, transparent 70%)' }} />

        {/* Header */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
        }}>
          <Image src="/cartin_logo_transparent.png" alt="Cart'In" width={52} height={52} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)' }}>
            VHR Privilèges
          </span>
          <Link href="/portail" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 500 }}>
            Changer
          </Link>
        </div>

        {/* Tier ring + name */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '1rem 0 0.5rem' }}>
          <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 1.25rem' }}>
            <ProgressRing pct={pct} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '1.375rem', letterSpacing: '-0.03em',
                color: 'white', lineHeight: 1,
              }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.25rem', fontWeight: 500 }}>
                {pct}%
              </div>
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            color: 'white', letterSpacing: '-0.03em',
            marginBottom: '0.25rem',
          }}>
            {member.prenom} {member.nom ?? ''}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
            {member.email}
          </p>
        </div>
      </div>

      {/* ── Card principale ── */}
      <div style={{
        marginTop: '-3rem',
        margin: '-3rem 1rem 0',
        background: 'white',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: '0 8px 32px rgba(15,45,53,0.12)',
        position: 'relative', zIndex: 2,
        maxWidth: 480,
        marginLeft: 'auto', marginRight: 'auto',
      }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Cumul',         value: formatAr(cumul)                   },
            { label: 'Commandes',     value: nbCommandes.toString()             },
            { label: 'Chances tirage', value: `×${chances}`                    },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--bg-0)', borderRadius: '0.75rem',
              padding: '0.875rem 0.75rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-4)', marginBottom: '0.25rem' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Progression vers prochain palier */}
        {nextPalier && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>
                Progression vers <strong>{PALIER_CONFIG[nextPalier].label}</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                {formatAr(remaining)} restants
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(pct, 100)}%`,
                background: `linear-gradient(90deg, var(--brand), var(--brand-light))`,
                borderRadius: 9999,
                transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        )}

        {palier === 'vip' && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', borderRadius: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#5b21b6' }}>
              Statut VIP — Palier maximum atteint
            </div>
          </div>
        )}

        {/* Récompenses paliers */}
        {tierRewards.length > 0 && (
          <>
            <div className="divider" style={{ marginBottom: '1.25rem' }} />
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: '0.75rem' }}>
                Récompenses de paliers
              </div>
              {tierRewards.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: i < tierRewards.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{
                    padding: '0.2rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                    background: r.palier === 'vip' ? '#ede9fe' : r.palier === 'or' ? '#fef9c3' : '#e2e8f0',
                    color: r.palier === 'vip' ? '#5b21b6' : r.palier === 'or' ? '#92400e' : '#475569',
                    flexShrink: 0,
                  }}>
                    {r.palier}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', flex: 1 }}>{r.lot_nom}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: r.statut === 'delivered' ? '#16a34a' : 'var(--accent)' }}>
                    {r.statut === 'delivered' ? 'Livré' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tirages gagnés */}
        {wins.length > 0 && (
          <>
            <div className="divider" style={{ marginBottom: '1.25rem' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)', marginBottom: '0.75rem' }}>
                Tirages gagnés
              </div>
              {wins.slice(0, 5).map((w: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0',
                  borderBottom: i < Math.min(wins.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6875rem' }}>🏆</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                    {w.session_lots?.lots?.nom ?? 'Lot tiré'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginLeft: 'auto' }}>
                    {new Date(w.confirmed_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-4)', fontSize: '0.8125rem' }}>
        Cart&apos;In × VHR Privilèges — Rallye Madagascar 2026
      </div>
    </div>
  )
}
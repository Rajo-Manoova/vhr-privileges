import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { LotCategorie, Etape } from '@/types'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, ETAPE_LABELS } from '@/types'
import Pagination from '@/components/Pagination'

const PER_PAGE = 10

export default async function RecompensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    session?: string
    categorie?: string
    etape?: string
    page?: string
  }>
}) {
  await requireRole(['admin'])
  const params    = await searchParams
  const sessionId = params.session   || 'all'
  const categorie = params.categorie || 'all'
  const etape     = params.etape     || 'all'
  const page      = Math.max(1, parseInt(params.page ?? '1'))
  const from      = (page - 1) * PER_PAGE

  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('tirage_sessions')
    .select('id, label, type, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  let winsQuery = supabase
    .from('tirage_wins')
    .select(`
      id,
      confirmed_at,
      session_id,
      members!inner(id, prenom, nom, email, etape),
      session_lots!inner(
        ordre,
        lots!inner(id, nom, categorie, valeur_ar)
      ),
      tirage_sessions!inner(id, label, type, completed_at)
    `, { count: 'exact' })

  if (sessionId !== 'all') winsQuery = winsQuery.eq('session_id', sessionId)
  if (categorie !== 'all') winsQuery = winsQuery.eq('session_lots.lots.categorie', categorie)
  if (etape     !== 'all') winsQuery = winsQuery.eq('members.etape', etape)

  const { data: wins, count } = await winsQuery
    .order('confirmed_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  const LEGACY_LABELS: Record<string, string> = {
    soiree_16mai: 'Soirée 16 Mai 2026',
    tirage_27mai: 'Tirage 27 Mai 2026',
  }
  function sessionLabel(s: { label?: string | null; type: string }) {
    return s.label?.trim() || LEGACY_LABELS[s.type] || s.type
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (sessionId !== 'all') base.session   = sessionId
    if (categorie !== 'all') base.categorie = categorie
    if (etape     !== 'all') base.etape     = etape
    const merged = { ...base, ...overrides }
    const clean  = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/recompenses${qs ? `?${qs}` : ''}`
  }

  /* ── shared filter pill style ── */
  const pill = (active: boolean, small = false) => ({
    padding: small ? '0.25rem 0.625rem' : '0.375rem 0.75rem',
    borderRadius: 9999 as const,
    fontSize: small ? '0.75rem' : '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none' as const,
    whiteSpace: 'nowrap' as const,
    background: active ? (small ? 'rgba(15,45,53,0.08)' : 'var(--brand)') : (small ? 'transparent' : 'white'),
    color: active ? (small ? 'var(--brand)' : 'white') : (small ? 'var(--text-4)' : 'var(--text-3)'),
    border: `${small ? '1px' : '1.5px'} solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historique des gains</h1>
        <p className="page-subtitle">
          {count ?? 0} gain{(count ?? 0) > 1 ? 's' : ''} enregistré{(count ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>

        {/* Sessions — scrollable sur mobile */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingBottom: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', minWidth: 'max-content' }}>
            <Link href={buildUrl({ session: undefined, page: '1' })} style={pill(sessionId === 'all')}>
              Toutes les sessions
            </Link>
            {(sessions ?? []).map(s => (
              <Link key={s.id} href={buildUrl({ session: s.id, page: '1' })} style={pill(sessionId === s.id)}>
                {sessionLabel(s)}
              </Link>
            ))}
          </div>
        </div>

        {/* Catégorie + Étape — scrollable sur mobile */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingBottom: '0.25rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', minWidth: 'max-content' }}>
            {[
              { value: 'all', label: 'Toutes catégories' },
              ...Object.entries(CATEGORIE_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ].map(({ value, label }) => (
              <Link key={value} href={buildUrl({ categorie: value === 'all' ? undefined : value, page: '1' })} style={pill(categorie === value, true)}>
                {label}
              </Link>
            ))}

            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem', flexShrink: 0 }} />

            {[
              { value: 'all', label: 'Toutes étapes' },
              ...Object.entries(ETAPE_LABELS).map(([v, l]) => ({ value: v, label: l.split('(')[0].trim() })),
            ].map(({ value, label }) => (
              <Link key={value} href={buildUrl({ etape: value === 'all' ? undefined : value, page: '1' })} style={pill(etape === value, true)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {(wins ?? []).length === 0 ? (
        <div className="empty-state">
          <Trophy size={36} />
          <h3>Aucun gain enregistré</h3>
          <p>Les gains issus des tirages apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div style={{ minWidth: 560 }}>

              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 110px',
                gap: '0.75rem', padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
              }}>
                {['Membre', 'Lot gagné', 'Session', 'Date'].map(label => (
                  <div key={label} style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-4)' }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {(wins ?? []).map((win: any, i: number) => {
                const member  = win.members
                const lot     = win.session_lots?.lots
                const session = win.tirage_sessions
                const cc      = lot?.categorie
                  ? (CATEGORIE_COLORS[lot.categorie as LotCategorie] ?? { bg: '#f0f7f8', color: '#2c6976' })
                  : { bg: '#f0f7f8', color: '#2c6976' }

                return (
                  <div key={win.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 110px',
                    gap: '0.75rem', padding: '0.75rem 1.25rem', alignItems: 'center',
                    borderBottom: i < (wins?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none',
                    background: 'white',
                  }}>

                    {/* Membre */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member?.prenom} {member?.nom ?? ''}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ETAPE_LABELS[member?.etape as Etape]?.split('(')[0].trim() ?? member?.etape}
                      </div>
                    </div>

                    {/* Lot */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lot?.nom ?? '—'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                        {lot?.categorie && (
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: 9999, fontSize: '0.625rem', fontWeight: 700, background: cc.bg, color: cc.color }}>
                            {CATEGORIE_LABELS[lot.categorie as LotCategorie] ?? lot.categorie}
                          </span>
                        )}
                        {lot?.valeur_ar && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-4)' }}>
                            {lot.valeur_ar.toLocaleString('fr-FR')} Ar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Session */}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session ? sessionLabel(session) : '—'}
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                      {win.confirmed_at
                        ? new Date(win.confirmed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Pagination currentPage={page} totalPages={totalPages} buildUrl={(p) => buildUrl({ page: p.toString() })} />
        </>
      )}
    </div>
  )
}
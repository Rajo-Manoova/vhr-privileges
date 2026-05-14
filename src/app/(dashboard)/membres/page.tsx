import { createClient } from '@/lib/supabase/server'
import { Users, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { ETAPE_LABELS, PALIER_LABELS, PALIER_COLORS } from '@/types'
import type { Etape, Palier, Member } from '@/types'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import MemberEditForm from '@/components/MemberEditForm'
import ResetPinButton from '@/components/ResetPinButton'
import ToggleActifButton from '@/components/ToggleActifButton'
import NiveauSelect from '@/components/NiveauSelect'
import type { ReactElement } from 'react'

const PER_PAGE = 10
type SortField = 'prenom' | 'email' | 'etape' | 'niveau' | 'cumul_ar' | 'created_at'

const COLS = 'minmax(170px, 1fr) 120px 130px 160px 210px'

const PALIERS: Array<{ value: string; label: string }> = [
  { value: 'all',    label: 'Tous niveaux' },
  { value: 'membre', label: 'Membre'  },
  { value: 'argent', label: 'Argent'  },
  { value: 'or',     label: 'Or'      },
  { value: 'vip',    label: 'VIP'     },
]

function SortIcon(props: { field: string; sort: string; dir: string }): ReactElement {
  const { field, sort, dir } = props
  if (sort !== field) return <ArrowUpDown size={11} style={{ opacity: 0.4 }} />
  if (dir === 'asc') return <ArrowUp size={11} style={{ color: 'var(--brand)' }} />
  return <ArrowDown size={11} style={{ color: 'var(--brand)' }} />
}

export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<{
    etape?: string
    niveau?: string
    q?: string
    page?: string
    sort?: string
    dir?: string
    edit?: string
  }>
}) {
  const params       = await searchParams
  const etapeFilter  = params.etape?.trim()  || ''
  const niveauFilter = params.niveau?.trim() || ''
  const query        = params.q?.trim()      || ''
  const page         = Math.max(1, parseInt(params.page ?? '1'))
  const sort         = (params.sort?.trim()  || 'created_at') as SortField
  const dir          = params.dir === 'asc' ? 'asc' : 'desc'
  const editId       = params.edit

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: roleData } = await supabase
    .from('user_roles').select('role').eq('user_id', user?.id ?? '').single()
  const isAdmin = roleData?.role === 'admin'

  let req = supabase.from('members').select('*', { count: 'exact' })
  if (etapeFilter  && etapeFilter  !== 'all') req = req.eq('etape',  etapeFilter)
  if (niveauFilter && niveauFilter !== 'all') req = req.eq('niveau', niveauFilter)
  if (query) {
    req = req.or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,email.ilike.%${query}%`)
  }

  const validSorts: SortField[] = ['prenom', 'email', 'etape', 'niveau', 'cumul_ar', 'created_at']
  const sortField = validSorts.includes(sort) ? sort : 'created_at'
  const from = (page - 1) * PER_PAGE

  const { data: membersRaw, count } = await req
    .order(sortField, { ascending: dir === 'asc' })
    .range(from, from + PER_PAGE - 1)

  const members = (membersRaw ?? []) as Member[]
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  let editMember = null
  if (editId) {
    const { data } = await supabase.from('members').select('*').eq('id', editId).single()
    editMember = data
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (etapeFilter  && etapeFilter  !== 'all') base.etape  = etapeFilter
    if (niveauFilter && niveauFilter !== 'all') base.niveau = niveauFilter
    if (query) base.q = query
    if (dir   !== 'desc')       base.dir  = dir
    if (sort  !== 'created_at') base.sort = sort
    const merged = { ...base, ...overrides }
    const clean = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/membres${qs ? `?${qs}` : ''}`
  }

  function sortUrl(field: SortField) {
    const newDir = sort === field && dir === 'desc' ? 'asc' : 'desc'
    return buildUrl({ sort: field, dir: newDir, page: '1' })
  }

  const ep = new URLSearchParams()
  if (etapeFilter  && etapeFilter  !== 'all') ep.set('etape',  etapeFilter)
  if (niveauFilter && niveauFilter !== 'all') ep.set('niveau', niveauFilter)
  if (query) ep.set('q', query)
  const exportUrl = ep.toString()
    ? `/api/export/membres?${ep.toString()}`
    : '/api/export/membres'

  return (
    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Membres</h1>
          <p className="page-subtitle">
            {count ?? 0} inscrit{(count ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <a href={exportUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: 'white', color: 'var(--text-2)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
              ↓ CSV
            </a>
          )}
          <Link href="/inscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
            + Inscrire
          </Link>
        </div>
      </div>

      {/* Formulaire édition inline */}
      {editMember && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)', maxWidth: 640 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Modifier — {editMember.prenom} {editMember.nom ?? ''}
          </div>
          <MemberEditForm member={editMember} />
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Recherche */}
        <form method="GET" style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          <input name="q" type="text" className="input" defaultValue={query} placeholder="Rechercher par nom ou email…" style={{ paddingLeft: '2.5rem' }} />
          {etapeFilter  && etapeFilter  !== 'all' && <input type="hidden" name="etape"  value={etapeFilter}  />}
          {niveauFilter && niveauFilter !== 'all' && <input type="hidden" name="niveau" value={niveauFilter} />}
        </form>

        {/* Tabs niveau */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {PALIERS.map(({ value, label }) => {
            const active  = (niveauFilter || 'all') === value
            const palierC = value !== 'all' ? PALIER_COLORS[value as Palier] : null
            return (
              <Link
                key={value}
                href={value === 'all'
                  ? buildUrl({ niveau: undefined, page: '1' })
                  : buildUrl({ niveau: value, page: '1' })
                }
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 9999,
                  fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                  background: active ? (palierC?.bg ?? 'var(--brand)') : 'white',
                  color: active ? (palierC?.color ?? 'white') : 'var(--text-3)',
                  border: `1.5px solid ${active ? (palierC?.border ?? 'var(--brand)') : 'var(--border)'}`,
                  transition: 'all 150ms ease', fontFamily: 'var(--font-body)',
                }}
              >
                {label}
              </Link>
            )
          })}

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem' }} />

          {/* Tabs étapes */}
          {[
            { value: 'all', label: 'Toutes' },
            ...Object.entries(ETAPE_LABELS).map(([v, l]) => ({ value: v, label: l.split('(')[0].trim() })),
          ].map(({ value, label }) => {
            const active = (etapeFilter || 'all') === value
            return (
              <Link
                key={value}
                href={value === 'all'
                  ? buildUrl({ etape: undefined, page: '1' })
                  : buildUrl({ etape: value, page: '1' })
                }
                style={{
                  padding: '0.25rem 0.625rem', borderRadius: 9999,
                  fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                  background: active ? 'rgba(15,45,53,0.08)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text-4)',
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' as const,
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      {members.length === 0 ? (
        <div className="empty-state">
          <Users size={36} />
          <h3>Aucun membre trouvé</h3>
          <p>{query ? 'Aucun résultat pour cette recherche.' : 'Les inscriptions apparaîtront ici.'}</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 820 }}>

              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '1rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                {(
                  [
                    { label: 'Membre',     field: 'prenom'     as SortField },
                    { label: 'Niveau',     field: 'niveau'     as SortField },
                    { label: 'Étape',      field: 'etape'      as SortField },
                    { label: 'Cumul',      field: 'cumul_ar'   as SortField },
                    { label: 'Actions',    field: null },
                  ] as { label: string; field: SortField | null }[]
                ).map(({ label, field }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {field ? (
                      <Link href={sortUrl(field)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: sort === field ? 'var(--brand)' : 'var(--text-4)' }}>
                        {label}
                        <SortIcon field={field} sort={sort} dir={dir} />
                      </Link>
                    ) : (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)' }}>
                        {label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {members.map((m, i) => {
                const isInactive = m.actif === false
                const fullName   = `${m.prenom} ${m.nom ?? ''}`.trim()

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
                      padding: '0.875rem 1.25rem', alignItems: 'center',
                      borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                      background: editId === m.id ? 'rgba(217,119,6,0.04)' : isInactive ? 'var(--bg-1)' : 'white',
                      opacity: isInactive ? 0.7 : 1,
                      transition: 'opacity 200ms ease',
                    }}
                  >
                    {/* Membre : avatar + nom + email + whatsapp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: isInactive ? 'var(--bg-2)' : 'rgba(15,45,53,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', color: isInactive ? 'var(--text-4)' : 'var(--brand)', flexShrink: 0 }}>
                        {m.prenom.charAt(0).toUpperCase()}{(m.nom ?? '').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.125rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflowWrap: 'break-word' }}>  
                            {fullName}
                          </span>
                          {isInactive && (
                            <span style={{ padding: '0.1rem 0.375rem', borderRadius: 9999, fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: '#fee2e2', color: '#dc2626', flexShrink: 0 }}>
                              Inactif
                            </span>
                          )}
                          {m.notes && (
                            <span title={m.notes} style={{ fontSize: '0.5625rem', padding: '0.1rem 0.375rem', borderRadius: 9999, background: '#fef9c3', color: '#d97706', fontWeight: 700, flexShrink: 0, cursor: 'help', whiteSpace: 'nowrap' as const }}>
                              📝
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)' }}>{m.whatsapp}</div>
                      </div>
                    </div>

                    {/* Niveau — select inline */}
                    <div>
                      {isAdmin
                        ? <NiveauSelect memberId={m.id} niveau={m.niveau ?? 'membre'} memberName={fullName} />
                        : (
                          <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: PALIER_COLORS[m.niveau ?? 'membre'].bg, color: PALIER_COLORS[m.niveau ?? 'membre'].color, border: `1px solid ${PALIER_COLORS[m.niveau ?? 'membre'].border}` }}>
                            {PALIER_LABELS[m.niveau ?? 'membre']}
                          </span>
                        )
                      }
                    </div>

                    {/* Étape */}
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: isInactive ? 'var(--bg-2)' : 'rgba(51,128,141,0.08)', color: isInactive ? 'var(--text-4)' : 'var(--brand-light)', whiteSpace: 'nowrap' as const }}>
                      {ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape}
                    </span>

                    {/* Cumul */}
                    <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: (m.cumul_ar ?? 0) > 0 ? 'var(--text-1)' : 'var(--text-4)' }}>
                      {(m.cumul_ar ?? 0) > 0
                        ? <>{(m.cumul_ar).toLocaleString('fr-FR')} <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--text-4)' }}>Ar</span></>
                        : <span style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>—</span>
                      }
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {editId === m.id ? (
                        <Link href={buildUrl({ edit: undefined })} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-3)', textDecoration: 'none' }}>
                          Annuler
                        </Link>
                      ) : (
                        <Link href={buildUrl({ edit: m.id })} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-1)', color: 'var(--text-2)', textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' as const }}>
                          Éditer
                        </Link>
                      )}
                      {isAdmin && <ResetPinButton memberId={m.id} memberName={fullName} />}
                      {isAdmin && <ToggleActifButton memberId={m.id} actif={m.actif !== false} memberName={fullName} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildUrl={(p) => buildUrl({ page: p.toString() })}
          />
        </>
      )}
    </div>
  )
}
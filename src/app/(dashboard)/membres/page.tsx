import { createClient } from '@/lib/supabase/server'
import { Users, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import MemberEditForm from '@/components/MemberEditForm'
import ResetPinButton from '@/components/ResetPinButton'

const PER_PAGE = 20
type SortField = 'prenom' | 'email' | 'etape' | 'created_at'

export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<{
    etape?: string; q?: string; page?: string
    sort?: string; dir?: string; edit?: string
  }>
}) {
  const params      = await searchParams
  const etapeFilter = params.etape?.trim()  || ''
  const query       = params.q?.trim()      || ''
  const page        = Math.max(1, parseInt(params.page ?? '1'))
  const sort        = (params.sort?.trim()  || 'created_at') as SortField
  const dir         = params.dir === 'asc' ? 'asc' : 'desc'
  const editId      = params.edit

  const supabase = await createClient()

  let req = supabase.from('members').select('*', { count: 'exact' })
  if (etapeFilter && etapeFilter !== 'all') req = req.eq('etape', etapeFilter)
  if (query) req = req.or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,email.ilike.%${query}%`)

  const validSorts: SortField[] = ['prenom', 'email', 'etape', 'created_at']
  const sortField = validSorts.includes(sort) ? sort : 'created_at'
  const from = (page - 1) * PER_PAGE

  const { data: members, count } = await req
    .order(sortField, { ascending: dir === 'asc' })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  // Membre en édition
  let editMember = null
  if (editId) {
    const { data } = await supabase.from('members').select('*').eq('id', editId).single()
    editMember = data
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (etapeFilter && etapeFilter !== 'all') base.etape = etapeFilter
    if (query) base.q  = query
    if (dir !== 'desc') base.dir  = dir
    if (sort !== 'created_at') base.sort = sort
    const merged = { ...base, ...overrides }
    const clean  = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/membres${qs ? `?${qs}` : ''}`
  }

  function sortUrl(field: SortField) {
    const newDir = sort === field && dir === 'desc' ? 'asc' : 'desc'
    return buildUrl({ sort: field, dir: newDir, page: '1' })
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
    return dir === 'asc'
      ? <ArrowUp   size={12} style={{ color: 'var(--brand)' }} />
      : <ArrowDown size={12} style={{ color: 'var(--brand)' }} />
  }

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
        <Link
          href="/inscription"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)' }}
        >
          + Inscrire
        </Link>
      </div>

      {/* Formulaire d'édition inline */}
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
          <input
            name="q" type="text" className="input"
            defaultValue={query}
            placeholder="Rechercher par nom ou email…"
            style={{ paddingLeft: '2.5rem' }}
          />
          {etapeFilter && etapeFilter !== 'all' && (
            <input type="hidden" name="etape" value={etapeFilter} />
          )}
        </form>

        {/* Tabs étapes */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'Toutes' },
            ...Object.entries(ETAPE_LABELS).map(([v, l]) => ({
              value: v,
              label: l.split('(')[0].trim(),
            })),
          ].map(({ value, label }) => {
            const active = (etapeFilter || 'all') === value
            return (
              <Link
                key={value}
                href={value === 'all'
                  ? buildUrl({ etape: undefined, page: '1' })
                  : buildUrl({ etape: value, page: '1' })
                }
                style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', background: active ? 'var(--brand)' : 'white', color: active ? 'white' : 'var(--text-3)', border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`, transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      {!members || members.length === 0 ? (
        <div className="empty-state">
          <Users size={36} />
          <h3>Aucun membre trouvé</h3>
          <p>{query ? 'Aucun résultat pour cette recherche.' : 'Les inscriptions apparaîtront ici.'}</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 760 }}>

              {/* Header colonnes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px 160px', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                {([
                  { label: 'Membre',    field: 'prenom'     as SortField },
                  { label: 'Contact',   field: 'email'      as SortField },
                  { label: 'Étape',     field: 'etape'      as SortField },
                  { label: 'Inscrit le', field: 'created_at' as SortField },
                  { label: 'Actions',   field: null },
                ] as { label: string; field: SortField | null }[]).map(({ label, field }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {field ? (
                      <Link
                        href={sortUrl(field)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: sort === field ? 'var(--brand)' : 'var(--text-4)' }}
                      >
                        {label}
                        <SortIcon field={field} />
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
              {members.map((m, i) => (
                <div
                  key={m.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px 160px', gap: '1rem', padding: '0.875rem 1.5rem', alignItems: 'center', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none', background: editId === m.id ? 'rgba(217,119,6,0.04)' : 'white' }}
                >
                  {/* Nom */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--brand)', flexShrink: 0 }}>
                      {m.prenom.charAt(0).toUpperCase()}{(m.nom ?? '').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.prenom} {m.nom ?? ''}
                    </span>
                  </div>

                  {/* Contact */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                      {m.whatsapp}
                    </div>
                  </div>

                  {/* Étape */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-light)', background: 'rgba(51,128,141,0.08)', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                    {new Date(m.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>

                  {/* Actions : Éditer + PIN */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {editId === m.id ? (
                      <Link
                        href={buildUrl({ edit: undefined })}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-3)', textDecoration: 'none' }}
                      >
                        Annuler
                      </Link>
                    ) : (
                      <Link
                        href={buildUrl({ edit: m.id })}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-1)', color: 'var(--text-2)', textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}
                      >
                        Éditer
                      </Link>
                    )}
                    <ResetPinButton
                      memberId={m.id}
                      memberName={`${m.prenom} ${m.nom ?? ''}`.trim()}
                    />
                  </div>
                </div>
              ))}
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
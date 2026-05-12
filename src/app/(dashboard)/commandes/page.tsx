import { createClient } from '@/lib/supabase/server'
import { ArrowUp, ArrowDown, ArrowUpDown, ShoppingCart, TrendingUp, Users, Search } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import CommandeAddForm from '@/components/CommandeAddForm'
import CommandeEditForm from '@/components/CommandeEditForm'
import DeleteCommandeButton from '@/components/DeleteCommandeButton'

const PER_PAGE = 20

const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:     { bg: '#dcfce7', color: '#16a34a', label: 'Active'     },
  annulee:    { bg: '#fee2e2', color: '#dc2626', label: 'Annulée'    },
  remboursee: { bg: '#fef3c7', color: '#d97706', label: 'Remboursée' },
}

function formatAr(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' Ar'
}

type SortField = 'commande_date' | 'montant_ar' | 'statut' | 'created_at'

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; statut?: string; sort?: string; dir?: string
    page?: string; edit?: string
  }>
}) {
  const params = await searchParams
  const q      = params.q ?? ''
  const statut = params.statut ?? 'all'
  const sort   = (params.sort ?? 'commande_date') as SortField
  const dir    = params.dir === 'asc' ? 'asc' : 'desc'
  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const editId = params.edit

  const supabase = await createClient()

  // Membres pour le formulaire d'ajout
  const { data: members } = await supabase
    .from('members').select('id, prenom, nom, email').order('prenom')

  // Recherche par membre
  let memberFilter: string[] | null = null
  if (q.trim()) {
    const { data: m } = await supabase.from('members').select('id')
      .or(`prenom.ilike.%${q}%,nom.ilike.%${q}%,email.ilike.%${q}%`)
    memberFilter = m?.map(x => x.id) ?? []
  }

  // Stats globales (toutes les commandes actives)
  const { data: allActive } = await supabase
    .from('commandes').select('montant_ar, member_id').eq('statut', 'active')
  const totalCA  = allActive?.reduce((s, c) => s + c.montant_ar, 0) ?? 0
  const eligible = new Set(allActive?.map(c => c.member_id) ?? []).size
  const totalActiveCount = allActive?.length ?? 0

  // Requête paginée
  let req = supabase.from('commandes')
    .select('*, members(id, prenom, nom, email)', { count: 'exact' })

  if (statut !== 'all') req = req.eq('statut', statut)

  if (memberFilter !== null) {
    if (memberFilter.length === 0) {
      // Aucun membre correspond — renvoyer vide
      const from = (page - 1) * PER_PAGE
      return renderPage({
        commandes: [], count: 0, members: members ?? [],
        totalActiveCount, totalCA, eligible,
        page, totalPages: 0, sort, dir, q, statut,
        editId: null, editCommande: null,
      })
    }
    req = req.in('member_id', memberFilter)
  }

  const validSorts: SortField[] = ['commande_date', 'montant_ar', 'statut', 'created_at']
  const sortField = validSorts.includes(sort) ? sort : 'commande_date'
  const from = (page - 1) * PER_PAGE

  const { data: commandes, count } = await req
    .order(sortField, { ascending: dir === 'asc' })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  // Commande en édition
  let editCommande = null
  if (editId) {
    const { data } = await supabase.from('commandes')
      .select('*, members(id, prenom, nom, email)').eq('id', editId).single()
    editCommande = data
  }

  return renderPage({
    commandes: commandes ?? [], count: count ?? 0,
    members: members ?? [],
    totalActiveCount, totalCA, eligible,
    page, totalPages, sort: sortField, dir, q, statut,
    editId, editCommande,
  })
}

function renderPage({
  commandes, count, members, totalActiveCount, totalCA, eligible,
  page, totalPages, sort, dir, q, statut, editId, editCommande,
}: any) {

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q)          base.q      = q
    if (statut && statut !== 'all') base.statut = statut
    if (sort && sort !== 'commande_date') base.sort = sort
    if (dir  && dir !== 'desc')  base.dir  = dir
    const merged = { ...base, ...overrides }
    const clean  = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/commandes${qs ? `?${qs}` : ''}`
  }

  function sortUrl(field: string) {
    const newDir = sort === field && dir === 'desc' ? 'asc' : 'desc'
    return buildUrl({ sort: field, dir: newDir, page: '1' })
  }

  function SortIcon({ field }: { field: string }) {
    if (sort !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
    return dir === 'asc' ? <ArrowUp size={12} style={{ color: 'var(--brand)' }} /> : <ArrowDown size={12} style={{ color: 'var(--brand)' }} />
  }

  return (
    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Commandes</h1>
          <p className="page-subtitle">
            {count} commande{count > 1 ? 's' : ''}
            {q ? ` pour "${q}"` : ''}
          </p>
        </div>
        <CommandeAddForm members={members} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {[
          { icon: ShoppingCart, label: 'Commandes actives', value: totalActiveCount.toString(), color: 'var(--brand)'  },
          { icon: TrendingUp,   label: 'CA total',           value: formatAr(totalCA),          color: 'var(--accent)' },
          { icon: Users,        label: 'Éligibles 27 Mai',   value: `${eligible}`,              color: '#16a34a'       },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Icon size={14} style={{ color }} />
              <span className="stat-label">{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1rem, 2.5vw, 1.375rem)', letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire d'édition inline */}
      {editCommande && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)', maxWidth: 640 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Modifier la commande
          </div>
          <CommandeEditForm commande={editCommande} />
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {/* Recherche */}
        <form method="GET" style={{ position: 'relative', maxWidth: 380 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          <input name="q" type="text" className="input" defaultValue={q} placeholder="Rechercher un membre…" style={{ paddingLeft: '2.5rem' }} />
          {statut !== 'all' && <input type="hidden" name="statut" value={statut} />}
        </form>

        {/* Tabs statut */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {[
            { value: 'all',        label: 'Toutes'      },
            { value: 'active',     label: 'Actives'     },
            { value: 'annulee',    label: 'Annulées'    },
            { value: 'remboursee', label: 'Remboursées' },
          ].map(({ value, label }) => {
            const active = statut === value
            return (
              <Link key={value} href={buildUrl({ statut: value === 'all' ? undefined : value, page: '1' })}
                style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', background: active ? 'var(--brand)' : 'white', color: active ? 'white' : 'var(--text-3)', border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`, transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      {commandes.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={36} />
          <h3>Aucune commande</h3>
          <p>{q ? `Aucun résultat pour "${q}"` : 'Enregistrez des commandes Cart\'In.'}</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 640 }}>
              {/* En-tête colonnes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 110px 80px', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                {([
                  { label: 'Membre',  field: null             },
                  { label: 'Montant', field: 'montant_ar'     },
                  { label: 'Date',    field: 'commande_date'  },
                  { label: 'Statut',  field: 'statut'         },
                  { label: '',        field: null             },
                ] as { label: string; field: string | null }[]).map(({ label, field }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {field ? (
                      <Link href={sortUrl(field)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: sort === field ? 'var(--brand)' : 'var(--text-4)' }}>
                        {label}
                        <SortIcon field={field} />
                      </Link>
                    ) : (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)' }}>{label}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {commandes.map((c: any, i: number) => {
                const m   = c.members
                const sty = STATUT_STYLES[c.statut] ?? STATUT_STYLES.active
                const isEditing = editId === c.id
                return (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 110px 80px', gap: '1rem', padding: '0.875rem 1.5rem', alignItems: 'center', borderBottom: i < commandes.length - 1 ? '1px solid var(--border)' : 'none', background: isEditing ? 'rgba(217,119,6,0.04)' : 'white' }}>
                    {/* Membre */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m ? `${m.prenom} ${m.nom ?? ''}` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m?.email}
                      </div>
                    </div>
                    {/* Montant */}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                      {formatAr(c.montant_ar)}
                    </div>
                    {/* Date */}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {new Date(c.commande_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    {/* Statut */}
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', background: sty.bg, color: sty.color, whiteSpace: 'nowrap' as const }}>
                      {sty.label}
                    </span>
                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isEditing ? (
                        <Link href={buildUrl({ edit: undefined })} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-3)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          ✕
                        </Link>
                      ) : (
                        <Link href={buildUrl({ edit: c.id })} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-1)', color: 'var(--text-2)', textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          Éditer
                        </Link>
                      )}
                      <DeleteCommandeButton id={c.id} />
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
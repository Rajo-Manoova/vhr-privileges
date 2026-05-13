import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react'
import Link from 'next/link'
import CatalogueManager from '@/components/CatalogueManager'
import LotEditForm from '@/components/LotEditForm'
import ToggleLotButton from '@/components/ToggleLotButton'
import Pagination from '@/components/Pagination'
import type { Lot, LotPalier, LotCategorie } from '@/types'
import { CATEGORIE_LABELS } from '@/types'

const PER_PAGE = 10

const PALIER_LABELS: Record<LotPalier, string> = {
  soiree:       'Soirée',
  tirage_27mai: '27 Mai',
  argent:       'Argent',
  or:           'Or',
  vip:          'VIP',
}

type SortField = 'nom' | 'palier' | 'categorie' | 'stock' | 'created_at'

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    palier?: string; categorie?: string; q?: string; disponible?: string
    sort?: string; dir?: string; page?: string; edit?: string
  }>
}) {
  await requireRole(['admin'])
  const params     = await searchParams
  const palier     = params.palier?.trim()     || 'all'
  const categorie  = params.categorie?.trim()  || 'all'
  const q          = params.q?.trim()          || ''
  const disponible = params.disponible?.trim() || 'all'
  const sort       = (params.sort?.trim()      || 'created_at') as SortField
  const dir        = params.dir === 'asc' ? 'asc' : 'desc'
  const page       = Math.max(1, parseInt(params.page ?? '1'))
  const editId     = params.edit

  const supabase = await createClient()

  let req = supabase.from('lots').select('*', { count: 'exact' })
  if (palier    && palier    !== 'all') req = req.eq('palier',    palier)
  if (categorie && categorie !== 'all') req = req.eq('categorie', categorie)
  if (disponible === 'oui')             req = req.eq('disponible', true)
  if (disponible === 'non')             req = req.eq('disponible', false)
  if (q)                                req = req.ilike('nom', `%${q}%`)

  const validSorts: SortField[] = ['nom', 'palier', 'categorie', 'stock', 'created_at']
  const sortField = validSorts.includes(sort) ? sort : 'created_at'
  const from = (page - 1) * PER_PAGE

  const { data: lots, count } = await req
    .order(sortField, { ascending: dir === 'asc' })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  let editLot = null
  if (editId) {
    const { data } = await supabase.from('lots').select('*').eq('id', editId).single()
    editLot = data
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (palier    && palier    !== 'all') base.palier    = palier
    if (categorie && categorie !== 'all') base.categorie = categorie
    if (disponible && disponible !== 'all') base.disponible = disponible
    if (q)    base.q    = q
    if (sort && sort !== 'created_at') base.sort = sort
    if (dir  && dir  !== 'desc')       base.dir  = dir
    const merged = { ...base, ...overrides }
    const clean  = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/catalogue${qs ? `?${qs}` : ''}`
  }

  function sortUrl(field: string) {
    const newDir = sort === field && dir === 'desc' ? 'asc' : 'desc'
    return buildUrl({ sort: field, dir: newDir, page: '1' })
  }

  function SortIcon({ field }: { field: string }) {
    if (sort !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
    return dir === 'asc'
      ? <ArrowUp   size={12} style={{ color: 'var(--brand)' }} />
      : <ArrowDown size={12} style={{ color: 'var(--brand)' }} />
  }

  const COLS = '1fr 85px 85px 55px 175px'

  return (
    <div>
      <div className="page-header" style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 className="page-title">Catalogue des lots</h1>
          <p className="page-subtitle">{count ?? 0} lot{(count ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <CatalogueManager />
      </div>

      {/* Formulaire édition */}
      {editLot && (
        <div className="card animate-fade-in" style={{
          marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)', maxWidth: 640,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Modifier — {editLot.nom}
          </div>
          <LotEditForm lot={editLot} />
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <form method="GET" style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={15} style={{
            position: 'absolute', left: '0.875rem', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
          }} />
          <input name="q" type="text" className="input" defaultValue={q}
            placeholder="Rechercher un lot…" style={{ paddingLeft: '2.5rem' }} />
          {palier     !== 'all' && <input type="hidden" name="palier"     value={palier}     />}
          {categorie  !== 'all' && <input type="hidden" name="categorie"  value={categorie}  />}
          {disponible !== 'all' && <input type="hidden" name="disponible" value={disponible} />}
        </form>

        {/* Tabs palier */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'Tous' },
            ...Object.entries(PALIER_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ].map(({ value, label }) => {
            const active = palier === value
            return (
              <Link key={value}
                href={buildUrl({ palier: value === 'all' ? undefined : value, page: '1' })}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 9999,
                  fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                  background: active ? 'var(--brand)' : 'white',
                  color: active ? 'white' : 'var(--text-3)',
                  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                }}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Catégorie + disponibilité */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { value: 'all',       label: 'Toutes catégories' },
            { value: 'petit',     label: 'Découverte'        },
            { value: 'gros',      label: 'Prestige'          },
            { value: 'tres_gros', label: 'Grand Prix'        },
          ].map(({ value, label }) => {
            const active = categorie === value
            return (
              <Link key={value}
                href={buildUrl({ categorie: value === 'all' ? undefined : value, page: '1' })}
                style={{
                  padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: '0.75rem',
                  fontWeight: 600, textDecoration: 'none',
                  background: active ? 'rgba(15,45,53,0.08)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text-4)',
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                }}>
                {label}
              </Link>
            )
          })}

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.25rem' }} />

          {[
            { value: 'all', label: 'Tous'          },
            { value: 'oui', label: '✓ Disponibles' },
            { value: 'non', label: '✗ Désactivés'  },
          ].map(({ value, label }) => {
            const active = disponible === value
            return (
              <Link key={value}
                href={buildUrl({ disponible: value === 'all' ? undefined : value, page: '1' })}
                style={{
                  padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: '0.75rem',
                  fontWeight: 600, textDecoration: 'none',
                  background: active ? 'rgba(15,45,53,0.08)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text-4)',
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  transition: 'all 150ms ease', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                }}>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {!lots || lots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2rem' }}>📦</div>
          <h3>Aucun lot trouvé</h3>
          <p>{q ? `Aucun résultat pour "${q}"` : 'Ajoutez des lots au catalogue.'}</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 720 }}>

              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: COLS,
                gap: '0.75rem', padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
              }}>
                {([
                  { label: 'Lot',       field: 'nom'       },
                  { label: 'Catégorie', field: 'categorie' },
                  { label: 'Programme', field: 'palier'    },
                  { label: 'Stock',     field: 'stock'     },
                  { label: 'Actions',   field: null        },
                ] as { label: string; field: string | null }[]).map(({ label, field }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    {field ? (
                      <Link href={sortUrl(field)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        textDecoration: 'none', fontSize: '0.6875rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: sort === field ? 'var(--brand)' : 'var(--text-4)',
                      }}>
                        {label} <SortIcon field={field} />
                      </Link>
                    ) : (
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)',
                      }}>
                        {label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {(lots as Lot[]).map((lot, i) => {
                const isEditing = editId === lot.id
                const cc = lot.categorie === 'tres_gros'
                  ? { bg: '#ede9fe', color: '#5b21b6' }
                  : lot.categorie === 'gros'
                  ? { bg: '#fef3c7', color: '#92400e' }
                  : { bg: '#f0f7f8', color: '#2c6976' }

                return (
                  <div
                    key={lot.id}
                    style={{
                      display: 'grid', gridTemplateColumns: COLS,
                      gap: '0.75rem', padding: '0.75rem 1.25rem',
                      alignItems: 'center',
                      borderBottom: i < lots.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isEditing
                        ? 'rgba(217,119,6,0.04)'
                        : lot.disponible ? 'white' : 'var(--bg-1)',
                      opacity: lot.disponible ? 1 : 0.65,
                      transition: 'opacity 200ms ease',
                    }}
                  >
                    {/* Nom + code article */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)',
                          textDecoration: lot.disponible ? 'none' : 'line-through',
                        }}>
                          {lot.nom}
                        </span>
                        {lot.mis_en_avant && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>★</span>
                        )}
                      </div>
                      <span style={{
                        display: 'inline-block', marginTop: '0.25rem',
                        fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 600,
                        color: 'var(--text-4)', background: 'var(--bg-2)',
                        padding: '0.1rem 0.375rem', borderRadius: '0.25rem',
                        letterSpacing: '0.05em',
                      }}>
                        {lot.code ?? '—'}
                      </span>
                    </div>

                    {/* Catégorie */}
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 9999,
                      fontSize: '0.6875rem', fontWeight: 700,
                      background: cc.bg, color: cc.color, whiteSpace: 'nowrap',
                    }}>
                      {CATEGORIE_LABELS[lot.categorie as LotCategorie]}
                    </span>

                    {/* Programme */}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {PALIER_LABELS[lot.palier as LotPalier]}
                    </span>

                    {/* Stock — aligné à gauche */}
                    <span style={{
                      display: 'block', textAlign: 'left',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem',
                      color: lot.stock === 0 ? '#dc2626' : 'var(--text-1)',
                    }}>
                      {lot.stock}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {isEditing ? (
                        <Link href={buildUrl({ edit: undefined })} style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                          fontSize: '0.75rem', fontWeight: 600,
                          background: 'var(--bg-2)', color: 'var(--text-3)', textDecoration: 'none',
                        }}>
                          ✕
                        </Link>
                      ) : (
                        <Link href={buildUrl({ edit: lot.id })} style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                          fontSize: '0.75rem', fontWeight: 600,
                          background: 'var(--bg-1)', color: 'var(--text-2)',
                          textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap',
                        }}>
                          Éditer
                        </Link>
                      )}

                      <ToggleLotButton
                        lotId={lot.id}
                        disponible={lot.disponible}
                        lotNom={lot.nom}
                      />
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
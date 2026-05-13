import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Shield, Search } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/Pagination'

const PER_PAGE = 25

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  'member.created':     { label: 'Inscription',       bg: '#dcfce7', color: '#16a34a' },
  'member.updated':     { label: 'Modif. membre',     bg: '#dbeafe', color: '#1d4ed8' },
  'member.activated':   { label: 'Réactivation',      bg: '#dcfce7', color: '#16a34a' },
  'member.deactivated': { label: 'Désactivation',     bg: '#fee2e2', color: '#dc2626' },
  'pin.reset':          { label: 'Reset PIN',          bg: '#fef9c3', color: '#d97706' },
  'lot.created':        { label: 'Lot ajouté',         bg: '#ede9fe', color: '#7c3aed' },
  'lot.updated':        { label: 'Lot modifié',        bg: '#ede9fe', color: '#7c3aed' },
  'lot.disabled':       { label: 'Lot désactivé',      bg: '#fee2e2', color: '#dc2626' },
  'lot.activated':      { label: 'Lot activé',         bg: '#dcfce7', color: '#16a34a' },
  'commande.created':   { label: 'Commande ajoutée',   bg: '#dbeafe', color: '#1d4ed8' },
  'commande.updated':   { label: 'Commande modifiée',  bg: '#dbeafe', color: '#1d4ed8' },
  'commande.deleted':   { label: 'Commande supprimée', bg: '#fee2e2', color: '#dc2626' },
  'team.member_added':  { label: 'Compte créé',        bg: '#dcfce7', color: '#16a34a' },
  'team.member_removed':{ label: 'Compte supprimé',    bg: '#fee2e2', color: '#dc2626' },
}

type SortField = 'created_at' | 'action' | 'user_email'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; action?: string; page?: string; sort?: string; dir?: string
  }>
}) {
  await requireRole(['admin'])
  const params = await searchParams
  const q      = params.q?.trim()      || ''
  const action = params.action?.trim() || 'all'
  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const sort   = (params.sort ?? 'created_at') as SortField
  const dir    = params.dir === 'asc' ? 'asc' : 'desc'

  const supabase = await createClient()

  let req = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (action !== 'all') req = req.eq('action', action)
  if (q) req = req.or(`user_email.ilike.%${q}%,entity_label.ilike.%${q}%`)

  const from = (page - 1) * PER_PAGE
  const { data: logs, count } = await req
    .order(sort, { ascending: dir === 'asc' })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q)                   base.q      = q
    if (action !== 'all')    base.action = action
    if (sort !== 'created_at') base.sort = sort
    if (dir !== 'desc')      base.dir    = dir
    const merged = { ...base, ...overrides }
    const clean = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
    const qs = new URLSearchParams(clean).toString()
    return `/audit${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Shield size={20} style={{ color: 'var(--brand-light)' }} />
          <h1 className="page-title" style={{ margin: 0 }}>Journal d&apos;activité</h1>
        </div>
        <p className="page-subtitle">
          {count ?? 0} action{(count ?? 0) > 1 ? 's' : ''} enregistrée{(count ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <form method="GET" style={{ position: 'relative', maxWidth: 380 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          <input name="q" type="text" className="input" defaultValue={q}
            placeholder="Rechercher par email ou entité…" style={{ paddingLeft: '2.5rem' }} />
          {action !== 'all' && <input type="hidden" name="action" value={action} />}
        </form>

        {/* Tabs actions */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {[
            { value: 'all',             label: 'Toutes'       },
            { value: 'member.created',  label: 'Inscriptions' },
            { value: 'member.updated',  label: 'Membres'      },
            { value: 'pin.reset',       label: 'PIN'          },
            { value: 'commande.created',label: 'Commandes'    },
            { value: 'lot.created',     label: 'Lots'         },
            { value: 'team.member_added', label: 'Équipe'     },
          ].map(({ value, label }) => {
            const active = action === value
            return (
              <Link key={value}
                href={buildUrl({ action: value === 'all' ? undefined : value, page: '1' })}
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
      </div>

      {/* Liste */}
      {!logs || logs.length === 0 ? (
        <div className="empty-state">
          <Shield size={36} />
          <h3>Aucune activité</h3>
          <p>Les actions apparaîtront ici au fur et à mesure.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {logs.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] ?? {
                label: log.action, bg: 'var(--bg-2)', color: 'var(--text-4)',
              }

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.75rem 1.25rem',
                    borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Badge action */}
                  <span style={{
                    display: 'inline-block', flexShrink: 0,
                    padding: '0.2rem 0.5rem', borderRadius: 9999,
                    fontSize: '0.6875rem', fontWeight: 700,
                    background: cfg.bg, color: cfg.color,
                    whiteSpace: 'nowrap' as const,
                    minWidth: 110, textAlign: 'center' as const,
                  }}>
                    {cfg.label}
                  </span>

                  {/* Entité */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.entity_label || '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      par {log.user_email ?? 'inconnu'}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short',
                    })}
                    <br />
                    {new Date(log.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              )
            })}
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
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Shield, Search } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import AuditRow from '@/components/AuditRow'

const PER_PAGE = 10

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; action?: string; page?: string
  }>
}) {
  await requireRole(['admin'])
  const params = await searchParams
  const q      = params.q?.trim()      || ''
  const action = params.action?.trim() || 'all'
  const page   = Math.max(1, parseInt(params.page ?? '1'))

  const supabase = await createClient()

  let req = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  // Filtre : valeur exacte si contient '.', sinon préfixe (ex: 'tirage' → 'tirage.%')
  if (action !== 'all') {
    if (action.includes('.')) {
      req = req.eq('action', action)
    } else {
      req = req.ilike('action', `${action}.%`)
    }
  }
  if (q) req = req.or(`user_email.ilike.%${q}%,entity_label.ilike.%${q}%`)

  const from = (page - 1) * PER_PAGE
  const { data: logs, count } = await req
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q)                base.q      = q
    if (action !== 'all') base.action = action
    const merged = { ...base, ...overrides }
    const clean  = Object.fromEntries(
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
          <Search size={15} style={{
            position: 'absolute', left: '0.875rem', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
          }} />
          <input
            name="q" type="text" className="input" defaultValue={q}
            placeholder="Rechercher par email ou entité…"
            style={{ paddingLeft: '2.5rem' }}
          />
          {action !== 'all' && <input type="hidden" name="action" value={action} />}
        </form>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {[
            { value: 'all',               label: 'Toutes'        },
            { value: 'member.created',    label: 'Inscriptions'  },
            { value: 'member',            label: 'Membres'       },
            { value: 'member.deactivated',label: 'Désactivations'},
            { value: 'pin.reset',         label: 'PIN'           },
            { value: 'commande',          label: 'Commandes'     },
            { value: 'lot',               label: 'Lots'          },
            { value: 'tirage',            label: 'Tirages'       },
            { value: 'team.member_added', label: 'Équipe'        },
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
                  transition: 'all 150ms ease',
                  fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                }}
              >
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
            {logs.map((log, i) => (
              <AuditRow
                key={log.id}
                log={log as any}
                isLast={i === logs.length - 1}
              />
            ))}
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
import { createClient } from '@/lib/supabase/server'
import { Users, Search } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'
import Link from 'next/link'

export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string; q?: string }>
}) {
  const { etape: etapeFilter, q: query } = await searchParams
  const supabase = await createClient()

  let req = supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })

  if (etapeFilter && etapeFilter !== 'all') {
    req = req.eq('etape', etapeFilter)
  }
  if (query) {
    req = req.or(
      `prenom.ilike.%${query}%,nom.ilike.%${query}%,email.ilike.%${query}%`
    )
  }

  const { data: members, count } = await req
  const { count: total } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  return (
    <div>
      {/* En-tête */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1 className="page-title">Membres</h1>
          <p className="page-subtitle">
            {total ?? 0} inscrit{(total ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href="/inscription"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
            background: 'var(--brand)', color: 'white',
            fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
            fontFamily: 'var(--font-body)',
          }}
        >
          + Inscrire
        </Link>
      </div>

      {/* Filtres */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Recherche */}
        <form method="GET" style={{ position: 'relative', maxWidth: 380 }}>
          <Search
            size={15}
            style={{
              position: 'absolute', left: '0.875rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-4)',
              pointerEvents: 'none',
            }}
          />
          <input
            name="q"
            type="text"
            className="input"
            defaultValue={query ?? ''}
            placeholder="Rechercher par nom ou email…"
            style={{ paddingLeft: '2.5rem' }}
          />
          {etapeFilter && (
            <input type="hidden" name="etape" value={etapeFilter} />
          )}
        </form>

        {/* Tabs étapes */}
        <div style={{
          display: 'flex',
          gap: '0.375rem',
          flexWrap: 'wrap',
        }}>
          {[
            { value: 'all', label: 'Toutes' },
            ...Object.entries(ETAPE_LABELS).map(([v, l]) => ({ value: v, label: l.split('(')[0].trim() })),
          ].map(({ value, label }) => {
            const active = (etapeFilter ?? 'all') === value
            return (
              <Link
                key={value}
                href={value === 'all' ? '/membres' : `/membres?etape=${value}`}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: 9999,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: active ? 'var(--brand)' : 'white',
                  color: active ? 'white' : 'var(--text-3)',
                  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  transition: 'all 150ms ease',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}
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
          <p>
            {query ? 'Aucun résultat pour cette recherche.' : 'Les inscriptions apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 120px 160px',
            gap: '1rem',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-1)',
          }}>
            {['Membre', 'Contact', 'Étape', 'Inscrit le'].map(h => (
              <div key={h} style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-4)',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {members.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px 160px',
                gap: '1rem',
                padding: '0.875rem 1.5rem',
                alignItems: 'center',
                borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 150ms ease',
              }}
            >
              {/* Nom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bg-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700, fontSize: '0.8125rem',
                  color: 'var(--brand)', flexShrink: 0,
                }}>
                  {m.prenom.charAt(0).toUpperCase()}{(m.nom ?? '').charAt(0).toUpperCase()}
                </div>
                <span style={{
                  fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)',
                }}>
                  {m.prenom} {m.nom ?? ''}
                </span>
              </div>

              {/* Contact */}
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '0.125rem' }}>
                  {m.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                  {m.whatsapp}
                </div>
              </div>

              {/* Étape */}
              <div style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--brand-light)',
                background: 'rgba(51,128,141,0.08)',
                padding: '0.25rem 0.5rem',
                borderRadius: 6,
                display: 'inline-block',
              }}>
                {ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape}
              </div>

              {/* Date */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                {new Date(m.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
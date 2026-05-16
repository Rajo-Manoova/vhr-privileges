import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TirageDetail from '@/components/TirageDetail'
import Link from 'next/link'
import { ChevronLeft, Presentation } from 'lucide-react'

export default async function TirageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { role } = await requireRole(['admin', 'animateur'])
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('tirage_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const { data: sessionLots } = await supabase
    .from('session_lots')
    .select('*, lots(*)')
    .eq('session_id', id)
    .order('ordre')

  const { data: existingWins } = await supabase
    .from('tirage_wins')
    .select('*, members(id, prenom, nom, email)')
    .eq('session_id', id)

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('actif', true)
    .order('created_at', { ascending: false })

  const { data: commandes } = await supabase
    .from('commandes')
    .select('id, member_id, statut')
    .eq('statut', 'active')

  // Lots disponibles — en tenant compte du stock réservé dans TOUS les tirages
  const { data: allCatalogueLots } = await supabase
    .from('lots')
    .select('*')
    .eq('disponible', true)
    .gt('stock', 0)
    .order('categorie')

  // Compter combien de fois chaque lot est utilisé dans d'autres sessions
  const { data: allSessionLots } = await supabase
    .from('session_lots')
    .select('lot_id')

  // Pour chaque lot, compter le nombre de fois qu'il est alloué (toutes sessions)
  const usageCount: Record<string, number> = {}
  for (const sl of allSessionLots ?? []) {
    usageCount[sl.lot_id] = (usageCount[sl.lot_id] ?? 0) + 1
  }

  // Un lot est disponible si stock > nombre d'allocations totales
  // OU s'il est déjà dans cette session (on ne le propose pas en doublon)
  const currentSessionLotIds = new Set((sessionLots ?? []).map(sl => sl.lot_id))
  const catalogueLots = (allCatalogueLots ?? []).filter(lot => {
    if (currentSessionLotIds.has(lot.id)) return false // déjà dans cette session
    const used = usageCount[lot.id] ?? 0
    return lot.stock > used // stock restant disponible
  })

  const { data: typeConfig } = await supabase
    .from('tirage_type_configs')
    .select('*')
    .eq('type', session.type)
    .maybeSingle()

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/tirages"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--text-3)', textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
        >
          <ChevronLeft size={15} />
          Tous les tirages
        </Link>
        <Link
          href={`/showcase/${id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '0.625rem',
            background: 'var(--bg-2)', border: '1.5px solid var(--border)',
            color: 'var(--text-2)', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 600,
            transition: 'all 150ms ease',
          }}
        >
          <Presentation size={15} />
          Showcase
        </Link>
      </div>

      <TirageDetail
        readonly={role === 'animateur'}
        session={{
          id:                   session.id,
          type:                 session.type,
          label:                session.label,
          status:               session.status,
          eligibilite_override:    session.eligibilite_override ?? false,
          tickets_actifs:          session.tickets_actifs ?? true,
          max_wins_per_member:     session.max_wins_per_member ?? 0,
        }}
        sessionId={id}
        initialSessionLots={(sessionLots ?? []).map(sl => ({
          id:     sl.id,
          lot_id: sl.lot_id,
          ordre:  sl.ordre,
          status: sl.status,
          lot:    sl.lots as any,
        }))}
        initialWins={(existingWins ?? []).map((w: any) => ({
          memberId:     w.members?.id ?? '',
          memberName:   `${w.members?.prenom ?? ''} ${w.members?.nom ?? ''}`.trim(),
          lotNom:       '',
          sessionLotId: w.session_lot_id,
        }))}
        members={members ?? []}
        commandes={commandes ?? []}
        catalogueLots={catalogueLots as any[]}
        typeConfig={typeConfig ?? null}
      />
    </div>
  )
}
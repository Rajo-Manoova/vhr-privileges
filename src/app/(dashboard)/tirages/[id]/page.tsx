import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TirageDetail from '@/components/TirageDetail'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function TirageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['admin'])
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

  // Lots disponibles depuis le catalogue (stock > 0, disponible)
  const { data: catalogueLots } = await supabase
    .from('lots')
    .select('*')
    .eq('disponible', true)
    .gt('stock', 0)
    .order('categorie')

  // Config du type de tirage (template)
  const { data: typeConfig } = await supabase
    .from('tirage_type_configs')
    .select('*')
    .eq('type', session.type)
    .maybeSingle()

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
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
      </div>

      <TirageDetail
        session={session}
        sessionId={id}
        initialSessionLots={(sessionLots ?? []).map(sl => ({
          id: sl.id,
          lot_id: sl.lot_id,
          ordre: sl.ordre,
          status: sl.status,
          lot: sl.lots as any,
        }))}
        initialWins={(existingWins ?? []).map((w: any) => ({
          memberId: w.members?.id ?? '',
          memberName: `${w.members?.prenom ?? ''} ${w.members?.nom ?? ''}`.trim(),
          lotNom: '',
          sessionLotId: w.session_lot_id,
        }))}
        members={members ?? []}
        commandes={commandes ?? []}
        catalogueLots={(catalogueLots ?? []) as any[]}
        typeConfig={typeConfig ?? null}
      />
    </div>
  )
}
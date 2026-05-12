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
  const { id } = await params
  const supabase = await createClient()

  // Charger la session
  const { data: session } = await supabase
    .from('tirage_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  // Charger les session_lots avec les lots
  const { data: sessionLots } = await supabase
    .from('session_lots')
    .select('*, lots(*)')
    .eq('session_id', id)
    .order('ordre')

  // Charger les gagnants existants (pour reprendre une session)
  const { data: existingWins } = await supabase
    .from('tirage_wins')
    .select('*, members(id, prenom, nom, email)')
    .eq('session_id', id)

  // Charger les membres
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })

  // Charger les commandes actives (pour types non-soirée)
  const { data: commandes } = await supabase
    .from('commandes')
    .select('id, member_id, statut')
    .eq('statut', 'active')

  return (
    <div>
      {/* Retour */}
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
        initialWins={(existingWins ?? []).map(w => ({
          memberId: w.members?.id ?? '',
          memberName: `${w.members?.prenom ?? ''} ${w.members?.nom ?? ''}`.trim(),
          lotNom: '',
          sessionLotId: w.session_lot_id,
        }))}
        members={members ?? []}
        commandes={commandes ?? []}
      />
    </div>
  )
}
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TiragesList from './_list'

export default async function TiragesPage() {
  const { role } = await requireRole(['admin', 'animateur'])

  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('tirage_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  const withCounts = await Promise.all(
    (sessions ?? []).map(async (s) => {
      const { count } = await supabase
        .from('tirage_wins')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id)
      return { ...s, wins_count: count ?? 0 }
    })
  )

  const isAnimateur = role === 'animateur'
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tirages au sort</h1>
        <p className="page-subtitle">
          {isAnimateur ? 'Sessions de tirage disponibles.' : 'Créez et gérez toutes les sessions de tirage.'}
        </p>
      </div>
      <TiragesList initialSessions={withCounts} readonly={isAnimateur} />
    </div>
  )
}
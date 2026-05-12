import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('tirage_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (!sessions) return NextResponse.json([])

  // Ajouter le count des gagnants
  const withCounts = await Promise.all(
    sessions.map(async (s) => {
      const { count } = await supabase
        .from('tirage_wins')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id)
      return { ...s, wins_count: count ?? 0 }
    })
  )

  return NextResponse.json(withCounts)
}
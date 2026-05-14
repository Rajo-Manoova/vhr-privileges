import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ShowcaseClient from './showcase-client'
import type { LotCategorie } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Public — no auth check
  const { data: session } = await supabase
    .from('tirage_sessions')
    .select('id, label, type, status')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const { data: sessionLots } = await supabase
    .from('session_lots')
    .select('id, ordre, lot:lots(id, nom, categorie, valeur_ar, photo_url)')
    .eq('session_id', id)
    .order('ordre')

  const { count: membresCount } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('actif', true)

  const lots = (sessionLots ?? []).map(sl => ({
    id:        sl.id,
    ordre:     sl.ordre,
    nom:       (sl.lot as any)?.nom ?? '',
    categorie: (sl.lot as any)?.categorie as LotCategorie | null,
    valeur_ar: (sl.lot as any)?.valeur_ar as number | null,
    photo_url: (sl.lot as any)?.photo_url as string | null,
  }))

  const totalValue = lots.reduce((s, l) => s + (l.valeur_ar ?? 0), 0)
  const nbMembres  = membresCount ?? 0

  return (
    <ShowcaseClient
      sessionId={id}
      sessionLabel={session.label ?? 'Soirée VHR Privilèges'}
      lots={lots}
      totalValue={totalValue}
      nbMembres={nbMembres}
    />
  )
}
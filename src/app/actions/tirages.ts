'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TirageType, LotPalier } from '@/types'

const PALIER_FOR_TYPE: Partial<Record<TirageType, LotPalier>> = {
  soiree_16mai:  'soiree',
  tirage_27mai:  'tirage_27mai',
  mensuel:       'argent',
  trimestriel:   'or',
  semestriel:    'vip',
}

export async function createTirageSession(type: TirageType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const palier = PALIER_FOR_TYPE[type]

  // Charger les lots disponibles
  let lotsQuery = supabase.from('lots').select('id').eq('disponible', true).order('created_at')
  if (palier) lotsQuery = lotsQuery.eq('palier', palier)
  const { data: lots } = await lotsQuery

  if (!lots || lots.length === 0)
    return { error: 'Aucun lot disponible pour ce type de tirage. Vérifiez le catalogue.' }

  // Créer la session
  const { data: session, error: se } = await supabase
    .from('tirage_sessions')
    .insert({ type, status: 'pending', created_by: user.id })
    .select('id').single()

  if (se || !session) return { error: se?.message ?? 'Erreur création session' }

  // Créer les session_lots ordonnés
  const { error: sle } = await supabase.from('session_lots').insert(
    lots.map((lot, i) => ({
      session_id: session.id,
      lot_id: lot.id,
      ordre: i + 1,
      status: 'pending',
    }))
  )

  if (sle) {
    await supabase.from('tirage_sessions').delete().eq('id', session.id)
    return { error: sle.message }
  }

  revalidatePath('/tirages')
  redirect(`/tirages/${session.id}`)
}

export async function deleteTirageSession(id: string) {
  const supabase = await createClient()
  await supabase.from('tirage_wins').delete().eq('session_id', id)
  await supabase.from('session_lots').delete().eq('session_id', id)
  const { error } = await supabase.from('tirage_sessions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tirages')
  return { success: true }
}
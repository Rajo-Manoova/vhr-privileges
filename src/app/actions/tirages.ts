'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTirageSession(
  type: string,
  label: string,
  scheduledAt?: string | null,
  ticketsActifs: boolean = true,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  if (!label?.trim()) return { error: 'Le nom du tirage est requis.' }

  const { data: session, error } = await supabase
    .from('tirage_sessions')
    .insert({
      type,
      label:                label.trim(),
      status:               'pending',
      created_by:           user.id,
      scheduled_at:         scheduledAt || null,
      eligibilite_override: false,
      tickets_actifs:       ticketsActifs,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  redirect(`/tirages/${session.id}`)
}

export async function updateTirageOverride(sessionId: string, override: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tirage_sessions')
    .update({ eligibilite_override: override })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function updateTirageTickets(sessionId: string, ticketsActifs: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tirage_sessions')
    .update({ tickets_actifs: ticketsActifs })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function deleteTirageSession(sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tirage_sessions')
    .delete()
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath('/tirages')
  return { success: true }
}

export async function addSessionLot(sessionId: string, lotId: string) {
  const supabase = await createClient()

  const { data: last } = await supabase
    .from('session_lots')
    .select('ordre')
    .eq('session_id', sessionId)
    .order('ordre', { ascending: false })
    .limit(1)
    .single()

  const nextOrdre = (last?.ordre ?? 0) + 1

  const { data, error } = await supabase
    .from('session_lots')
    .insert({ session_id: sessionId, lot_id: lotId, ordre: nextOrdre, status: 'pending' })
    .select('*, lots(*)')
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function removeSessionLot(sessionLotId: string, sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('session_lots')
    .delete()
    .eq('id', sessionLotId)
  if (error) return { error: error.message }
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function reorderSessionLots(
  sessionId: string,
  orderedIds: string[]
) {
  const supabase = await createClient()
  const updates = orderedIds.map((id, i) =>
    supabase.from('session_lots').update({ ordre: i + 1 }).eq('id', id)
  )
  await Promise.all(updates)
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}
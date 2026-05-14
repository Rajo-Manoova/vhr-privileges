'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAction } from '@/lib/audit'

export async function createTirageSession(
  type: string,
  label: string,
  scheduledAt?: string | null,
  ticketsActifs: boolean = true,
  maxWinsPerMember: number = 0,
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
      eligibilite_override:    false,
      tickets_actifs:          ticketsActifs,
      max_wins_per_member:     maxWinsPerMember,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logAction(
    'tirage.created', 'tirage', label.trim(),
    { data: { type, scheduled_at: scheduledAt, tickets_actifs: ticketsActifs, max_wins_per_member: maxWinsPerMember } },
    session.id
  )

  redirect(`/tirages/${session.id}`)
}

export async function updateTirageOverride(sessionId: string, override: boolean) {
  const supabase = await createClient()
  const { data: s } = await supabase.from('tirage_sessions').select('label').eq('id', sessionId).single()
  const { error } = await supabase
    .from('tirage_sessions')
    .update({ eligibilite_override: override })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  await logAction('tirage.override_updated', 'tirage', s?.label ?? sessionId, { data: { eligibilite_override: override } }, sessionId)
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function updateTirageTickets(sessionId: string, ticketsActifs: boolean) {
  const supabase = await createClient()
  const { data: s } = await supabase.from('tirage_sessions').select('label').eq('id', sessionId).single()
  const { error } = await supabase
    .from('tirage_sessions')
    .update({ tickets_actifs: ticketsActifs })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  await logAction('tirage.tickets_updated', 'tirage', s?.label ?? sessionId, { data: { tickets_actifs: ticketsActifs } }, sessionId)
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function deleteTirageSession(sessionId: string) {
  const supabase = await createClient()
  const { data: s } = await supabase.from('tirage_sessions').select('label, type').eq('id', sessionId).single()
  const { error } = await supabase
    .from('tirage_sessions')
    .delete()
    .eq('id', sessionId)
  if (error) return { error: error.message }
  await logAction('tirage.deleted', 'tirage', s?.label ?? sessionId, {}, sessionId)
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
  const lotNom = (data as any)?.lots?.nom ?? lotId
  await logAction('tirage.lot_added', 'tirage', lotNom, { data: { session_id: sessionId } }, sessionId)
  return { data }
}

export async function removeSessionLot(sessionLotId: string, sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('session_lots')
    .delete()
    .eq('id', sessionLotId)
  if (error) return { error: error.message }
  await logAction('tirage.lot_removed', 'tirage', sessionId, { data: { session_lot_id: sessionLotId } }, sessionId)
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
  const { data: s } = await supabase.from('tirage_sessions').select('label').eq('id', sessionId).single()
  await logAction('tirage.lots_reordered', 'tirage', s?.label ?? sessionId, { data: { count: orderedIds.length } }, sessionId)
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}

export async function updateTirageMaxWins(sessionId: string, maxWins: number) {
  const supabase = await createClient()
  const { data: s } = await supabase.from('tirage_sessions').select('label').eq('id', sessionId).single()
  const { error } = await supabase
    .from('tirage_sessions')
    .update({ max_wins_per_member: maxWins })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  await logAction('tirage.maxwins_updated', 'tirage', s?.label ?? sessionId, { data: { max_wins_per_member: maxWins } }, sessionId)
  revalidatePath(`/tirages/${sessionId}`)
  return { success: true }
}
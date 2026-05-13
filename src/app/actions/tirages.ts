'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTirageSession(
  type: string,
  label: string,
  scheduledAt?: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  if (!label?.trim()) return { error: 'Le nom du tirage est requis.' }

  const { data: session, error } = await supabase
    .from('tirage_sessions')
    .insert({
      type,
      label:        label.trim(),
      status:       'pending',
      created_by:   user.id,
      scheduled_at: scheduledAt || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  redirect(`/tirages/${session.id}`)
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

  // Récupérer l'ordre max actuel
  const { data: last } = await supabase
    .from('session_lots')
    .select('ordre')
    .eq('session_id', sessionId)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrdre = (last?.ordre ?? 0) + 1

  const { data, error } = await supabase
    .from('session_lots')
    .insert({ session_id: sessionId, lot_id: lotId, ordre: nextOrdre, status: 'pending' })
    .select('*, lots(*)')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/tirages/${sessionId}`)
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
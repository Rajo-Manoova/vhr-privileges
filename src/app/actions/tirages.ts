'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTirageSession(
  type: string,
  scheduledAt?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: session, error } = await supabase
    .from('tirage_sessions')
    .insert({
      type,
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
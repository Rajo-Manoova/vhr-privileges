'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Etape } from '@/types'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function updateMember(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const supabase  = await createClient()
  const id        = formData.get('id') as string
  const prenom    = (formData.get('prenom') as string)?.trim()
  const nom       = (formData.get('nom') as string)?.trim() || null
  const email     = (formData.get('email') as string)?.trim().toLowerCase()
  const whatsapp  = (formData.get('whatsapp') as string)?.trim()
  const etape     = formData.get('etape') as Etape

  if (!id || !prenom || !email || !whatsapp || !etape)
    return { error: 'Tous les champs obligatoires sont requis.' }

  const { error } = await supabase
    .from('members').update({ prenom, nom, email, whatsapp, etape }).eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'Cet email est déjà utilisé.' }
    return { error: error.message }
  }

  revalidatePath('/membres')
  redirect('/membres')
}

export async function resetMemberPin(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const tempPin = String(Math.floor(1000 + Math.random() * 9000))

  const { error } = await supabase
    .from('members')
    .update({ pin_temp: tempPin })
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/membres')
  return { tempPin }
}
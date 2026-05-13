'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAction } from '@/lib/audit'
import type { Etape } from '@/types'

export async function updateMember(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const id       = formData.get('id') as string
  const prenom   = (formData.get('prenom') as string)?.trim()
  const nom      = (formData.get('nom') as string)?.trim() || null
  const email    = (formData.get('email') as string)?.trim().toLowerCase()
  const whatsapp = (formData.get('whatsapp') as string)?.trim()
  const etape    = formData.get('etape') as Etape
  const notes    = (formData.get('notes') as string)?.trim() || null

  if (!id || !prenom || !email || !whatsapp || !etape)
    return { error: 'Tous les champs obligatoires sont requis.' }

  // Récupérer les valeurs actuelles avant modification
  const { data: current } = await supabase
    .from('members')
    .select('prenom, nom, email, whatsapp, etape, notes')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('members')
    .update({ prenom, nom, email, whatsapp, etape, notes })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'Cet email est déjà utilisé.' }
    return { error: error.message }
  }

  await logAction(
    'member.updated', 'member',
    `${prenom} ${nom ?? ''}`.trim(),
    {
      before: current ?? {},
      after:  { prenom, nom, email, whatsapp, etape, notes },
    },
    id
  )

  revalidatePath('/membres')
  redirect('/membres')
}

export async function resetMemberPin(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const tempPin = String(Math.floor(1000 + Math.random() * 9000))

  const { error } = await supabase
    .from('members').update({ pin_temp: tempPin }).eq('id', memberId)

  if (error) return { error: error.message }

  const { data: m } = await supabase
    .from('members').select('prenom, nom').eq('id', memberId).single()

  await logAction(
    'pin.reset', 'member',
    m ? `${m.prenom} ${m.nom ?? ''}`.trim() : memberId,
    { data: { action: 'PIN temporaire généré' } },
    memberId
  )

  revalidatePath('/membres')
  return { tempPin }
}

export async function toggleMemberActif(memberId: string, actif: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('members').update({ actif }).eq('id', memberId)

  if (error) return { error: error.message }

  const { data: m } = await supabase
    .from('members').select('prenom, nom').eq('id', memberId).single()

  await logAction(
    actif ? 'member.activated' : 'member.deactivated',
    'member',
    m ? `${m.prenom} ${m.nom ?? ''}`.trim() : memberId,
    {
      before: { actif: !actif },
      after:  { actif },
    },
    memberId
  )

  revalidatePath('/membres')
  return { success: true }
}

export async function logMemberCreated(
  memberId: string,
  memberLabel: string,
  etape: string
) {
  await logAction(
    'member.created', 'member', memberLabel,
    { data: { etape } },
    memberId
  )
}
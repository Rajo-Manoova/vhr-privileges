'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAction } from '@/lib/audit'

export async function addCommande(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const memberId = formData.get('member_id') as string
  const montant  = parseInt(formData.get('montant_ar') as string)
  const date     = formData.get('commande_date') as string
  const statut   = (formData.get('statut') as string) || 'active'

  if (!memberId || !montant || !date) return { error: 'Tous les champs sont requis.' }
  if (isNaN(montant) || montant <= 0)  return { error: 'Le montant doit être supérieur à 0.' }

  const { error } = await supabase.from('commandes').insert({
    member_id: memberId, montant_ar: montant,
    commande_date: date, statut, created_by: user.id,
  })

  if (error) return { error: error.message }

  const { data: m } = await supabase
    .from('members').select('prenom, nom').eq('id', memberId).single()

  await logAction(
    'commande.created', 'commande',
    m ? `${m.prenom} ${m.nom ?? ''}`.trim() : memberId,
    { data: { montant_ar: montant, commande_date: date, statut } },
    memberId
  )

  revalidatePath('/commandes')
  return { success: true }
}

export async function updateCommande(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const id      = formData.get('id') as string
  const montant = parseInt(formData.get('montant_ar') as string)
  const date    = formData.get('commande_date') as string
  const statut  = formData.get('statut') as string

  if (!id || !montant || !date || !statut) return { error: 'Tous les champs sont requis.' }
  if (isNaN(montant) || montant <= 0)      return { error: 'Montant invalide.' }

  // Récupérer les valeurs actuelles + nom du membre
  const { data: current } = await supabase
    .from('commandes')
    .select('montant_ar, commande_date, statut, members(prenom, nom)')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('commandes')
    .update({ montant_ar: montant, commande_date: date, statut })
    .eq('id', id)

  if (error) return { error: error.message }

  const memberName = (current?.members as any)
    ? `${(current?.members as any).prenom} ${(current?.members as any).nom ?? ''}`.trim()
    : id

  await logAction(
    'commande.updated', 'commande', memberName,
    {
      before: {
        montant_ar:    current?.montant_ar    ?? null,
        commande_date: current?.commande_date ?? null,
        statut:        current?.statut        ?? null,
      },
      after: { montant_ar: montant, commande_date: date, statut },
    },
    id
  )

  revalidatePath('/commandes')
  redirect('/commandes')
}

export async function removeCommande(commandeId: string) {
  const supabase = await createClient()

  // Récupérer les infos avant suppression
  const { data: current } = await supabase
    .from('commandes')
    .select('montant_ar, commande_date, statut, members(prenom, nom)')
    .eq('id', commandeId)
    .single()

  const { error } = await supabase.from('commandes').delete().eq('id', commandeId)
  if (error) return { error: error.message }

  const memberName = (current?.members as any)
    ? `${(current?.members as any).prenom} ${(current?.members as any).nom ?? ''}`.trim()
    : commandeId

  await logAction(
    'commande.deleted', 'commande', memberName,
    {
      data: {
        montant_ar:    current?.montant_ar    ?? null,
        commande_date: current?.commande_date ?? null,
        statut:        current?.statut        ?? null,
      },
    },
    commandeId
  )

  revalidatePath('/commandes')
  return { success: true }
}
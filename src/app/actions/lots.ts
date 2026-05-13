'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAction } from '@/lib/audit'

export async function addLot(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nom         = (formData.get('nom') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const categorie   = formData.get('categorie') as string
  const palier      = formData.get('palier') as string
  const stock       = parseInt(formData.get('stock') as string) || 1
  const valeur      = formData.get('valeur_ar') ? parseInt(formData.get('valeur_ar') as string) : null

  if (!nom || !categorie || !palier)
    return { error: 'Nom, catégorie et palier sont requis.' }

  const { error } = await supabase.from('lots').insert({
    nom, description, categorie, palier, stock,
    valeur_ar: valeur, disponible: true, mis_en_avant: false,
  })

  if (error) return { error: error.message }

  await logAction(
    'lot.created', 'lot', nom,
    { data: { categorie, palier, stock, valeur_ar: valeur } }
  )

  revalidatePath('/catalogue')
  return { success: true }
}

export async function updateLot(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const supabase    = await createClient()
  const id          = formData.get('id') as string
  const nom         = (formData.get('nom') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const categorie   = formData.get('categorie') as string
  const palier      = formData.get('palier') as string
  const stock       = parseInt(formData.get('stock') as string) || 0
  const valeur      = formData.get('valeur_ar') ? parseInt(formData.get('valeur_ar') as string) : null

  if (!id || !nom || !categorie || !palier)
    return { error: 'Champs obligatoires manquants.' }

  // Récupérer les valeurs actuelles avant modification
  const { data: current } = await supabase
    .from('lots')
    .select('nom, categorie, palier, stock, valeur_ar')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('lots')
    .update({ nom, description, categorie, palier, stock, valeur_ar: valeur })
    .eq('id', id)

  if (error) return { error: error.message }

  await logAction(
    'lot.updated', 'lot', nom,
    {
      before: {
        nom:       current?.nom,
        categorie: current?.categorie,
        palier:    current?.palier,
        stock:     current?.stock,
        valeur_ar: current?.valeur_ar,
      },
      after: { nom, categorie, palier, stock, valeur_ar: valeur },
    },
    id
  )

  revalidatePath('/catalogue')
  redirect('/catalogue')
}

export async function deleteLot(id: string) {
  const supabase = await createClient()

  const { data: lot } = await supabase
    .from('lots').select('nom, categorie, palier, stock').eq('id', id).single()

  const { error } = await supabase.from('lots').delete().eq('id', id)
  if (error) return { error: error.message }

  await logAction(
    'lot.deleted', 'lot', lot?.nom ?? id,
    { data: { categorie: lot?.categorie, palier: lot?.palier, stock: lot?.stock } },
    id
  )

  revalidatePath('/catalogue')
  return { success: true }
}

export async function toggleLotField(
  id: string,
  field: 'disponible' | 'mis_en_avant',
  value: boolean
) {
  const supabase = await createClient()

  const { data: lot } = await supabase
    .from('lots').select('nom').eq('id', id).single()

  const { error } = await supabase.from('lots').update({ [field]: value }).eq('id', id)
  if (error) return { error: error.message }

  const actionName = field === 'disponible'
    ? (value ? 'lot.activated' : 'lot.disabled')
    : 'lot.featured'

  await logAction(
    actionName, 'lot', lot?.nom ?? id,
    {
      before: { [field]: !value },
      after:  { [field]: value },
    },
    id
  )

  revalidatePath('/catalogue')
  return { success: true }
}
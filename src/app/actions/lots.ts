'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addLot(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nom         = formData.get('nom') as string
  const description = formData.get('description') as string
  const categorie   = formData.get('categorie') as string
  const palier      = formData.get('palier') as string
  const stock       = parseInt(formData.get('stock') as string) || 1
  const valeur      = formData.get('valeur_ar') ? parseInt(formData.get('valeur_ar') as string) : null

  if (!nom || !categorie || !palier) return { error: 'Nom, catégorie et palier sont requis.' }

  const { error } = await supabase.from('lots').insert({
    nom: nom.trim(), description: description?.trim() || null,
    categorie, palier, stock, valeur_ar: valeur,
    disponible: true, mis_en_avant: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/catalogue')
  return { success: true }
}

export async function updateLot(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const id          = formData.get('id') as string
  const nom         = (formData.get('nom') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const categorie   = formData.get('categorie') as string
  const palier      = formData.get('palier') as string
  const stock       = parseInt(formData.get('stock') as string) || 0
  const valeur      = formData.get('valeur_ar') ? parseInt(formData.get('valeur_ar') as string) : null

  if (!id || !nom || !categorie || !palier) return { error: 'Champs obligatoires manquants.' }

  const { error } = await supabase.from('lots')
    .update({ nom, description, categorie, palier, stock, valeur_ar: valeur })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/catalogue')
  redirect('/catalogue')
}

export async function deleteLot(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lots').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/catalogue')
  return { success: true }
}

export async function toggleLotField(id: string, field: 'disponible' | 'mis_en_avant', value: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('lots').update({ [field]: value }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/catalogue')
  return { success: true }
}
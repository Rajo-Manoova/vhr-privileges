'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LotCategorie } from '@/types'

export async function saveTirageTypeConfig(
  type: string,
  lotRules: Array<{ categorie: LotCategorie; qty: number }>,
  budgetMaxAr: number | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Upsert sur le type
  const { error } = await supabase
    .from('tirage_type_configs')
    .upsert(
      {
        type,
        label:        type,   // le label DB, pas utilisé en affichage (on utilise TIRAGE_TYPE_LABELS)
        lot_rules:    lotRules,
        budget_max_ar: budgetMaxAr,
      },
      { onConflict: 'type' }
    )

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
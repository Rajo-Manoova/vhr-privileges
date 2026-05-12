'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTierReward(
  memberId: string,
  palier: 'argent' | 'or' | 'vip',
  lotNom: string,
  lotId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('tier_rewards').insert({
    member_id: memberId,
    palier,
    lot_nom: lotNom.trim(),
    lot_id: lotId || null,
    statut: 'claimed',
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/recompenses')
  return { success: true }
}

export async function markTierRewardDelivered(rewardId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tier_rewards')
    .update({ statut: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', rewardId)

  if (error) return { error: error.message }

  revalidatePath('/recompenses')
  return { success: true }
}
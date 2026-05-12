'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { computePalier } from '@/lib/auth'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getMemberPortal(email: string) {
  const admin = getAdmin()

  const { data: member } = await admin
    .from('members')
    .select('id, prenom, nom, email, etape, created_at')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!member) return null

  const { data: commandes } = await admin
    .from('commandes')
    .select('montant_ar, commande_date, statut')
    .eq('member_id', member.id)
    .order('commande_date', { ascending: false })

  const { data: wins } = await admin
    .from('tirage_wins')
    .select('confirmed_at, session_lots(lots(nom, categorie))')
    .eq('member_id', member.id)
    .order('confirmed_at', { ascending: false })

  const { data: tierRewards } = await admin
    .from('tier_rewards')
    .select('palier, lot_nom, statut, claimed_at')
    .eq('member_id', member.id)
    .order('claimed_at', { ascending: false })

  const activeCommandes = commandes?.filter(c => c.statut === 'active') ?? []
  const cumul = activeCommandes.reduce((sum, c) => sum + c.montant_ar, 0)
  const palier = computePalier(cumul)

  return {
    member,
    cumul,
    palier,
    nbCommandes: activeCommandes.length,
    wins: wins ?? [],
    tierRewards: tierRewards ?? [],
  }
}
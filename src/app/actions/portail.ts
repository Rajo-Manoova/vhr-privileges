'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { computePalier } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type PortalState =
  | { state: 'not_found' }
  | { state: 'no_pin';        member: { id: string; prenom: string; nom: string | null; email: string } }
  | { state: 'pin_required' }
  | { state: 'wrong_pin' }
  | { state: 'temp_pin_used'; member: { id: string; prenom: string; nom: string | null; email: string } }
  | {
      state: 'authenticated'
      member: { id: string; prenom: string; nom: string | null; email: string; etape: string }
      cumul: number
      palier: string
      nbCommandes: number
      wins: any[]
      tierRewards: any[]
    }

export async function getMemberPortal(email: string, pin?: string): Promise<PortalState> {
  const admin = getAdmin()

  const { data: member } = await admin
    .from('members')
    .select('id, prenom, nom, email, etape, pin, pin_temp')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!member) return { state: 'not_found' }

  // Aucun PIN défini → le membre doit en créer un
  if (!member.pin && !member.pin_temp) {
    return { state: 'no_pin', member: { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email } }
  }

  // Pas de PIN fourni → demander le PIN
  if (!pin) {
    return { state: 'pin_required' }
  }

  // PIN temporaire (reset admin) → forcer le changement
  if (member.pin_temp && pin === member.pin_temp) {
    return { state: 'temp_pin_used', member: { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email } }
  }

  // Vérification PIN normal
  if (!member.pin || pin !== member.pin) {
    return { state: 'wrong_pin' }
  }

  // Authentifié → charger les données complètes
  const [{ data: commandes }, { data: wins }, { data: tierRewards }] = await Promise.all([
    admin.from('commandes').select('montant_ar, statut').eq('member_id', member.id),
    admin.from('tirage_wins').select('confirmed_at, session_lots(lots(nom, categorie))').eq('member_id', member.id).order('confirmed_at', { ascending: false }),
    admin.from('tier_rewards').select('palier, lot_nom, statut, claimed_at').eq('member_id', member.id).order('claimed_at', { ascending: false }),
  ])

  const active = commandes?.filter(c => c.statut === 'active') ?? []
  const cumul  = active.reduce((s, c) => s + c.montant_ar, 0)

  return {
    state: 'authenticated',
    member: { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email, etape: member.etape },
    cumul,
    palier:       computePalier(cumul),
    nbCommandes:  active.length,
    wins:         wins ?? [],
    tierRewards:  tierRewards ?? [],
  }
}

/* ── Créer son propre PIN (premier accès) ── */
export async function createPin(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const email   = formData.get('email') as string
  const pin     = formData.get('pin') as string
  const confirm = formData.get('pin_confirm') as string

  if (!email || !pin) return { error: 'Données manquantes.' }
  if (!/^\d{4}$/.test(pin)) return { error: 'Le PIN doit être exactement 4 chiffres.' }
  if (pin !== confirm) return { error: 'Les deux PINs ne correspondent pas.' }

  const admin = getAdmin()

  // Vérifier que le membre n'a pas déjà un PIN
  const { data: member } = await admin.from('members').select('pin').eq('email', email.toLowerCase()).single()
  if (!member) return { error: 'Membre introuvable.' }
  if (member.pin) return { error: 'Ce compte a déjà un PIN. Utilisez-le pour vous connecter.' }

  const { error } = await admin.from('members').update({ pin }).eq('email', email.toLowerCase())
  if (error) return { error: error.message }

  redirect(`/portail?email=${encodeURIComponent(email)}&pin=${pin}`)
}

/* ── Changer son PIN (après reset admin) ── */
export async function changePin(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const email    = formData.get('email') as string
  const tempPin  = formData.get('temp_pin') as string
  const newPin   = formData.get('pin') as string
  const confirm  = formData.get('pin_confirm') as string

  if (!email || !tempPin || !newPin) return { error: 'Données manquantes.' }
  if (!/^\d{4}$/.test(newPin)) return { error: 'Le PIN doit être exactement 4 chiffres.' }
  if (newPin !== confirm) return { error: 'Les deux PINs ne correspondent pas.' }
  if (newPin === tempPin) return { error: 'Le nouveau PIN doit être différent du PIN temporaire.' }

  const admin = getAdmin()

  // Vérifier le PIN temporaire
  const { data: member } = await admin.from('members').select('pin_temp').eq('email', email.toLowerCase()).single()
  if (!member || member.pin_temp !== tempPin) return { error: 'PIN temporaire invalide.' }

  const { error } = await admin.from('members')
    .update({ pin: newPin, pin_temp: null })
    .eq('email', email.toLowerCase())

  if (error) return { error: error.message }

  redirect(`/portail?email=${encodeURIComponent(email)}&pin=${newPin}`)
}
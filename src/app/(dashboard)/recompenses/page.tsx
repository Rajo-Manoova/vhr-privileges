import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import RecompensesManager from '@/components/RecompensesManager'
import { computePalier } from '@/lib/auth'

export default async function RecompensesPage() {
  await requireRole(['admin'])
  const supabase = await createClient()

  const [{ data: members }, { data: commandes }, { data: rewards }, { data: lots }] = await Promise.all([
    supabase.from('members').select('*').order('prenom'),
    supabase.from('commandes').select('member_id, montant_ar').eq('statut', 'active'),
    supabase.from('tier_rewards').select('*').order('claimed_at', { ascending: false }),
    supabase.from('lots').select('*').eq('disponible', true).order('palier'),
  ])

  // Calcul du cumul + palier par membre
  const membersWithTier = (members ?? []).map(m => {
    const cumul = (commandes ?? [])
      .filter(c => c.member_id === m.id)
      .reduce((sum, c) => sum + c.montant_ar, 0)
    const palier = computePalier(cumul)
    const memberRewards = (rewards ?? []).filter(r => r.member_id === m.id)
    return { ...m, cumul, palier, rewards: memberRewards }
  }).filter(m => m.palier !== 'membre')
    .sort((a, b) => b.cumul - a.cumul)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Récompenses</h1>
        <p className="page-subtitle">
          Gérez les récompenses des membres ayant atteint un palier VHR Privilèges.
        </p>
      </div>
      <RecompensesManager
        members={membersWithTier}
        lots={lots ?? []}
      />
    </div>
  )
}
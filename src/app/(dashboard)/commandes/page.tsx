import { createClient } from '@/lib/supabase/server'
import CommandeManager from '@/components/CommandeManager'

export default async function CommandesPage() {
  const supabase = await createClient()

  const [{ data: commandes }, { data: members }] = await Promise.all([
    supabase
      .from('commandes')
      .select('*, members(id, prenom, nom, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('members')
      .select('id, prenom, nom, email')
      .order('prenom'),
  ])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Commandes</h1>
        <p className="page-subtitle">
          Enregistrez les commandes Cart&apos;In pour le programme de fidélité et le tirage du 27 Mai.
        </p>
      </div>
      <CommandeManager
        initialCommandes={commandes ?? []}
        members={members ?? []}
      />
    </div>
  )
}
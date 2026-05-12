import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import CatalogueManager from '@/components/CatalogueManager'

export default async function CataloguePage() {
  await requireRole(['admin'])
  const supabase = await createClient()

  const { data: lots } = await supabase
    .from('lots')
    .select('*')
    .order('palier')
    .order('categorie')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Catalogue des lots</h1>
        <p className="page-subtitle">
          Gérez l&apos;ensemble des lots disponibles pour les jeux et le programme VHR Privilèges.
        </p>
      </div>
      <CatalogueManager initialLots={lots ?? []} />
    </div>
  )
}
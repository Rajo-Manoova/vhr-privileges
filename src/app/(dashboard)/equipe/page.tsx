import { requireRole } from '@/lib/auth'
import { getTeamMembers } from '@/app/actions/team'
import EquipeManager from '@/components/EquipeManager'

export default async function EquipePage() {
  await requireRole(['admin'])
  const members = await getTeamMembers()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestion de l&apos;équipe</h1>
        <p className="page-subtitle">
          Créez et gérez les comptes admin et animateurs.
        </p>
      </div>
      <EquipeManager initialMembers={members} />
    </div>
  )
}
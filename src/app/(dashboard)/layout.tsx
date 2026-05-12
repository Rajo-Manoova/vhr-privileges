import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'
import type { Role } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Vérifie l'authentification
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupère le rôle
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = (roleData?.role ?? 'membre') as Role

  return (
    <DashboardShell role={role} userEmail={user.email ?? ''}>
      {children}
    </DashboardShell>
  )
}
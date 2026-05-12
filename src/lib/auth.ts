import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Role, Palier, PALIER_SEUILS } from '@/types'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return (data?.role as Role) ?? null
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  const role = await getUserRole()

  if (!role || !allowedRoles.includes(role)) {
    redirect('/dashboard')
  }

  return { user, role }
}

// Compute palier from cumul
export function computePalier(cumulAr: number): Palier {
  if (cumulAr >= 12_000_000) return 'vip'
  if (cumulAr >= 5_000_000)  return 'or'
  if (cumulAr >= 2_000_000)  return 'argent'
  return 'membre'
}

// Format Ariary
export function formatAr(amount: number): string {
  return new Intl.NumberFormat('fr-MG', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' Ar'
}
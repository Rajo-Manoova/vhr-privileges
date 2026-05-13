'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getAdminSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Accès refusé')
  return user
}

export async function getTeamMembers() {
  await requireAdmin()
  const admin = getAdminSupabase()

  const { data: roles } = await admin.from('user_roles').select('*')
  if (!roles || roles.length === 0) return []

  const details = await Promise.all(
    roles.map(async (r) => {
      const { data: { user }, error } = await admin.auth.admin.getUserById(r.user_id)
      if (error || !user) return null
      return {
        id:           r.user_id,
        email:        user.email ?? '',
        role:         r.role as 'admin' | 'animateur',
        prenom:       (user.user_metadata?.prenom as string) ?? '',
        nom:          (user.user_metadata?.nom as string) ?? '',
        created_at:   user.created_at,
      }
    })
  )

  return details
    .filter(Boolean)
    .sort((a, b) => {
      if (a!.role === 'admin' && b!.role !== 'admin') return -1
      if (a!.role !== 'admin' && b!.role === 'admin') return 1
      return 0
    }) as {
      id: string; email: string; role: 'admin' | 'animateur'
      prenom: string; nom: string; created_at: string
    }[]
}

export async function createTeamMember(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  await requireAdmin()
  const admin = getAdminSupabase()

  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)?.trim()
  const role     = formData.get('role') as 'animateur' | 'admin'
  const prenom   = (formData.get('prenom')   as string)?.trim() || ''
  const nom      = (formData.get('nom')      as string)?.trim() || ''

  if (!email || !password || !role)
    return { error: 'Tous les champs sont requis.' }
  if (password.length < 8)
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }

  const { data: { user }, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom },
  })

  if (createError || !user) {
    if (createError?.message?.includes('already registered'))
      return { error: 'Cet email est déjà utilisé.' }
    return { error: createError?.message ?? 'Erreur lors de la création.' }
  }

  const { error: roleError } = await admin
    .from('user_roles').insert({ user_id: user.id, role })

  if (roleError) {
    await admin.auth.admin.deleteUser(user.id)
    return { error: "Erreur lors de l'attribution du rôle." }
  }

  revalidatePath('/equipe')
  return { success: true }
}

export async function deleteTeamMember(userId: string) {
  const currentUser = await requireAdmin()
  const admin = getAdminSupabase()

  if (currentUser.id === userId)
    return { error: 'Vous ne pouvez pas supprimer votre propre compte.' }

  await admin.from('user_roles').delete().eq('user_id', userId)
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }

  revalidatePath('/equipe')
  return { success: true }
}
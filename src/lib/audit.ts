import { createClient } from '@/lib/supabase/server'

export async function logAction(
  action: string,
  entityType: string,
  entityLabel: string,
  details?: Record<string, unknown>,
  entityId?: string,
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id:      user.id,
      user_email:   user.email,
      action,
      entity_type:  entityType,
      entity_id:    entityId ?? null,
      entity_label: entityLabel,
      details:      details ?? null,
    })
  } catch {
    // Ne jamais bloquer l'action principale à cause du log
  }
}
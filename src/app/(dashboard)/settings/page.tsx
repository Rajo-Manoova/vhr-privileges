import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './_client'
import type { TirageTypeConfig } from '@/types'

export default async function SettingsPage() {
  await requireRole(['admin'])
  const supabase = await createClient()

  const { data: configs } = await supabase
    .from('tirage_type_configs')
    .select('*')
    .order('created_at')

  return <SettingsClient configs={(configs ?? []) as TirageTypeConfig[]} />
}
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  // Vérification admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorisé', { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin')
    return new NextResponse('Accès refusé', { status: 403 })

  // Filtres (mêmes que la page membres)
  const { searchParams } = new URL(req.url)
  const etape = searchParams.get('etape') || ''
  const q     = searchParams.get('q')     || ''

  let query = supabase
    .from('members')
    .select('prenom, nom, email, whatsapp, etape, created_at, actif, notes')
    .order('created_at', { ascending: false })

  if (etape && etape !== 'all') query = query.eq('etape', etape)
  if (q) query = query.or(
    `prenom.ilike.%${q}%,nom.ilike.%${q}%,email.ilike.%${q}%`
  )

  const { data: members } = await query

  if (!members || members.length === 0)
    return new NextResponse('Aucun membre à exporter.', { status: 404 })

  // Génération CSV
  const headers = [
    'Prénom', 'Nom', 'Email', 'WhatsApp',
    'Étape', 'Date inscription', 'Actif', 'Notes',
  ]

  const rows = members.map(m => [
    m.prenom,
    m.nom ?? '',
    m.email,
    m.whatsapp,
    ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape,
    new Date(m.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }),
    m.actif !== false ? 'Oui' : 'Non',
    m.notes ?? '',
  ])

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`

  const csv = [
    headers.map(escape).join(';'),
    ...rows.map(row => row.map(escape).join(';')),
  ].join('\r\n')

  // BOM UTF-8 pour compatibilité Excel Windows
  const output  = '\uFEFF' + csv
  const date    = new Date().toISOString().split('T')[0]
  const filename = `membres_vhr_${date}.csv`

  return new NextResponse(output, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const PALIER_LABELS: Record<string, string> = {
  soiree:       'Soirée 16 Mai',
  tirage_27mai: '27 Mai',
  argent:       'Argent',
  or:           'Or',
  vip:          'VIP',
}

const CATEGORIE_LABELS: Record<string, string> = {
  petit:     'Découverte',
  gros:      'Prestige',
  tres_gros: 'Grand Prix',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  // Vérification admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorisé', { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin')
    return new NextResponse('Accès refusé', { status: 403 })

  // Filtres (mêmes que la page catalogue)
  const { searchParams } = new URL(req.url)
  const palier     = searchParams.get('palier')     || ''
  const categorie  = searchParams.get('categorie')  || ''
  const disponible = searchParams.get('disponible') || ''
  const q          = searchParams.get('q')          || ''

  let query = supabase
    .from('lots')
    .select('code, nom, categorie, palier, stock, disponible, valeur_ar, created_at')
    .order('created_at', { ascending: false })

  if (palier    && palier    !== 'all') query = query.eq('palier',    palier)
  if (categorie && categorie !== 'all') query = query.eq('categorie', categorie)
  if (disponible === 'oui') query = query.eq('disponible', true)
  if (disponible === 'non') query = query.eq('disponible', false)
  if (q) query = query.ilike('nom', `%${q}%`)

  const { data: lots } = await query

  if (!lots || lots.length === 0)
    return new NextResponse('Aucun lot à exporter.', { status: 404 })

  // Génération CSV
  const headers = [
    'Code', 'Nom', 'Catégorie', 'Programme',
    'Stock', 'Disponible', 'Valeur (Ar)', 'Date ajout',
  ]

  const rows = lots.map(l => [
    l.code ?? '',
    l.nom,
    CATEGORIE_LABELS[l.categorie] ?? l.categorie,
    PALIER_LABELS[l.palier]       ?? l.palier,
    String(l.stock),
    l.disponible ? 'Oui' : 'Non',
    l.valeur_ar != null
      ? new Intl.NumberFormat('fr-FR').format(l.valeur_ar)
      : '',
    new Date(l.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }),
  ])

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`

  const csv = [
    headers.map(escape).join(';'),
    ...rows.map(row => row.map(escape).join(';')),
  ].join('\r\n')

  const output   = '\uFEFF' + csv
  const date     = new Date().toISOString().split('T')[0]
  const filename = `catalogue_vhr_${date}.csv`

  return new NextResponse(output, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
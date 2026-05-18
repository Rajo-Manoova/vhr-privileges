import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

// Taux de conversion EUR → Ariary
const EUR_TO_AR = 5500

// Seuils des paliers (en Ariary)
const PALIER_SEUILS = {
  vip:    12_000_000,
  or:     5_000_000,
  argent: 2_000_000,
  membre: 0,
}

function getPalier(cumul: number): string {
  if (cumul >= PALIER_SEUILS.vip)    return 'vip'
  if (cumul >= PALIER_SEUILS.or)     return 'or'
  if (cumul >= PALIER_SEUILS.argent) return 'argent'
  return 'membre'
}

export async function POST() {
  try {
    await requireRole(['admin'])
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const logs: string[] = []

  try {
    // 1. Connexion à Odoo via pg
    const { Client } = await import('pg')
    const odoo = new Client({
      host:     process.env.ODOO_PG_HOST,
      port:     parseInt(process.env.ODOO_PG_PORT ?? '5432'),
      database: process.env.ODOO_PG_DB,
      user:     process.env.ODOO_PG_USER,
      password: process.env.ODOO_PG_PASSWORD,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    })

    await odoo.connect()
    logs.push('✓ Connexion Odoo établie')

    // 2. Récupérer les cumuls par email
    const result = await odoo.query(`
      SELECT 
        c.customer_email,
        ROUND(SUM(f.price_total_eur) * ${EUR_TO_AR}) as cumul_ar
      FROM cartin.fact_sales_line f
      JOIN cartin.dim_customer c ON f.customer_sk = c.customer_sk
      WHERE c.customer_email IS NOT NULL
        AND c.is_active = true
      GROUP BY c.customer_email
    `)

    await odoo.end()

    const odooData: Record<string, number> = {}
    for (const row of result.rows) {
      odooData[row.customer_email.toLowerCase()] = parseInt(row.cumul_ar)
    }

    logs.push(`✓ ${result.rows.length} clients Odoo chargés`)

    // 3. Récupérer les membres Supabase
    const supabase = await createClient()
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, email, cumul_ar, niveau')

    if (membersError) throw new Error(membersError.message)
    logs.push(`✓ ${members?.length ?? 0} membres VHR Privilèges chargés`)

    // 4. Mettre à jour chaque membre
    let updated = 0
    let unchanged = 0
    let notFound = 0
    const niveauChanges: { email: string; ancien: string; nouveau: string }[] = []

    for (const member of members ?? []) {
      const email = member.email.toLowerCase()
      const newCumul = odooData[email] ?? 0
      const newNiveau = getPalier(newCumul)

      // Ne mettre à jour que si les données ont changé
      if (newCumul === member.cumul_ar && newNiveau === member.niveau) {
        unchanged++
        continue
      }

      const { error } = await supabase
        .from('members')
        .update({ cumul_ar: newCumul, niveau: newNiveau })
        .eq('id', member.id)

      if (error) {
        logs.push(`✗ Erreur pour ${email}: ${error.message}`)
      } else {
        updated++
        if (newNiveau !== member.niveau) {
          niveauChanges.push({ email, ancien: member.niveau, nouveau: newNiveau })
        }
        if (odooData[email] === undefined) notFound++
      }
    }

    logs.push(`✓ ${updated} membres mis à jour`)
    logs.push(`✓ ${unchanged} membres inchangés`)
    if (niveauChanges.length > 0) {
      logs.push(`✓ ${niveauChanges.length} changements de niveau`)
    }

    return NextResponse.json({
      success: true,
      startedAt,
      completedAt: new Date().toISOString(),
      stats: {
        odooClients: result.rows.length,
        membresTotal: members?.length ?? 0,
        updated,
        unchanged,
        niveauChanges,
      },
      logs,
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message ?? 'Erreur inconnue',
      logs,
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    await requireRole(['admin'])
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { Client } = await import('pg')
    const odoo = new Client({
      host:     process.env.ODOO_PG_HOST,
      port:     parseInt(process.env.ODOO_PG_PORT ?? '5432'),
      database: process.env.ODOO_PG_DB,
      user:     process.env.ODOO_PG_USER,
      password: process.env.ODOO_PG_PASSWORD,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    })

    await odoo.connect()
    const result = await odoo.query('SELECT COUNT(*) as total FROM cartin.dim_customer WHERE is_active = true')
    await odoo.end()

    return NextResponse.json({
      connected: true,
      odooClients: parseInt(result.rows[0].total),
    })
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: err.message,
    })
  }
}
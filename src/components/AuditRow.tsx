'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'

interface AuditLog {
  id: string
  created_at: string
  user_email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  details: Record<string, unknown> | null
}

const ACTION_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  'member.created':      { label: 'Inscription',        bg: '#dcfce7', color: '#16a34a' },
  'member.updated':      { label: 'Modif. membre',      bg: '#dbeafe', color: '#1d4ed8' },
  'member.activated':    { label: 'Réactivation',       bg: '#dcfce7', color: '#16a34a' },
  'member.deactivated':  { label: 'Désactivation',      bg: '#fee2e2', color: '#dc2626' },
  'pin.reset':           { label: 'Reset PIN',           bg: '#fef9c3', color: '#d97706' },
  'lot.created':         { label: 'Lot ajouté',          bg: '#ede9fe', color: '#7c3aed' },
  'lot.updated':         { label: 'Lot modifié',         bg: '#ede9fe', color: '#7c3aed' },
  'lot.deleted':         { label: 'Lot supprimé',        bg: '#fee2e2', color: '#dc2626' },
  'lot.disabled':        { label: 'Lot désactivé',       bg: '#fee2e2', color: '#dc2626' },
  'lot.activated':       { label: 'Lot activé',          bg: '#dcfce7', color: '#16a34a' },
  'lot.featured':        { label: 'Lot mis en avant',    bg: '#fef9c3', color: '#d97706' },
  'commande.created':    { label: 'Commande ajoutée',    bg: '#dbeafe', color: '#1d4ed8' },
  'commande.updated':    { label: 'Commande modifiée',   bg: '#dbeafe', color: '#1d4ed8' },
  'commande.deleted':    { label: 'Commande supprimée',  bg: '#fee2e2', color: '#dc2626' },
  'team.member_added':        { label: 'Compte créé',         bg: '#dcfce7', color: '#16a34a' },
  'team.member_removed':      { label: 'Compte supprimé',     bg: '#fee2e2', color: '#dc2626' },
  'member.niveau_updated':    { label: 'Niveau modifié',      bg: '#fef3c7', color: '#92400e' },
  'tirage.created':           { label: 'Tirage créé',         bg: '#dcfce7', color: '#16a34a' },
  'tirage.deleted':           { label: 'Tirage supprimé',     bg: '#fee2e2', color: '#dc2626' },
  'tirage.lot_added':         { label: 'Lot ajouté',          bg: '#ede9fe', color: '#7c3aed' },
  'tirage.lot_removed':       { label: 'Lot retiré',          bg: '#fee2e2', color: '#dc2626' },
  'tirage.lots_reordered':    { label: 'Lots réordonnés',     bg: '#f0f7f8', color: '#2c6976' },
  'tirage.override_updated':  { label: 'Éligibilité modif.',  bg: '#dbeafe', color: '#1d4ed8' },
  'tirage.tickets_updated':   { label: 'Tickets modifiés',    bg: '#fef9c3', color: '#d97706' },
  'tirage.maxwins_updated':    { label: 'Gains max modifié',    bg: '#fdf4ff', color: '#7e22ce' },
}

const FIELD_LABELS: Record<string, string> = {
  prenom:        'Prénom',
  nom:           'Nom',
  email:         'Email',
  whatsapp:      'WhatsApp',
  etape:         'Étape',
  actif:         'Actif',
  montant_ar:    'Montant',
  commande_date: 'Date',
  statut:        'Statut',
  categorie:     'Catégorie',
  palier:        'Programme',
  stock:         'Stock',
  valeur_ar:     'Valeur',
  disponible:    'Disponible',
  mis_en_avant:  'Mis en avant',
  action:        'Action',
}

const STATUT_LABELS: Record<string, string> = {
  active: 'Active', annulee: 'Annulée', remboursee: 'Remboursée',
}

const PALIER_LABELS: Record<string, string> = {
  soiree: 'Soirée 16 Mai', tirage_27mai: '27 Mai',
  argent: 'Argent', or: 'Or', vip: 'VIP',
}

const CATEGORIE_LABELS: Record<string, string> = {
  petit: 'Découverte', gros: 'Prestige', tres_gros: 'Grand Prix',
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (field === 'etape')
    return ETAPE_LABELS[value as Etape]?.split('(')[0].trim() ?? String(value)
  if (field === 'montant_ar' || field === 'valeur_ar')
    return new Intl.NumberFormat('fr-FR').format(Number(value)) + ' Ar'
  if (field === 'statut')    return STATUT_LABELS[value as string]   ?? String(value)
  if (field === 'palier')    return PALIER_LABELS[value as string]    ?? String(value)
  if (field === 'categorie') return CATEGORIE_LABELS[value as string] ?? String(value)
  if (field === 'commande_date') {
    try {
      return new Date(value as string).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    } catch { return String(value) }
  }
  return String(value)
}

/* ── Vue diff avant/après ── */
function DiffView({ details }: { details: Record<string, unknown> }) {
  const before = details.before as Record<string, unknown> | undefined
  const after  = details.after  as Record<string, unknown> | undefined
  const data   = details.data   as Record<string, unknown> | undefined

  // Mode diff
  if (before && after) {
    const changedFields = Object.keys(after).filter(
      key => JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )

    if (changedFields.length === 0) {
      return (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', margin: 0 }}>
          Aucun changement détecté.
        </p>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {changedFields.map(field => (
          <div
            key={field}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
          >
            {/* Label */}
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700,
              textTransform: 'uppercase' as const, letterSpacing: '0.06em',
              color: 'var(--text-4)', minWidth: 90, flexShrink: 0,
            }}>
              {FIELD_LABELS[field] ?? field}
            </span>

            {/* Ancienne valeur barrée */}
            <span style={{
              fontSize: '0.8125rem', color: '#9ca3af',
              textDecoration: 'line-through',
              background: '#fee2e2', padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              maxWidth: 180, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {formatValue(field, before[field])}
            </span>

            <ArrowRight size={12} style={{ color: 'var(--text-4)', flexShrink: 0 }} />

            {/* Nouvelle valeur */}
            <span style={{
              fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a',
              background: '#dcfce7', padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              maxWidth: 180, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {formatValue(field, after[field])}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Mode données simples (création / suppression)
  if (data) {
    const entries = Object.entries(data).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    )
    if (entries.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {entries.map(([field, value]) => (
          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700,
              textTransform: 'uppercase' as const, letterSpacing: '0.06em',
              color: 'var(--text-4)', minWidth: 90, flexShrink: 0,
            }}>
              {FIELD_LABELS[field] ?? field}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>
              {formatValue(field, value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

/* ── Composant principal ── */
export default function AuditRow({
  log,
  isLast,
}: {
  log: AuditLog
  isLast: boolean
}) {
  const [open, setOpen] = useState(false)

  const cfg = ACTION_CONFIG[log.action] ?? {
    label: log.action, bg: 'var(--bg-2)', color: 'var(--text-4)',
  }

  const hasDetails =
    log.details !== null &&
    log.details !== undefined &&
    Object.keys(log.details).length > 0

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>

      {/* Ligne principale */}
      <div
        onClick={() => hasDetails && setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.75rem 1.25rem',
          cursor: hasDetails ? 'pointer' : 'default',
          background: open ? 'var(--bg-0)' : 'white',
          transition: 'background 150ms ease',
          userSelect: 'none' as const,
        }}
      >
        {/* Badge action */}
        <span style={{
          display: 'inline-block', flexShrink: 0,
          padding: '0.2rem 0.5rem', borderRadius: 9999,
          fontSize: '0.6875rem', fontWeight: 700,
          background: cfg.bg, color: cfg.color,
          whiteSpace: 'nowrap' as const,
          minWidth: 120, textAlign: 'center' as const,
        }}>
          {cfg.label}
        </span>

        {/* Entité + user */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {log.entity_label || '—'}
          </div>
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-4)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            par {log.user_email ?? 'inconnu'}
          </div>
        </div>

        {/* Date + toggle */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0,
        }}>
          <div style={{
            fontSize: '0.6875rem', color: 'var(--text-4)',
            textAlign: 'right', whiteSpace: 'nowrap',
          }}>
            {new Date(log.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short',
            })}
            {' '}
            {new Date(log.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
          {hasDetails && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.2rem',
              fontSize: '0.6875rem', fontWeight: 600,
              color: open ? 'var(--brand)' : 'var(--text-4)',
              transition: 'color 150ms ease',
            }}>
              {open ? 'Masquer' : 'Détails'}
              {open
                ? <ChevronUp   size={11} />
                : <ChevronDown size={11} />
              }
            </div>
          )}
        </div>
      </div>

      {/* Accordéon */}
      {open && hasDetails && (
        <div style={{
          padding: '0.875rem 1.25rem 1rem',
          background: 'var(--bg-0)',
          borderTop: '1px solid var(--border)',
          animation: 'fadeIn 0.15s ease both',
        }}>
          <DiffView details={log.details!} />
        </div>
      )}
    </div>
  )
}
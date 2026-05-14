'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2, ChevronLeft,
  Trophy, AlertCircle, ChevronRight, Users, ChevronDown, ChevronUp,
  Plus, Trash2, PackageOpen, Loader2, GripVertical, ArrowUp, ArrowDown, ArrowUpDown, Volume2, VolumeX,
} from 'lucide-react'
import type { Member, Lot, TirageTypeConfig, Palier } from '@/types'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, ETAPE_LABELS, PALIER_CHANCES, PALIER_ORDER, PALIER_COLORS, PALIER_LABELS, CATEGORIE_PALIER_MIN } from '@/types'
import type { LotCategorie, Etape } from '@/types'
import { addSessionLot, removeSessionLot, updateTirageOverride, updateTirageTickets, updateTirageMaxWins } from '@/app/actions/tirages'

type Phase = 'ready' | 'animating' | 'winner' | 'completed'

const MEMBRES_PER_PAGE = 10

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  status: string
  lot: { id: string; nom: string; categorie: LotCategorie; valeur_ar?: number | null; photo_url?: string | null } | null
}

interface Win {
  memberId: string
  memberName: string
  lotNom: string
  sessionLotId: string
}

interface Commande {
  id: string
  member_id: string
  statut: string
}

interface Props {
  session: { id: string; type: string; label?: string | null; status: string; eligibilite_override: boolean; tickets_actifs: boolean; max_wins_per_member: number }
  sessionId: string
  initialSessionLots: SessionLot[]
  initialWins: Win[]
  members: Member[]
  commandes: Commande[]
  catalogueLots: Lot[]
  typeConfig: TirageTypeConfig | null
}

// Compat backward avec anciens types
const TYPE_LABELS: Record<string, string> = {
  soiree_16mai:  'Soirée 16 Mai',
  tirage_27mai:  '27 Mai',
  ponctuel:      'Ponctuel',
  hebdomadaire:  'Hebdomadaire',
  mensuel:       'Mensuel',
  trimestriel:   'Trimestriel',
  semestriel:    'Semestriel',
  annuel:        'Annuel',
}

/* ── Panel lots ── */
type LotSortField = 'ordre' | 'nom' | 'categorie' | 'valeur_ar'

function SortBtn({ field, sort, dir, dark, onSort }: { field: LotSortField; sort: LotSortField; dir: 'asc'|'desc'; dark: boolean; onSort: (f: LotSortField) => void }) {
  const active = sort === field
  const Icon   = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button onClick={() => onSort(field)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '0.25rem', color: active ? (dark ? 'rgba(255,255,255,0.8)' : 'var(--brand)') : (dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)'), fontFamily: 'var(--font-body)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {field === 'ordre' ? '#' : field === 'nom' ? 'Lot' : field === 'categorie' ? 'Catégorie' : 'Valeur'}
      <Icon size={9} />
    </button>
  )
}

function LotsPanel({
  sessionLots, wins, lotIndex, phase,
  onRemove, onReorder, dark = false,
}: {
  sessionLots: SessionLot[]
  wins: Win[]
  lotIndex: number
  phase: Phase
  onRemove?: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
  dark?: boolean
}) {
  const [sortField, setSortField] = React.useState<LotSortField>('ordre')
  const [sortDir,   setSortDir]   = React.useState<'asc'|'desc'>('asc')
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)

  const canDrag = !!onReorder && phase === 'ready'

  function handleSort(field: LotSortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = React.useMemo(() => {
    const arr = [...sessionLots]
    if (sortField === 'ordre') return arr.sort((a, b) => a.ordre - b.ordre)
    return arr.sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'nom')       { va = a.lot?.nom ?? ''; vb = b.lot?.nom ?? '' }
      if (sortField === 'categorie') { va = a.lot?.categorie ?? ''; vb = b.lot?.categorie ?? '' }
      if (sortField === 'valeur_ar') { va = a.lot?.valeur_ar ?? 0; vb = b.lot?.valeur_ar ?? 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [sessionLots, sortField, sortDir])

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) return
    const base = [...sessionLots].sort((a, b) => a.ordre - b.ordre)
    const fromIdx = base.findIndex(sl => sl.id === draggingId)
    const toIdx   = base.findIndex(sl => sl.id === targetId)
    const moved   = base.splice(fromIdx, 1)[0]
    base.splice(toIdx, 0, moved)
    onReorder?.(base.map(sl => sl.id))
    setSortField('ordre')
    setDraggingId(null)
    setDragOverId(null)
  }
  function handleDragEnd() { setDraggingId(null); setDragOverId(null) }

  // Grid columns : [drag?] [num] [nom 1fr] [categorie 90px] [valeur 90px] [delete?]
  const GRID = canDrag
    ? '16px 28px 1fr 90px 82px 28px'
    : onRemove
    ? '28px 1fr 90px 82px 28px'
    : '28px 1fr 90px 82px'

  const hdrColor = (f: LotSortField) =>
    sortField === f
      ? dark ? 'rgba(255,255,255,0.85)' : 'var(--brand)'
      : dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)'

  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : 'white',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
      borderRadius: '0.875rem', width: '100%', minWidth: 0, boxSizing: 'border-box' as const,
    }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
      <div style={{ minWidth: 480 }}>

      {/* Header aligné sur la grille */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID, gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
        background: dark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)',
        alignItems: 'center',
      }}>
        {canDrag && <span />}
        {/* # */}
        <SortBtn field="ordre" sort={sortField} dir={sortDir} dark={dark} onSort={handleSort} />
        {/* Lot */}
        <SortBtn field="nom" sort={sortField} dir={sortDir} dark={dark} onSort={handleSort} />
        {/* Catégorie */}
        <SortBtn field="categorie" sort={sortField} dir={sortDir} dark={dark} onSort={handleSort} />
        {/* Valeur */}
        <SortBtn field="valeur_ar" sort={sortField} dir={sortDir} dark={dark} onSort={handleSort} />
        {onRemove && <span />}
      </div>

      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {sorted.map((sl, i) => {
          const win        = wins.find(w => w.sessionLotId === sl.id)
          const origIdx    = sessionLots.findIndex(s => s.id === sl.id)
          const isCurrent  = origIdx === lotIndex && phase !== 'completed'
          const isDone     = !!win
          const cc         = CATEGORIE_COLORS[sl.lot?.categorie as LotCategorie] ?? { bg: '#f0f7f8', color: '#2c6976' }
          const isDragging = draggingId === sl.id
          const isDragOver = dragOverId === sl.id && draggingId !== sl.id
          // Numéro affiché : position visuelle si trié, ordre réel sinon
          const displayNum = isDone ? '✓' : sortField === 'ordre' ? sl.ordre : i + 1

          return (
            <div
              key={sl.id}
              draggable={canDrag && !isDone}
              onDragStart={canDrag ? e => handleDragStart(e, sl.id) : undefined}
              onDragOver={canDrag ? e => handleDragOver(e, sl.id) : undefined}
              onDrop={canDrag ? e => handleDrop(e, sl.id) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
              style={{
                display: 'grid', gridTemplateColumns: GRID, gap: '0.5rem',
                padding: '0.5rem 1rem', alignItems: 'center',
                borderBottom: i < sorted.length - 1
                  ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}` : 'none',
                background: isDragOver
                  ? dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,45,53,0.07)'
                  : isCurrent
                  ? dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,45,53,0.04)' : 'transparent',
                opacity: isDragging ? 0.35 : 1,
                cursor: canDrag && !isDone ? 'grab' : 'default',
                transition: 'background 150ms ease, opacity 150ms ease',
                outline: isDragOver ? `2px solid var(--brand)` : 'none',
                outlineOffset: '-2px',
              }}
            >
              {/* Drag handle */}
              {canDrag && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!isDone && <GripVertical size={13} style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'var(--text-4)', cursor: 'grab' }} />}
                </div>
              )}

              {/* Numéro */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#dcfce7' : isCurrent ? 'var(--brand)' : dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-2)',
                color: isDone ? '#16a34a' : isCurrent ? 'white' : dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)',
                fontSize: '0.6875rem', fontWeight: 700, transition: 'all 300ms ease',
              }}>
                {displayNum}
              </div>

              {/* Nom + gagnant */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: isDone ? 400 : 600,
                  color: isDone
                    ? dark ? 'rgba(255,255,255,0.25)' : 'var(--text-4)'
                    : isCurrent ? dark ? 'white' : 'var(--text-1)'
                    : dark ? 'rgba(255,255,255,0.5)' : 'var(--text-2)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'color 300ms ease',
                }}>
                  {sl.lot?.nom}
                </div>
                {win && (
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: dark ? '#4ade80' : '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🏆 {win.memberName}
                  </div>
                )}
                {isCurrent && !isDone && (
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: dark ? 'rgba(255,255,255,0.4)' : 'var(--brand-light)' }}>
                    ← En cours
                  </div>
                )}
              </div>

              {/* Catégorie */}
              <div>
                {sl.lot?.categorie && (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.4rem', borderRadius: 9999,
                    fontSize: '0.625rem', fontWeight: 700,
                    background: dark ? 'transparent' : cc.bg,
                    color: dark ? 'rgba(255,255,255,0.3)' : cc.color,
                    border: dark ? `1px solid rgba(255,255,255,0.1)` : 'none',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {CATEGORIE_LABELS[sl.lot.categorie] ?? sl.lot.categorie}
                  </span>
                )}
              </div>

              {/* Valeur */}
              <div style={{
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-display)',
                color: dark ? 'rgba(255,255,255,0.3)' : 'var(--text-3)',
                whiteSpace: 'nowrap' as const, textAlign: 'right',
              }}>
                {sl.lot?.valeur_ar ? `${sl.lot.valeur_ar.toLocaleString('fr-FR')} Ar` : '—'}
              </div>

              {/* Supprimer */}
              {onRemove && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {phase === 'ready' && !isDone && (
                    <button
                      onClick={() => onRemove(sl.id)}
                      style={{
                        width: 24, height: 24, borderRadius: '0.375rem', border: 'none',
                        background: 'transparent', color: 'var(--text-4)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {sessionLots.length === 0 && (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-4)' }}>
            Aucun lot ajouté.
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  )
}

/* ── Panel vérification ── */
function VerifyPanel({
  verifyEmail, verifyError, dark,
  onEmailChange, onConfirm, onRedraw,
}: {
  verifyEmail: string
  verifyError: string | null
  dark: boolean
  onEmailChange: (v: string) => void
  onConfirm: () => void
  onRedraw: () => void
}) {
  return (
    <div style={{
      maxWidth: 400, margin: '0 auto',
      background: dark ? 'rgba(255,255,255,0.06)' : 'var(--bg-1)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
      borderRadius: '1rem', padding: '1.25rem',
    }}>
      <div style={{ fontSize: '0.8125rem', color: dark ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: '0.75rem' }}>
        Confirmer l&apos;email du gagnant :
      </div>
      <input
        type="email" placeholder="email@exemple.com"
        value={verifyEmail}
        onChange={e => onEmailChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onConfirm() }}
        autoFocus
        style={{
          width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem',
          border: `1.5px solid ${dark ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
          background: dark ? 'rgba(255,255,255,0.07)' : 'white',
          color: dark ? 'white' : 'var(--text-1)',
          fontSize: '0.9375rem', fontFamily: 'var(--font-body)', outline: 'none',
          marginBottom: verifyError ? '0.5rem' : '0.75rem',
        }}
      />
      {verifyError && (
        <div style={{ color: dark ? '#fca5a5' : '#dc2626', fontSize: '0.8125rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <AlertCircle size={12} /> {verifyError}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button onClick={onConfirm} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.625rem', background: '#16a34a', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> Confirmer
        </button>
        <button onClick={onRedraw} style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', background: dark ? 'rgba(255,255,255,0.1)' : 'var(--bg-2)', border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`, color: dark ? 'rgba(255,255,255,0.7)' : 'var(--text-2)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <RotateCcw size={14} /> Re-tirer
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────── */
export default function TirageDetail({
  session, sessionId, initialSessionLots, initialWins, members, commandes,
  catalogueLots, typeConfig,
}: Props) {
  const [sessionLots, setSessionLots] = useState(initialSessionLots)
  const [override,      setOverride]      = useState(session.eligibilite_override)
  const [ticketsActifs, setTicketsActifs] = useState(session.tickets_actifs)
  const [isPendingOverride, startToggleOverride]  = useTransition()
  const [isPendingTickets,  startToggleTickets]   = useTransition()
  const [maxWinsLocal,    setMaxWinsLocal]    = useState(session.max_wins_per_member ?? 0)
  const [isPendingMaxWins, startMaxWins]      = useTransition()
  const [phase, setPhase] = useState<Phase>(
    initialSessionLots.length > 0 && initialWins.length >= initialSessionLots.length
      ? 'completed' : 'ready'
  )
  const [lotIndex, setLotIndex] = useState(() => {
    const wonIds = new Set(initialWins.map(w => w.sessionLotId))
    const idx    = initialSessionLots.findIndex(sl => !wonIds.has(sl.id))
    return idx === -1 ? Math.max(0, initialSessionLots.length - 1) : idx
  })
  const [wins, setWins]               = useState<Win[]>(initialWins)
  const [animName, setAnimName]       = useState('')
  const [winner, setWinner]           = useState<Member | null>(null)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [projector, setProjector]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Membres éligibles
  const [showMembres, setShowMembres] = useState(false)
  const [membresPage, setMembresPage] = useState(1)

  // Gestion des lots
  const [showLotPicker, setShowLotPicker]   = useState(false)
  const [addingLotId,   setAddingLotId]     = useState<string | null>(null)
  const [removingLotId, setRemovingLotId]   = useState<string | null>(null)
  const [lotError,      setLotError]        = useState<string | null>(null)

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soundRefs    = useRef<Record<string, HTMLAudioElement>>({})
  const [countdown,    setCountdown]    = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showConfetti,       setShowConfetti]       = useState(false)
  const [showConfirmButtons, setShowConfirmButtons] = useState(false)
  const [showValue,          setShowValue]          = useState(true)
  const [isMobile,           setIsMobile]           = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width:640px)')
    setIsMobile(mq.matches)
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  const [projectorView, setProjectorView] = useState<'tableau'|'animation'>('tableau')
  const [tableauPage,   setTableauPage]   = useState(1)
  const [skippedIds,    setSkippedIds]    = useState<Set<string>>(new Set())
  const confettiData = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      left:  Math.round(Math.random() * 100),
      delay: Math.round(Math.random() * 150) / 100,
      dur:   Math.round((2.2 + Math.random() * 1.8) * 10) / 10,
      color: ['#f59e0b','#ef4444','#3b82f6','#22c55e','#a855f7','#ec4899','#ffffff'][i % 7],
      rot:   Math.round(Math.random() * 360),
      w:     Math.round(6 + Math.random() * 6),
      h:     Math.round(8 + Math.random() * 8),
    }))
  )[0]

  // max_wins_per_member: 0 = exclu après 1 gain, 1 = peut gagner 2 fois, etc.
  const maxWinsPerMember = session.max_wins_per_member ?? 0
  const isSoiree = session.type === 'soiree_16mai' // compat backward

  // Lots disponibles (pas encore dans la session)
  const sessionLotIds = new Set(sessionLots.map(sl => sl.lot_id))
  const availableLots = catalogueLots.filter(l => !sessionLotIds.has(l.id))

  // Valeur totale des lots
  const totalValue = sessionLots.reduce((sum, sl) => sum + (sl.lot?.valeur_ar ?? 0), 0)

  // Guidage template
  const guidance = typeConfig?.lot_rules?.length
    ? typeConfig.lot_rules.flatMap(rule => {
        const current = sessionLots.filter(sl => sl.lot?.categorie === rule.categorie).length
        const missing = rule.qty - current
        return missing > 0 ? [{ categorie: rule.categorie, missing }] : []
      })
    : []

  // Budget max
  const budgetMax    = typeConfig?.budget_max_ar ?? null
  const budgetLimit  = budgetMax ? budgetMax * 1.1 : null
  const budgetOver   = budgetLimit !== null && totalValue > budgetLimit

  function getPool(excludeIds: string[] = []): Member[] {
    const excludeSet = new Set(excludeIds)

    // 1. Éligibilité : override → tous, sinon filtrer par niveau vs catégorie du lot en cours
    let base: Member[]
    if (override) {
      base = members.filter(m => !excludeSet.has(m.id))
    } else {
      const lotCategorie = sessionLots[lotIndex]?.lot?.categorie
      const minPalier    = (lotCategorie ? CATEGORIE_PALIER_MIN[lotCategorie] : 'membre') as Palier
      const minOrder     = PALIER_ORDER[minPalier]
      base = members.filter(m => {
        if (excludeSet.has(m.id)) return false
        const mOrder = PALIER_ORDER[(m.niveau ?? 'membre') as Palier]
        return mOrder >= minOrder
      })
    }

    // 2. Limite de gains selon max_wins_per_member
    base = base.filter(m => wins.filter(w => w.memberId === m.id).length <= maxWinsPerMember)

    // 3. Tickets : pondéré par niveau ou 1 chance flat
    if (ticketsActifs) {
      return base.flatMap(m => Array(PALIER_CHANCES[(m.niveau ?? 'membre') as Palier]).fill(m) as Member[])
    }
    return base
  }

  async function handleSetMaxWins(val: number) {
    setMaxWinsLocal(val)
    startMaxWins(async () => { await updateTirageMaxWins(sessionId, val) })
  }

  async function handleToggleOverride() {
    const next = !override
    setOverride(next)
    startToggleOverride(async () => { await updateTirageOverride(sessionId, next) })
  }

  async function handleToggleTickets() {
    const next = !ticketsActifs
    setTicketsActifs(next)
    startToggleTickets(async () => { await updateTirageTickets(sessionId, next) })
  }

  const currentPool   = getPool()
  const eligibleCount = new Set(currentPool.map(m => m.id)).size
  const ticketCount   = currentPool.length
  const currentLot    = sessionLots[lotIndex]

  const eligibleIds     = new Set(currentPool.map(m => m.id))
  const eligibleMembers = members.filter(m => eligibleIds.has(m.id))
  const totalMembresPages = Math.ceil(eligibleMembers.length / MEMBRES_PER_PAGE)
  const membresSlice    = eligibleMembers.slice(
    (membresPage - 1) * MEMBRES_PER_PAGE,
    membresPage * MEMBRES_PER_PAGE
  )

  /* ── Gestion lots ── */

  function snd(key: string, fromSec = 0) {
    if (!soundEnabled) return
    const a = soundRefs.current[key]; if (!a) return
    a.pause(); a.currentTime = fromSec; a.play().catch(() => {})
  }
  function stopSnd(key: string) {
    const a = soundRefs.current[key]
    if (a) { a.pause(); a.currentTime = 0 }
  }
  function playDrumroll() { snd('drumroll-1') }
  function playVictory()  { snd('victory-chime') }
  function stopAllSounds() { Object.keys(soundRefs.current).forEach(k => stopSnd(k)) }
  function toggleMute() { if (soundEnabled) stopAllSounds(); setSoundEnabled(v => !v) }

  function startDraw() {
    if (countdown > 0) return
    snd('countdown', 5)           // 5 dernières secondes du fichier 10s
    setTimeout(() => {
      setCountdown(5)
      const step = (n: number) => {
        timerRef.current = setTimeout(() => {
          if (n > 1) { setCountdown(n - 1); step(n - 1) }
          else {
            setCountdown(0)
            stopSnd('countdown')
            snd('sweep')
            setTimeout(() => {
              const t = soundRefs.current['tension']
              if (t) t.loop = true
              snd('tension')
              draw()
            }, 300)
          }
        }, 950)
      }
      step(5)
    }, 150)
  }

  async function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id, i) => {
      const sl = sessionLots.find(s => s.id === id)!
      return { ...sl, ordre: i + 1 }
    })
    setSessionLots(reordered)
    // Persist in background
    const { reorderSessionLots } = await import('@/app/actions/tirages')
    reorderSessionLots(sessionId, orderedIds)
  }

  async function handleAddLot(lotId: string) {
    setAddingLotId(lotId)
    setLotError(null)
    const result = await addSessionLot(sessionId, lotId)
    if (result.error) {
      setLotError(result.error)
    } else if (result.data) {
      const sl = result.data as any
      setSessionLots(prev => [...prev, {
        id:     sl.id,
        lot_id: sl.lot_id,
        ordre:  sl.ordre,
        status: sl.status,
        lot:    sl.lots ?? null,
      }])
    }
    setAddingLotId(null)
  }

  async function handleRemoveLot(sessionLotId: string) {
    setRemovingLotId(sessionLotId)
    setLotError(null)
    const result = await removeSessionLot(sessionLotId, sessionId)
    if (result.error) setLotError(result.error)
    else setSessionLots(prev => prev.filter(sl => sl.id !== sessionLotId))
    setRemovingLotId(null)
  }

  /* ── Tirage ── */

  function draw(excludeId?: string) {
    const pool = getPool(excludeId ? [excludeId] : [])
    if (pool.length === 0) { setError('Aucun membre éligible.'); return }

    const picked   = pool[Math.floor(Math.random() * pool.length)]
    const allNames = Array.from(new Set(members.map(m => `${m.prenom}${m.nom ? ' ' + m.nom : ''}`)))

    setPhase('animating')
    setWinner(picked)
    setVerifyEmail('')
    setVerifyError(null)
    setError(null)

    const delays = [
      ...Array(45).fill(18), ...Array(18).fill(38),
      ...Array(12).fill(70), ...Array(8).fill(140),
      ...Array(5).fill(260), ...Array(3).fill(430), 650,
    ]
    let step = 0

    function tick() {
      if (step < delays.length - 1) {
        setAnimName(allNames[Math.floor(Math.random() * allNames.length)])
        step++
        timerRef.current = setTimeout(tick, delays[step])
      } else {
        setAnimName(`${picked.prenom}${picked.nom ? ' ' + picked.nom : ''}`)
        stopSnd('tension')
        setPhase('winner')
        setShowConfetti(true)                                // confettis dès l'apparition
        setTimeout(() => playVictory(), 200)
        setTimeout(() => setShowConfirmButtons(true), 900)
      }
    }
    timerRef.current = setTimeout(tick, delays[0])
  }

  async function confirmWin() {
    if (!winner) return
    if (verifyEmail.trim().toLowerCase() !== winner.email.toLowerCase()) {
      setVerifyError('Email incorrect — cette personne est peut-être absente.')
      return
    }
    const currentSL = sessionLots[lotIndex]
    const newWin: Win = {
      memberId:     winner.id,
      memberName:   `${winner.prenom}${winner.nom ? ' ' + winner.nom : ''}`,
      lotNom:       currentSL.lot?.nom ?? '',
      sessionLotId: currentSL.id,
    }
    setWins(prev => [...prev, newWin])
    stopSnd('drumroll-1'); stopSnd('drumroll-2'); stopSnd('drumroll-3')
    playVictory()
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 5000)

    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id: sessionId, session_lot_id: currentSL.id, member_id: winner.id,
    }).then(({ error }) => { if (error) console.error(error) })

    if (lotIndex < sessionLots.length - 1) {
      setLotIndex(i => i + 1)
      setWinner(null)
      setPhase('ready')
      setMembresPage(1)
    } else {
      supabase.from('tirage_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId).then(() => {})
      setPhase('completed')
    }
  }

  async function handleDashboardConfirm() {
    if (!winner) return
    const currentSL = sessionLots[lotIndex]
    const newWin: Win = {
      memberId:     winner.id,
      memberName:   `${winner.prenom}${winner.nom ? ' ' + winner.nom : ''}`,
      lotNom:       currentSL.lot?.nom ?? '',
      sessionLotId: currentSL.id,
    }
    setWins(prev => [...prev, newWin])
    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id: sessionId, session_lot_id: currentSL.id, member_id: winner.id,
    }).then(({ error }) => { if (error) console.error(error) })
    if (lotIndex < sessionLots.length - 1) {
      setLotIndex(i => i + 1); setWinner(null); setPhase('ready'); setMembresPage(1)
    } else {
      supabase.from('tirage_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId).then(() => {})
      setPhase('completed')
    }
  }

  async function confirmWinDirect() {
    if (!winner) return
    const currentSL = sessionLots[lotIndex]
    const newWin: Win = {
      memberId:     winner.id,
      memberName:   `${winner.prenom}${winner.nom ? ' ' + winner.nom : ''}`,
      lotNom:       currentSL.lot?.nom ?? '',
      sessionLotId: currentSL.id,
    }
    setWins(prev => [...prev, newWin])
    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id: sessionId, session_lot_id: currentSL.id, member_id: winner.id,
    }).then(({ error }) => { if (error) console.error(error) })
    // Retour au tableau après 1.5s — confettis déjà actifs depuis la révélation
    setTimeout(() => {
      stopAllSounds()
      setShowConfetti(false); setWinner(null); setPhase('ready')
      setShowConfirmButtons(false)
      setProjectorView('tableau')
    }, 1500)
  }

  function skipLot() {
    const currentId = sessionLots[lotIndex]?.id
    if (currentId) setSkippedIds(prev => new Set([...prev, currentId]))
    stopAllSounds()
    setWinner(null); setPhase('ready'); setCountdown(0)
    setShowConfirmButtons(false); setShowConfetti(false)
    setProjectorView('tableau')
  }

  function returnToTableau() {
    stopAllSounds()
    setCountdown(0); setWinner(null); setPhase('ready')
    setShowConfirmButtons(false); setShowConfetti(false)
    setProjectorView('tableau')
  }

  function skipFromTableau(lotId: string) {
    setSkippedIds(prev => new Set([...prev, lotId]))
  }

  function handleDrawFromTableau(idx: number) {
    setLotIndex(idx); setWinner(null); setPhase('ready'); setCountdown(0)
    setProjectorView('animation')
  }

  function toggleProjector() {
    if (!projector) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setProjector(true)
    } else {
      stopAllSounds()
      document.exitFullscreen?.().catch(() => {})
      setProjector(false)
    }
  }

  useEffect(() => {
    return () => { stopAllSounds() }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const files = ['countdown','tension','sweep','drumroll-1','drumroll-2','drumroll-3','victory-big','victory-chime']
    const s: Record<string, HTMLAudioElement> = {}
    files.forEach(f => { s[f] = new Audio(`/sounds/${f}.mp3`) })
    soundRefs.current = s
    return () => { Object.values(s).forEach(a => { a.pause(); a.currentTime = 0 }) }
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const displayName = session.label?.trim() || TYPE_LABELS[session.type] || session.type

  /* ── Mode Projecteur ── */
  if (projector) {
    const TABLEAU_PER_PAGE = 5
    const sortedLots  = [...sessionLots].sort((a, b) => a.ordre - b.ordre)
    const wonIds      = new Set(wins.map(w => w.sessionLotId))
    const nextLotId   = sortedLots.find(sl => !wonIds.has(sl.id) && !skippedIds.has(sl.id))?.id
    const totalPages  = Math.ceil(sortedLots.length / TABLEAU_PER_PAGE)
    const pageSlice   = sortedLots.slice((tableauPage-1)*TABLEAU_PER_PAGE, tableauPage*TABLEAU_PER_PAGE)
    const isAllDone   = sortedLots.every(sl => wonIds.has(sl.id) || skippedIds.has(sl.id))

    const CSS = `
      @keyframes cdIn{0%{transform:scale(0.2);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
      @keyframes winIn{0%{transform:scale(0.15) translateY(30px);opacity:0;filter:blur(24px)}65%{transform:scale(1.04);filter:blur(0)}100%{transform:scale(1);opacity:1}}
      @keyframes photoIn{0%{transform:scale(1.08);opacity:0}100%{transform:scale(1);opacity:1}}
      @keyframes confetti{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(900deg);opacity:0}}
      @keyframes pulse{0%,100%{opacity:0.15}50%{opacity:0.35}}
      @keyframes rowIn{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:none}}
      @media(max-width:640px){
      .proj-title{font-size:0.875rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:38vw!important}
      }
      /* placeholder for unused – mobile handled via isMobile state */
    `
    const _UNUSED_CSS = `
      @media(max-width:768px){
        /* Header */
        .proj-title{
          font-size:clamp(0.75rem,2.5vw,1rem)!important;
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
          max-width:45vw!important;
          line-height:1.2!important
        }
        /* Tableau — left panel hidden on very small, reduced on medium */
        .proj-left-panel{width:130px!important;min-width:130px!important}
        /* Tableau grid — 3 cols: img + nom + action */
        .proj-tableau-row{
          grid-template-columns:40px 1fr 90px!important;
          gap:0.5rem!important;
          padding:0.5rem 0.75rem!important
        }
        .proj-tableau-hdr-row{
          grid-template-columns:40px 1fr 90px!important;
          gap:0.5rem!important;
          padding:0.5rem 0.75rem!important
        }
        .proj-col-cat{display:none!important}
        .proj-col-val{display:none!important}
        /* Ready phase */
        .proj-ready{flex-direction:column!important;align-items:center!important;gap:1rem!important}
        .proj-ready-txt{text-align:center!important}
        .proj-ready-img{width:min(50vw,200px)!important;height:min(50vw,200px)!important}
        /* Winner name */
        .proj-win-name{font-size:clamp(2.25rem,9vw,5rem)!important;line-height:1!important}
        /* Confirm buttons */
        .proj-confirm-btns{
          grid-template-columns:1fr 1fr!important;
          max-width:380px!important;
          gap:0.5rem!important
        }
        .proj-confirm-btns button:last-child{
          grid-column:1/-1!important
        }
        /* Animation title */
        .proj-anim-title{
          font-size:clamp(2.5rem,8vw,5rem)!important
        }
      }
      @media(max-width:480px){
        .proj-left-panel{display:none!important}
        .proj-confirm-btns{grid-template-columns:1fr!important}
      }
      @keyframes cdIn  { 0%{transform:scale(0.2);opacity:0} 50%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
      @keyframes winIn { 0%{transform:scale(0.15) translateY(30px);opacity:0;filter:blur(24px)} 65%{transform:scale(1.04);filter:blur(0)} 100%{transform:scale(1);opacity:1} }
      @keyframes photoIn { 0%{transform:scale(1.08);opacity:0} 100%{transform:scale(1);opacity:1} }
      @keyframes confetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(900deg);opacity:0} }
      @keyframes pulse { 0%,100%{opacity:0.15} 50%{opacity:0.35} }
      @keyframes rowIn { 0%{opacity:0;transform:translateX(-8px)} 100%{opacity:1;transform:none} }
    `

    /* ── TABLEAU VIEW ── */
    if (projectorView === 'tableau') {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1f2d', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
          <style>{CSS}</style>

          {/* Header */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="proj-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 3.5vw, 3rem)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: '0.375rem' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{wins.length} attribué{wins.length > 1 ? 's' : ''}</span>
                {skippedIds.size > 0 && <span style={{ color: 'rgba(255,255,255,0.25)' }}>{skippedIds.size} passé{skippedIds.size > 1 ? 's' : ''}</span>}
                <span>·</span>
                <span>{sortedLots.length} lots</span>
              </div>
            </div>
            {/* Progress pills */}
            <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
              {sortedLots.map(sl => {
                const won  = wonIds.has(sl.id)
                const skip = skippedIds.has(sl.id)
                const next = sl.id === nextLotId
                return <div key={sl.id} style={{ width: 10, height: 10, borderRadius: '50%', background: won ? '#22c55e' : skip ? 'rgba(255,255,255,0.12)' : next ? 'var(--accent)' : 'rgba(255,255,255,0.18)', transition: 'all 300ms ease' }} />
              })}
            </div>
            <button onClick={() => setShowValue(v => !v)} title={showValue ? 'Masquer les valeurs' : 'Afficher les valeurs'} style={{ background: showValue ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showValue ? 'rgba(217,119,6,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.375rem', padding: '0.4rem 0.625rem', cursor: 'pointer', color: showValue ? 'var(--accent)' : 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {showValue ? '123' : '—'}
            </button>
            <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.4rem 0.6rem', cursor: 'pointer', color: soundEnabled ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', display: 'flex' }}>
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button onClick={toggleProjector} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              <Minimize2 size={15} />
            </button>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isAllDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <Trophy size={56} style={{ color: 'var(--accent)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', color: 'white', letterSpacing: '-0.04em' }}>Tirage terminé !</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem' }}>{wins.length} gagnant{wins.length > 1 ? 's' : ''} · {skippedIds.size} passé{skippedIds.size > 1 ? 's' : ''}</div>
              </div>
            ) : (
              pageSlice.map((sl, i) => {
                const win  = wins.find(w => w.sessionLotId === sl.id)
                const skip = skippedIds.has(sl.id)
                const isNext = sl.id === nextLotId
                const cc = sl.lot?.categorie ? CATEGORIE_COLORS[sl.lot.categorie] ?? { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' } : null

                // Mobile: 3 cols [img][nom+cat][val+action]  Desktop: 5 cols
                const mobileGrid = '44px 1fr auto'
                const desktopGrid = '52px 1fr 120px 120px 1fr'
                return (
                  <div key={sl.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? mobileGrid : desktopGrid, gap: isMobile ? '0.5rem' : '1rem', padding: isMobile ? '0.625rem 0.875rem' : '0.875rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isNext ? 'rgba(255,255,255,0.035)' : 'transparent', alignItems: 'center', animation: `rowIn 0.3s ${i * 0.04}s ease both` }}>

                    {/* Miniature */}
                    {sl.lot?.photo_url ? (
                      <img src={sl.lot.photo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '0.5rem', opacity: win || skip ? 0.3 : 1, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '0.5rem', background: win ? 'rgba(34,197,94,0.1)' : isNext ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: win ? '#4ade80' : isNext ? 'var(--accent)' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                        {win ? '✓' : `#${sl.ordre}`}
                      </div>
                    )}

                    {/* Nom + catégorie (mobile: combined) */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: isMobile ? '0.8125rem' : 'clamp(0.875rem,1.5vw,1.125rem)', color: win || skip ? 'rgba(255,255,255,0.3)' : 'white', textDecoration: win ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sl.lot?.nom}
                      </div>
                      {isMobile && cc && sl.lot?.categorie && (
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                          {CATEGORIE_LABELS[sl.lot.categorie]}
                        </span>
                      )}
                    </div>

                    {/* Catégorie desktop only */}
                    {!isMobile && (
                      <div>
                        {cc && sl.lot?.categorie && (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 9999, fontSize: '0.625rem', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' as const }}>
                            {CATEGORIE_LABELS[sl.lot.categorie]}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Valeur desktop only */}
                    {!isMobile && (
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: showValue ? 'var(--accent)' : 'transparent', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' as const }}>
                        {sl.lot?.valeur_ar ? `${sl.lot.valeur_ar.toLocaleString('fr-FR')} Ar` : ''}
                      </div>
                    )}

                    {/* Action — mobile: compressed */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                      {win ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={12} color="white" />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: isMobile ? '0.8125rem' : 'clamp(0.875rem,1.8vw,1.25rem)', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: isMobile ? '22vw' : 'none' }}>
                            {win.memberName}
                          </span>
                        </div>
                      ) : skip ? (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Passé</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            onClick={() => handleDrawFromTableau(sessionLots.findIndex(s => s.id === sl.id))}
                            style={{
                              padding: isMobile ? '0.4rem 0.5rem' : '0.625rem 1.25rem',
                              borderRadius: '0.5rem',
                              background: isNext ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                              border: isNext ? 'none' : '1px solid rgba(255,255,255,0.15)',
                              color: 'white',
                              fontSize: isMobile ? '0.75rem' : '0.9375rem',
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: '0.375rem',
                              boxShadow: isNext ? '0 4px 16px rgba(217,119,6,0.3)' : 'none',
                              whiteSpace: 'nowrap' as const,
                              minWidth: isMobile ? 'auto' : 80,
                            }}
                          >
                            <Play size={isMobile ? 11 : 14} />
                            {isMobile ? '' : 'Tirer'}
                          </button>
                          <button
                            onClick={() => skipFromTableau(sl.id)}
                            style={{
                              padding: isMobile ? '0.4rem 0.4rem' : '0.625rem 1rem',
                              borderRadius: '0.5rem',
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.35)',
                              fontSize: isMobile ? '0.625rem' : '0.9375rem',
                              fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              whiteSpace: 'nowrap' as const,
                              minWidth: isMobile ? 'auto' : 72,
                            }}
                          >
                            {isMobile ? '→' : 'Passer'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '0.875rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexShrink: 0 }}>
              <button onClick={() => setTableauPage(p => Math.max(1, p-1))} disabled={tableauPage === 1} style={{ width: 32, height: 32, borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: tableauPage === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: tableauPage === 1 ? 'not-allowed' : 'pointer', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)' }}>Page {tableauPage} / {totalPages}</span>
              <button onClick={() => setTableauPage(p => Math.min(totalPages, p+1))} disabled={tableauPage === totalPages} style={{ width: 32, height: 32, borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: tableauPage === totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: tableauPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          )}
        </div>
      )
    }

    /* ── ANIMATION VIEW ── */
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1f2d', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
        <style>{CSS}</style>

        {/* Barre du haut */}
        <div style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={returnToTableau}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <ChevronLeft size={14} /> Tableau
          </button>

          <div style={{ textAlign: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div className="proj-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: isMobile ? '0.875rem' : 'clamp(1.25rem, 2.5vw, 2rem)', color: 'white', letterSpacing: '-0.025em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ display: 'flex', gap: '3px', marginTop: '0.25rem', justifyContent: 'center' }}>
              {sortedLots.map(sl => {
                const won  = wonIds.has(sl.id)
                const skip = skippedIds.has(sl.id)
                const cur  = sl.id === sessionLots[lotIndex]?.id
                return <div key={sl.id} style={{ width: cur ? 18 : 8, height: 6, borderRadius: 9999, background: won ? '#22c55e' : skip ? 'rgba(255,255,255,0.1)' : cur ? 'var(--accent)' : 'rgba(255,255,255,0.15)', transition: 'all 300ms ease' }} />
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowValue(v => !v)} title={showValue ? 'Masquer les valeurs' : 'Afficher les valeurs'} style={{ background: showValue ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showValue ? 'rgba(217,119,6,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.375rem', padding: '0.4rem 0.6rem', cursor: 'pointer', color: showValue ? 'var(--accent)' : 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {showValue ? '123' : '—'}
            </button>
            <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', width: 32, height: 32, cursor: 'pointer', color: soundEnabled ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={toggleProjector} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Zone principale */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2.5rem 2rem 2rem' }}>

          {/* READY */}
          {phase === 'ready' && countdown === 0 && (() => {
            const imgSize = 'min(42vh, 420px)'
            return (
              <div className="proj-ready" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(2rem, 5vw, 5rem)', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1100, margin: '0 auto' }}>
                {/* Image hero — gauche */}
                <div style={{ flexShrink: 0 }}>
                  {currentLot?.lot?.photo_url ? (
                    <img src={currentLot.lot.photo_url} alt={currentLot.lot?.nom} style={{ width: imgSize, height: imgSize, objectFit: 'cover', borderRadius: '1.5rem', display: 'block', animation: 'photoIn 0.5s ease both', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} />
                  ) : (
                    <div style={{ width: imgSize, height: imgSize, borderRadius: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={80} style={{ color: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  )}
                </div>
                {/* Texte + bouton — droite */}
                <div className="proj-ready-txt" style={{ flex: '1 1 280px', minWidth: 0, textAlign: 'left' }}>
                  {/* Catégorie + Valeur */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
                    {currentLot?.lot?.categorie && (
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-start' }}>
                        {CATEGORIE_LABELS[currentLot.lot.categorie]}
                      </span>
                    )}
                    {currentLot?.lot?.valeur_ar && (
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 3.5vw, 3rem)', color: showValue ? 'var(--accent)' : 'transparent', letterSpacing: '-0.02em', transition: 'color 250ms ease', userSelect: 'none', lineHeight: 1 }}>
                        {currentLot.lot.valeur_ar.toLocaleString('fr-FR')} Ar
                      </div>
                    )}
                  </div>
                  {/* Nom du lot */}
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 4vw, 3.5rem)', color: 'white', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '2rem' }}>
                    {currentLot?.lot?.nom}
                  </div>
                  {/* Bouton */}
                  <button onClick={startDraw} style={{ padding: '0.875rem 2.25rem', borderRadius: '0.875rem', background: 'var(--accent)', border: 'none', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1rem, 2vw, 1.375rem)', letterSpacing: '-0.02em', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.625rem', boxShadow: '0 6px 28px rgba(217,119,6,0.4)' }}>
                    <Play size={18} /> Tirer au sort
                  </button>
                  <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.18)', fontSize: '0.8125rem' }}>
                    {eligibleCount} membres · {ticketCount} ticket{ticketCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* COUNTDOWN */}
          {countdown > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', zIndex: 15 }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'pulse 0.5s ease-in-out infinite', background: 'radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)' }} />
              <div key={countdown} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(10rem, 22vw, 16rem)', fontWeight: 900, color: 'white', lineHeight: 1, userSelect: 'none', zIndex: 1, animation: 'cdIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', textShadow: '0 0 80px rgba(217,119,6,0.6)' }}>
                {countdown}
              </div>
            </div>
          )}

          {/* ANIMATING */}
          {phase === 'animating' && (
            <div className="proj-anim-title" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 11vw, 8rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.2)', lineHeight: 1, userSelect: 'none', textAlign: 'center', margin: 'auto 0' }}>
              {animName}
            </div>
          )}

          {/* WINNER */}
          {phase === 'winner' && winner && (
            <div style={{ textAlign: 'center', width: '100%', maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 5, animation: 'winIn 0.75s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {currentLot?.lot?.photo_url && (
                <div style={{ position: 'absolute', inset: -200, backgroundImage: `url(${currentLot.lot.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06, filter: 'blur(40px)', zIndex: -1 }} />
              )}
              {currentLot?.lot?.nom && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                    🏆 {currentLot.lot.nom}
                  </div>
                  {currentLot.lot?.valeur_ar && showValue && (
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', color: 'var(--accent)', letterSpacing: '-0.02em', opacity: 0.85 }}>
                      {currentLot.lot.valeur_ar.toLocaleString('fr-FR')} Ar
                    </div>
                  )}
                </div>
              )}
              <div className="proj-win-name" style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 'clamp(2rem,10vw,3.5rem)' : 'clamp(4rem, 14vw, 10rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'white', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {winner.prenom}
              </div>
              {winner.nom && <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem' }}>{winner.nom}</div>}
              {!winner.nom && <div style={{ marginBottom: '2rem' }} />}
              {showConfirmButtons && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem', maxWidth: 660, margin: '0 auto', width: '100%', animation: 'rowIn 0.4s ease both' }}>
                {/* Confirmer */}
                <button
                  onClick={confirmWinDirect}
                  style={{ padding: '1rem 0.5rem', borderRadius: '0.875rem', background: '#16a34a', border: 'none', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(0.875rem, 1.6vw, 1.125rem)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 24px rgba(22,163,74,0.35)', transition: 'transform 100ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                >
                  <CheckCircle2 size={24} />
                  Confirmer
                </button>
                {/* Re-tirer */}
                <button
                  onClick={() => { playDrumroll(); draw(winner.id) }}
                  style={{ padding: '1rem 0.5rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(0.875rem, 1.6vw, 1.125rem)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'transform 100ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                >
                  <RotateCcw size={24} />
                  Re-tirer
                </button>
                {/* Passer */}
                <button
                  onClick={skipLot}
                  style={{ padding: '1rem 0.5rem', borderRadius: '0.875rem', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(0.875rem, 1.6vw, 1.125rem)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'transform 100ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                >
                  <ChevronRight size={24} />
                  Passer
                </button>
              </div>}
            </div>
          )}

          {/* Confetti */}
          {showConfetti && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 20 }}>
              {confettiData.map((p, i) => (
                <div key={i} style={{ position: 'absolute', left: `${p.left}%`, top: -20, width: p.w, height: p.h, borderRadius: 2, background: p.color, animation: `confetti ${p.dur}s ${p.delay}s ease-in both`, transform: `rotate(${p.rot}deg)` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Mode Dashboard ── */
  return (

    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{displayName}</h1>
          <p className="page-subtitle">
            {sessionLots.length} lot{sessionLots.length > 1 ? 's' : ''} · {eligibleCount} membres éligibles
{ticketsActifs ? ` · ${ticketCount} tickets` : ''}{maxWinsPerMember > 0 ? ` · gain max ${maxWinsPerMember + 1}×` : ''}
          </p>
        </div>
        {phase !== 'completed' && (
          <button onClick={toggleProjector} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: 'var(--brand)', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Maximize2 size={15} /> Mode projecteur
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Section gestion des lots (uniquement si tirage pas commencé) ── */}
      {phase === 'ready' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>

          {/* Header avec total valeur */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackageOpen size={16} style={{ color: 'var(--brand-light)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>Lots de ce tirage</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)', background: 'rgba(15,45,53,0.07)', padding: '0.2rem 0.5rem', borderRadius: 9999 }}>
                {sessionLots.length}
              </span>
            </div>

            {/* Total valeur + budget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {totalValue > 0 && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: budgetOver ? '#dc2626' : 'var(--text-2)' }}>
                  Total : {totalValue.toLocaleString('fr-FR')} Ar
                  {budgetMax && (
                    <span style={{ fontWeight: 400, color: budgetOver ? '#dc2626' : 'var(--text-4)', marginLeft: '0.375rem' }}>
                      / {budgetMax!.toLocaleString('fr-FR')} Ar max
                    </span>
                  )}
                </span>
              )}
              {budgetOver && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: 9999 }}>
                  Budget dépassé
                </span>
              )}
            </div>
          </div>

          {/* Guidage template */}
          {guidance.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {guidance.map(g => (
                <span key={g.categorie} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', background: '#fef9c3', border: '1px solid #fde68a', padding: '0.25rem 0.625rem', borderRadius: 9999 }}>
                  {g.missing} {CATEGORIE_LABELS[g.categorie as LotCategorie] ?? g.categorie} manquant{g.missing > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Liste lots actuels */}
          {sessionLots.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <LotsPanel
                sessionLots={sessionLots}
                wins={wins}
                lotIndex={lotIndex}
                phase={phase}
                onRemove={handleRemoveLot}
                onReorder={handleReorder}
              />
            </div>
          )}

          {lotError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>{lotError}</span>
            </div>
          )}

          {/* Bouton ajouter */}
          <button
            onClick={() => setShowLotPicker(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}
          >
            <Plus size={14} />
            {showLotPicker ? 'Fermer le catalogue' : 'Ajouter un lot'}
          </button>

          {/* Picker catalogue */}
          {showLotPicker && (
            <div style={{ marginTop: '1rem', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)' }}>
                Catalogue — {availableLots.length} lot{availableLots.length > 1 ? 's' : ''} disponible{availableLots.length > 1 ? 's' : ''}
              </div>

              {availableLots.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-4)' }}>
                  Tous les lots disponibles ont été ajoutés.
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {availableLots.map((lot, i) => {
                    const cc = CATEGORIE_COLORS[lot.categorie] ?? { bg: '#f0f7f8', color: '#2c6976' }
                    const isAdding = addingLotId === lot.id

                    return (
                      <div
                        key={lot.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.625rem 1rem',
                          borderBottom: i < availableLots.length - 1 ? '1px solid var(--border)' : 'none',
                          background: 'white',
                        }}
                      >
                        {/* Catégorie badge */}
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 9999, background: cc.bg, color: cc.color, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                          {CATEGORIE_LABELS[lot.categorie] ?? lot.categorie}
                        </span>

                        {/* Nom + valeur */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lot.nom}
                          </div>
                          {lot.valeur_ar && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                              {lot.valeur_ar.toLocaleString('fr-FR')} Ar · stock: {lot.stock}
                            </div>
                          )}
                        </div>

                        {/* Bouton ajouter */}
                        <button
                          onClick={() => handleAddLot(lot.id)}
                          disabled={isAdding}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: isAdding ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, whiteSpace: 'nowrap', minWidth: 90 }}
                        >
                          {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Ajouter
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grille : zone tirage + lots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* Zone de tirage */}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>

          {/* Progression */}
          {sessionLots.length > 0 && phase !== 'completed' && (
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
              {sessionLots.map((sl, i) => {
                const won = wins.some(w => w.sessionLotId === sl.id)
                return <div key={sl.id} style={{ flex: i === lotIndex ? 3 : 1, height: 6, borderRadius: 9999, background: won ? '#4ade80' : i === lotIndex ? 'var(--brand)' : 'var(--bg-2)', transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)' }} />
              })}
            </div>
          )}

          {/* Lot courant */}
          {currentLot && phase !== 'completed' && (
            <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                Lot {lotIndex + 1} / {sessionLots.length}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
                {currentLot.lot?.nom}
              </div>
              {currentLot.lot?.categorie && (() => {
                const cc = CATEGORIE_COLORS[currentLot.lot!.categorie] ?? { bg: '#f0f7f8', color: '#2c6976' }
                return (
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: cc.bg, color: cc.color }}>
                    {CATEGORIE_LABELS[currentLot.lot!.categorie]}
                  </span>
                )
              })()}
            </div>
          )}

          {/* Draw area */}
          {phase === 'ready' && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              {sessionLots.length === 0 ? (
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>
                  Ajoutez au moins un lot pour commencer le tirage.
                </div>
              ) : (
                <>
                  <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                    {eligibleCount} membres éligibles{ticketsActifs ? ` · ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={handleToggleOverride} disabled={isPendingOverride} style={{ padding: '0.2rem 0.625rem', borderRadius: 9999, border: `1px solid ${override ? '#bfdbfe' : 'var(--border)'}`, background: override ? '#eff6ff' : 'transparent', color: override ? '#1d4ed8' : 'var(--text-4)', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {override ? '🔓 Tous éligibles' : '🔒 Par niveau'}
                    </button>
                    <button onClick={handleToggleTickets} disabled={isPendingTickets} style={{ padding: '0.2rem 0.625rem', borderRadius: 9999, border: `1px solid ${ticketsActifs ? '#fde68a' : 'var(--border)'}`, background: ticketsActifs ? '#fef3c7' : 'transparent', color: ticketsActifs ? '#92400e' : 'var(--text-4)', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {ticketsActifs ? '🎫 Tickets ON' : '🎫 Tickets OFF'}
                    </button>
                  </div>
                  {/* Re-éligibilité inline */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-4)', fontWeight: 600, marginRight: '0.25rem' }}>🔁 Gains max :</span>
                    {[0, 1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => handleSetMaxWins(n)}
                        disabled={isPendingMaxWins}
                        style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, border: `1px solid ${maxWinsLocal === n ? '#f0abfc' : 'var(--border)'}`, background: maxWinsLocal === n ? '#fdf4ff' : 'transparent', color: maxWinsLocal === n ? '#7e22ce' : 'var(--text-4)', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms' }}
                      >
                        {n === 0 ? '1 seul' : `${n + 1}×`}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => draw()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2.5rem', borderRadius: '0.875rem', border: 'none', background: 'var(--brand)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,45,53,0.25)' }}>
                    <Play size={20} /> Tirer au sort
                  </button>
                </>
              )}
            </div>
          )}

          {phase === 'animating' && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, color: 'var(--text-3)', letterSpacing: '-0.03em', minHeight: '1.2em', userSelect: 'none' }}>
                {animName}
              </div>
            </div>
          )}

          {phase === 'winner' && winner && (
            <div className="card animate-scale-in" style={{ padding: '1.75rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900, color: 'var(--brand)', letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>
                  {winner?.prenom} {winner?.nom ?? ''}
                </div>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>
                  {winner?.email} · Niveau {PALIER_LABELS[((winner?.niveau ?? 'membre') as Palier)]}
                </div>
              </div>
              {/* Confirmation sans email */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleDashboardConfirm}
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '0.75rem', background: '#16a34a', border: 'none', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={18} /> Confirmer
                </button>
                <button
                  onClick={() => winner && draw(winner.id)}
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '0.75rem', background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <RotateCcw size={16} /> Re-tirer
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  onClick={skipLot}
                  style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', transition: 'all 150ms ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                >
                  <ChevronRight size={13} /> Passer ce lot sans gagnant
                </button>
              </div>
            </div>
          )}

          {phase === 'completed' && (
            <div className="card animate-scale-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Trophy size={22} style={{ color: 'var(--accent)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--text-1)', margin: 0 }}>
                  Tirage terminé — {wins.length} gagnant{wins.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {wins.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-0)', borderRadius: '0.625rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>{w.memberName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.lotNom}</div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section membres éligibles */}
          {phase !== 'completed' && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => { setShowMembres(v => !v); setMembresPage(1) }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: showMembres ? '0.75rem 0.75rem 0 0' : '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}
              >
                <Users size={15} style={{ color: 'var(--brand-light)', flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)' }}>Membres éligibles</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>{eligibleCount}</span>
                {showMembres ? <ChevronUp size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />}
              </button>

              {showMembres && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 0.75rem 0.75rem', overflow: 'hidden', background: 'white' }}>
                  {membresSlice.map((m, i) => {
                    const memberWins  = wins.filter(w => w.memberId === m.id).length
                    const isWinner    = memberWins > 0
                    const nbTickets   = ticketsActifs ? PALIER_CHANCES[(m.niveau ?? 'membre') as Palier] : null

                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', borderBottom: i < membresSlice.length - 1 ? '1px solid var(--border)' : 'none', background: isWinner ? '#f0fdf4' : 'white', opacity: isWinner ? 0.7 : 1 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: isWinner ? '#dcfce7' : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: isWinner ? '#16a34a' : 'var(--brand)', flexShrink: 0 }}>
                          {isWinner ? '🏆' : `${m.prenom.charAt(0)}${(m.nom ?? '').charAt(0)}`}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.prenom} {m.nom ?? ''}
                            {isWinner && <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: '#16a34a', fontWeight: 700 }}>· {memberWins} gain{memberWins > 1 ? 's' : ''}</span>}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                        </div>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--brand-light)', background: 'rgba(51,128,141,0.08)', padding: '0.15rem 0.4rem', borderRadius: 9999, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                          {ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape}
                        </span>
                        {nbTickets !== null && nbTickets > 1 && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '0.1rem 0.375rem', borderRadius: 9999, flexShrink: 0 }}>×{nbTickets}</span>
                        )}
                      </div>
                    )
                  })}
                  {totalMembresPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                      <button onClick={() => setMembresPage(p => Math.max(1, p - 1))} disabled={membresPage === 1} style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: membresPage === 1 ? 'var(--border)' : 'var(--text-2)', cursor: membresPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>‹</button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontFamily: 'var(--font-body)', padding: '0 0.25rem' }}>{membresPage} / {totalMembresPages}</span>
                      <button onClick={() => setMembresPage(p => Math.min(totalMembresPages, p + 1))} disabled={membresPage === totalMembresPages} style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: membresPage === totalMembresPages ? 'var(--border)' : 'var(--text-2)', cursor: membresPage === totalMembresPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>›</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel lots (droite) — visible uniquement pendant le tirage */}
        {phase !== 'ready' && (
          <div style={{ flex: '1 1 280px', minWidth: 0, width: '100%' }}>
            <LotsPanel sessionLots={sessionLots} wins={wins} lotIndex={lotIndex} phase={phase} />
          </div>
        )}
      </div>
    </div>
  )
}
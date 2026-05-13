'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
  Trophy, AlertCircle, ChevronRight, Users, ChevronDown, ChevronUp,
  Plus, Trash2, PackageOpen, Loader2,
} from 'lucide-react'
import type { Member, Lot, TirageTypeConfig } from '@/types'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, ETAPE_LABELS } from '@/types'
import type { LotCategorie, Etape } from '@/types'
import { addSessionLot, removeSessionLot } from '@/app/actions/tirages'

type Phase = 'ready' | 'animating' | 'winner' | 'completed'

const MEMBRES_PER_PAGE = 10

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  status: string
  lot: { id: string; nom: string; categorie: LotCategorie; valeur_ar?: number | null } | null
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
  session: { id: string; type: string; label?: string | null; status: string }
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
function LotsPanel({
  sessionLots, wins, lotIndex, phase,
  onRemove, dark = false,
}: {
  sessionLots: SessionLot[]
  wins: Win[]
  lotIndex: number
  phase: Phase
  onRemove?: (id: string) => void
  dark?: boolean
}) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : 'white',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
      borderRadius: '0.875rem', overflow: 'hidden',
      width: '100%', minWidth: 0, boxSizing: 'border-box' as const,
    }}>
      <div style={{
        padding: '0.875rem 1rem',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
        background: dark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)',
      }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: dark ? 'rgba(255,255,255,0.4)' : 'var(--text-4)' }}>
          Lots de la session ({sessionLots.length})
        </span>
      </div>

      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {sessionLots.map((sl, i) => {
          const win       = wins.find(w => w.sessionLotId === sl.id)
          const isCurrent = i === lotIndex && phase !== 'completed'
          const isDone    = !!win
          const cc        = CATEGORIE_COLORS[sl.lot?.categorie as LotCategorie] ?? { bg: '#f0f7f8', color: '#2c6976' }

          return (
            <div
              key={sl.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 1rem',
                borderBottom: i < sessionLots.length - 1
                  ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}` : 'none',
                background: isCurrent
                  ? dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,45,53,0.05)' : 'transparent',
                transition: 'background 300ms ease',
              }}
            >
              {/* Numéro */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: isDone ? '#dcfce7' : isCurrent ? 'var(--brand)' : dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-2)',
                color: isDone ? '#16a34a' : isCurrent ? 'white' : dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)',
                fontSize: '0.6875rem', fontWeight: 700, transition: 'all 300ms ease',
              }}>
                {isDone ? '✓' : sl.ordre}
              </div>

              {/* Nom + gagnant */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: isDone ? 500 : 600,
                  color: isDone ? dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)'
                    : isCurrent ? dark ? 'white' : 'var(--text-1)'
                    : dark ? 'rgba(255,255,255,0.5)' : 'var(--text-3)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'all 300ms ease',
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
              {sl.lot?.categorie && (
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em', flexShrink: 0,
                  color: dark ? 'rgba(255,255,255,0.25)' : cc.color,
                }}>
                  {CATEGORIE_LABELS[sl.lot.categorie] ?? sl.lot.categorie}
                </span>
              )}

              {/* Supprimer (uniquement si phase = ready et callback fourni) */}
              {onRemove && phase === 'ready' && !isDone && (
                <button
                  onClick={() => onRemove(sl.id)}
                  style={{
                    width: 24, height: 24, borderRadius: '0.375rem', border: 'none',
                    background: 'transparent', color: 'var(--text-4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                >
                  <Trash2 size={12} />
                </button>
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Compat backward : soiree = tirage équitable (pas de pondération)
  const isSoiree = session.type === 'soiree_16mai'

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
    if (isSoiree) {
      return members.filter(m => {
        if (excludeSet.has(m.id)) return false
        return wins.filter(w => w.memberId === m.id).length < 2
      })
    }
    const winnerIds = new Set(wins.map(w => w.memberId))
    return members
      .filter(m => !winnerIds.has(m.id) && !excludeSet.has(m.id))
      .flatMap(m => {
        const count = commandes.filter(c => c.member_id === m.id && c.statut === 'active').length
        return Array(count).fill(m) as Member[]
      })
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
      ...Array(28).fill(55), ...Array(12).fill(100),
      ...Array(8).fill(190), ...Array(5).fill(360),
      ...Array(3).fill(580), 900,
    ]
    let step = 0

    function tick() {
      if (step < delays.length - 1) {
        setAnimName(allNames[Math.floor(Math.random() * allNames.length)])
        step++
        timerRef.current = setTimeout(tick, delays[step])
      } else {
        setAnimName(`${picked.prenom}${picked.nom ? ' ' + picked.nom : ''}`)
        setPhase('winner')
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

  function toggleProjector() {
    if (!projector) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setProjector(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setProjector(false)
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const displayName = session.label?.trim() || TYPE_LABELS[session.type] || session.type

  /* ── Mode Projecteur ── */
  if (projector) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--brand)', display: 'flex', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
        <div style={{ width: 260, flexShrink: 0, padding: '5rem 1.25rem 2rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <LotsPanel sessionLots={sessionLots} wins={wins} lotIndex={lotIndex} phase={phase} dark />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 2rem', position: 'relative' }}>
          <button onClick={toggleProjector} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
            <Minimize2 size={18} />
          </button>

          {currentLot && phase !== 'completed' && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
                {displayName} · Lot {lotIndex + 1} / {sessionLots.length}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 1.5rem)', color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
                {currentLot.lot?.nom}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', width: '100%' }}>
            {phase === 'animating' && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 7rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.3)', lineHeight: 1, userSelect: 'none' }}>
                {animName}
              </div>
            )}
            {phase === 'winner' && winner && (
              <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 11vw, 8rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'white', lineHeight: 1, marginBottom: '0.5rem', textShadow: '0 0 80px rgba(255,255,255,0.12)' }}>
                  {winner.prenom}
                </div>
                {winner.nom && (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.55)', marginBottom: '2rem' }}>
                    {winner.nom}
                  </div>
                )}
                <VerifyPanel verifyEmail={verifyEmail} verifyError={verifyError} dark onEmailChange={v => { setVerifyEmail(v); setVerifyError(null) }} onConfirm={confirmWin} onRedraw={() => draw(winner.id)} />
              </div>
            )}
            {phase === 'ready' && (
              <div>
                <button onClick={() => draw()} style={{ padding: '1.5rem 3rem', borderRadius: '1rem', background: 'var(--accent)', border: 'none', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.25rem, 3vw, 2rem)', letterSpacing: '-0.02em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(217,119,6,0.4)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 auto' }}>
                  <Play size={28} /> Tirer au sort
                </button>
                <div style={{ marginTop: '1.25rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
                  {eligibleCount} membres · {ticketCount} ticket{ticketCount > 1 ? 's' : ''}
                </div>
              </div>
            )}
            {phase === 'completed' && (
              <div>
                <Trophy size={60} style={{ color: 'var(--accent)', margin: '0 auto 1.5rem', display: 'block' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: 'white', letterSpacing: '-0.04em' }}>
                  Tirage terminé !
                </div>
              </div>
            )}
          </div>
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
            {!isSoiree && ` · ${ticketCount} tickets`}
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
                      / {budgetMax.toLocaleString('fr-FR')} Ar max
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
                    {eligibleCount} membres éligibles{!isSoiree && ` · ${ticketCount} tickets`}
                  </div>
                  <div style={{ color: 'var(--text-4)', fontSize: '0.8125rem', marginBottom: '1.75rem' }}>
                    {isSoiree ? 'Tirage équitable' : 'Pondéré par commandes'}
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
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900, color: 'var(--brand)', letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>
                  {winner.prenom} {winner.nom ?? ''}
                </div>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>
                  {winner.email}
                  {!isSoiree && <> · {commandes.filter(c => c.member_id === winner.id).length} commande{commandes.filter(c => c.member_id === winner.id).length > 1 ? 's' : ''}</>}
                </div>
              </div>
              <VerifyPanel verifyEmail={verifyEmail} verifyError={verifyError} dark={false} onEmailChange={v => { setVerifyEmail(v); setVerifyError(null) }} onConfirm={confirmWin} onRedraw={() => draw(winner.id)} />
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
                    const nbTickets   = !isSoiree ? commandes.filter(c => c.member_id === m.id && c.statut === 'active').length : null

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
                        {nbTickets !== null && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-4)', flexShrink: 0 }}>×{nbTickets}</span>
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
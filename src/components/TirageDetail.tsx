'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
  Trophy, AlertCircle, ChevronRight, Users, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Member } from '@/types'
import { CATEGORIE_LABELS, ETAPE_LABELS } from '@/types'
import type { LotCategorie, Etape } from '@/types'

type Phase = 'ready' | 'animating' | 'winner' | 'completed'

const MEMBRES_PER_PAGE = 10

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  status: string
  lot: { id: string; nom: string; categorie: LotCategorie }
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
  session: { id: string; type: string; status: string }
  sessionId: string
  initialSessionLots: SessionLot[]
  initialWins: Win[]
  members: Member[]
  commandes: Commande[]
}

const TYPE_LABELS: Record<string, string> = {
  soiree_16mai:  'Soirée 16 Mai',
  tirage_27mai:  '27 Mai',
  mensuel:       'Mensuel',
  trimestriel:   'Trimestriel',
  semestriel:    'Semestriel',
}

/* ── Panel lots ── */
function LotsPanel({
  sessionLots, wins, lotIndex, phase, dark = false,
}: {
  sessionLots: SessionLot[]
  wins: Win[]
  lotIndex: number
  phase: Phase
  dark?: boolean
}) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : 'white',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
      borderRadius: '0.875rem',
      overflow: 'hidden',
      width: '100%',          // ← ajouter
      minWidth: 0,            // ← ajouter
      boxSizing: 'border-box' as const, // ← ajouter
    }}>
      <div style={{
        padding: '0.875rem 1rem',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
        background: dark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)',
      }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: dark ? 'rgba(255,255,255,0.4)' : 'var(--text-4)',
        }}>
          Lots de la session ({sessionLots.length})
        </span>
      </div>

      {/* Scroll sur les lots */}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {sessionLots.map((sl, i) => {
          const win       = wins.find(w => w.sessionLotId === sl.id)
          const isCurrent = i === lotIndex && phase !== 'completed'
          const isDone    = !!win

          return (
            <div
              key={sl.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 1rem',
                borderBottom: i < sessionLots.length - 1
                  ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`
                  : 'none',
                background: isCurrent
                  ? dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,45,53,0.05)'
                  : 'transparent',
                transition: 'background 300ms ease',
              }}
            >
              {/* Numéro / statut */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: isDone ? '#dcfce7' : isCurrent ? 'var(--brand)' : dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-2)',
                color: isDone ? '#16a34a' : isCurrent ? 'white' : dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)',
                fontSize: '0.6875rem', fontWeight: 700,
                transition: 'all 300ms ease',
              }}>
                {isDone ? '✓' : sl.ordre}
              </div>

              {/* Nom + gagnant */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: isDone ? 500 : 600,
                  color: isDone
                    ? dark ? 'rgba(255,255,255,0.3)' : 'var(--text-4)'
                    : isCurrent ? dark ? 'white' : 'var(--text-1)'
                    : dark ? 'rgba(255,255,255,0.5)' : 'var(--text-3)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'all 300ms ease',
                }}>
                  {sl.lot?.nom}
                </div>
                {win && (
                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 700,
                    color: dark ? '#4ade80' : '#16a34a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    🏆 {win.memberName}
                  </div>
                )}
                {isCurrent && !isDone && (
                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: dark ? 'rgba(255,255,255,0.4)' : 'var(--brand-light)',
                  }}>
                    ← En cours
                  </div>
                )}
              </div>

              {/* Catégorie */}
              {sl.lot?.categorie && (
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: dark ? 'rgba(255,255,255,0.25)' : 'var(--text-4)',
                  flexShrink: 0,
                }}>
                  {CATEGORIE_LABELS[sl.lot.categorie] ?? sl.lot.categorie}
                </span>
              )}
            </div>
          )
        })}
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
        type="email"
        placeholder="email@exemple.com"
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
}: Props) {
  const [phase, setPhase] = useState<Phase>(
    initialSessionLots.length > 0 && initialWins.length >= initialSessionLots.length
      ? 'completed' : 'ready'
  )
  const [sessionLots]           = useState(initialSessionLots)
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSoiree = session.type === 'soiree_16mai'

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

  // Liste membres éligibles dédupliquée + paginée
  const eligibleIds      = new Set(currentPool.map(m => m.id))
  const eligibleMembers  = members.filter(m => eligibleIds.has(m.id))
  const totalMembresPages = Math.ceil(eligibleMembers.length / MEMBRES_PER_PAGE)
  const membresSlice     = eligibleMembers.slice(
    (membresPage - 1) * MEMBRES_PER_PAGE,
    membresPage * MEMBRES_PER_PAGE
  )

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
      memberId:    winner.id,
      memberName:  `${winner.prenom}${winner.nom ? ' ' + winner.nom : ''}`,
      lotNom:      currentSL.lot?.nom ?? '',
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

  /* ── Mode Projecteur ── */
  if (projector) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--brand)',
        display: 'flex',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
      }}>
        {/* Panel lots à gauche */}
        <div style={{
          width: 260, flexShrink: 0,
          padding: '5rem 1.25rem 2rem',
          overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}>
          <LotsPanel sessionLots={sessionLots} wins={wins} lotIndex={lotIndex} phase={phase} dark />
        </div>

        {/* Zone centrale */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 2rem', position: 'relative' }}>
          <button onClick={toggleProjector} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
            <Minimize2 size={18} />
          </button>

          {currentLot && phase !== 'completed' && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
                {TYPE_LABELS[session.type] ?? session.type} · Lot {lotIndex + 1} / {sessionLots.length}
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
                <VerifyPanel
                  verifyEmail={verifyEmail} verifyError={verifyError} dark
                  onEmailChange={v => { setVerifyEmail(v); setVerifyError(null) }}
                  onConfirm={confirmWin}
                  onRedraw={() => draw(winner.id)}
                />
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{TYPE_LABELS[session.type] ?? session.type}</h1>
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
              {currentLot.lot?.categorie && (
                <span style={{ display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: currentLot.lot.categorie === 'tres_gros' ? '#ede9fe' : currentLot.lot.categorie === 'gros' ? '#fef3c7' : '#f0f7f8', color: currentLot.lot.categorie === 'tres_gros' ? '#5b21b6' : currentLot.lot.categorie === 'gros' ? '#92400e' : '#2c6976' }}>
                  {CATEGORIE_LABELS[currentLot.lot.categorie]}
                </span>
              )}
            </div>
          )}

          {/* Draw area */}
          {phase === 'ready' && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                {eligibleCount} membres éligibles{!isSoiree && ` · ${ticketCount} tickets`}
              </div>
              <div style={{ color: 'var(--text-4)', fontSize: '0.8125rem', marginBottom: '1.75rem' }}>
                {isSoiree ? 'Tirage équitable' : 'Pondéré par commandes'}
              </div>
              <button onClick={() => draw()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2.5rem', borderRadius: '0.875rem', border: 'none', background: 'var(--brand)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,45,53,0.25)' }}>
                <Play size={20} /> Tirer au sort
              </button>
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
              <VerifyPanel
                verifyEmail={verifyEmail} verifyError={verifyError} dark={false}
                onEmailChange={v => { setVerifyEmail(v); setVerifyError(null) }}
                onConfirm={confirmWin}
                onRedraw={() => draw(winner.id)}
              />
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

          {/* ── Section membres éligibles (dashboard uniquement) ── */}
          {phase !== 'completed' && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => { setShowMembres(v => !v); setMembresPage(1) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'var(--bg-1)', border: '1px solid var(--border)',
                  borderRadius: showMembres ? '0.75rem 0.75rem 0 0' : '0.75rem',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 150ms ease',
                }}
              >
                <Users size={15} style={{ color: 'var(--brand-light)', flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)' }}>
                  Membres éligibles
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>
                  {eligibleCount}
                </span>
                {showMembres
                  ? <ChevronUp size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                  : <ChevronDown size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                }
              </button>

              {showMembres && (
                <div style={{
                  border: '1px solid var(--border)', borderTop: 'none',
                  borderRadius: '0 0 0.75rem 0.75rem',
                  overflow: 'hidden',
                  background: 'white',
                }}>
                  {membresSlice.map((m, i) => {
                    const memberWins  = wins.filter(w => w.memberId === m.id).length
                    const isWinner    = memberWins > 0
                    const nbTickets   = !isSoiree
                      ? commandes.filter(c => c.member_id === m.id && c.statut === 'active').length
                      : null

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.625rem 1rem',
                          borderBottom: i < membresSlice.length - 1 ? '1px solid var(--border)' : 'none',
                          background: isWinner ? '#f0fdf4' : 'white',
                          opacity: isWinner ? 0.7 : 1,
                        }}
                      >
                        {/* Avatar */}
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: isWinner ? '#dcfce7' : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: isWinner ? '#16a34a' : 'var(--brand)', flexShrink: 0 }}>
                          {isWinner ? '🏆' : `${m.prenom.charAt(0)}${(m.nom ?? '').charAt(0)}`}
                        </div>

                        {/* Nom */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.prenom} {m.nom ?? ''}
                            {isWinner && (
                              <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: '#16a34a', fontWeight: 700 }}>
                                · {memberWins} gain{memberWins > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Étape */}
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--brand-light)', background: 'rgba(51,128,141,0.08)', padding: '0.15rem 0.4rem', borderRadius: 9999, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                          {ETAPE_LABELS[m.etape as Etape]?.split('(')[0].trim() ?? m.etape}
                        </span>

                        {/* Tickets (tirage pondéré) */}
                        {nbTickets !== null && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-4)', flexShrink: 0 }}>
                            ×{nbTickets}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Pagination membres */}
                  {totalMembresPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                      <button
                        onClick={() => setMembresPage(p => Math.max(1, p - 1))}
                        disabled={membresPage === 1}
                        style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: membresPage === 1 ? 'var(--border)' : 'var(--text-2)', cursor: membresPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
                      >
                        ‹
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontFamily: 'var(--font-body)', padding: '0 0.25rem' }}>
                        {membresPage} / {totalMembresPages}
                      </span>
                      <button
                        onClick={() => setMembresPage(p => Math.min(totalMembresPages, p + 1))}
                        disabled={membresPage === totalMembresPages}
                        style={{ width: 28, height: 28, borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', color: membresPage === totalMembresPages ? 'var(--border)' : 'var(--text-2)', cursor: membresPage === totalMembresPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel lots (droite) */}
        <div style={{ flex: '1 1 280px', minWidth: 0, width: '100%' }}>
          <LotsPanel
            sessionLots={sessionLots}
            wins={wins}
            lotIndex={lotIndex}
            phase={phase}
          />
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
  Trophy, AlertCircle, Users, Ticket, ChevronRight
} from 'lucide-react'
import type { Member } from '@/types'
import { CATEGORIE_LABELS } from '@/types'
import type { LotCategorie } from '@/types'

type Phase = 'ready' | 'animating' | 'winner' | 'completed'

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  status: string
  lot: {
    id: string
    nom: string
    categorie: LotCategorie
  }
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

export default function TirageDetail({
  session, sessionId, initialSessionLots, initialWins, members, commandes,
}: Props) {
  const [phase, setPhase]         = useState<Phase>(
    initialSessionLots.length > 0 && initialWins.length >= initialSessionLots.length
      ? 'completed'
      : 'ready'
  )
  const [sessionLots]             = useState(initialSessionLots)
  const [lotIndex, setLotIndex]   = useState(() => {
    const wonIds = new Set(initialWins.map(w => w.sessionLotId))
    const idx = initialSessionLots.findIndex(sl => !wonIds.has(sl.id))
    return idx === -1 ? initialSessionLots.length - 1 : idx
  })
  const [wins, setWins]           = useState<Win[]>(initialWins)
  const [animName, setAnimName]   = useState('')
  const [winner, setWinner]       = useState<Member | null>(null)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [projector, setProjector] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSoiree = session.type === 'soiree_16mai'

  // Construire le pool éligible
  function getPool(excludeIds: string[] = []): Member[] {
    const excludeSet = new Set(excludeIds)

    if (isSoiree) {
      // Soirée : tous les membres, max 2 gains
      return members.filter(m => {
        if (excludeSet.has(m.id)) return false
        return wins.filter(w => w.memberId === m.id).length < 2
      })
    } else {
      // Autres : pondéré par commandes, max 1 gain par personne
      const winnerIds = new Set(wins.map(w => w.memberId))
      return members
        .filter(m => !winnerIds.has(m.id) && !excludeSet.has(m.id))
        .flatMap(m => {
          const count = commandes.filter(c => c.member_id === m.id && c.statut === 'active').length
          return Array(count).fill(m) as Member[]
        })
    }
  }

  const currentPool    = getPool()
  const currentLot     = sessionLots[lotIndex]
  const eligibleCount  = new Set(currentPool.map(m => m.id)).size
  const ticketCount    = currentPool.length

  // Lancer le tirage
  function draw(excludeId?: string) {
    const pool = getPool(excludeId ? [excludeId] : [])
    if (pool.length === 0) { setError('Aucun membre éligible.'); return }

    const picked    = pool[Math.floor(Math.random() * pool.length)]
    const allNames  = Array.from(new Set(members.map(m =>
      `${m.prenom}${m.nom ? ' ' + m.nom : ''}`
    )))

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

  // Confirmer le gain
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

    // Sauvegarder en DB
    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id:     sessionId,
      session_lot_id: currentSL.id,
      member_id:      winner.id,
    }).then(({ error }) => { if (error) console.error(error) })

    if (lotIndex < sessionLots.length - 1) {
      setLotIndex(i => i + 1)
      setWinner(null)
      setPhase('ready')
    } else {
      supabase.from('tirage_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId).then(() => {})
      setPhase('completed')
    }
  }

  // Plein écran
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

  /* ── Panel de vérification (réutilisé dans les 2 modes) ── */
  const VerifyPanel = ({ dark = false }: { dark?: boolean }) => (
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
        onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null) }}
        onKeyDown={e => { if (e.key === 'Enter') confirmWin() }}
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
        <button
          onClick={confirmWin}
          style={{
            flex: 1, padding: '0.75rem', borderRadius: '0.625rem',
            background: '#16a34a', border: 'none', color: 'white',
            fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={16} /> Confirmer
        </button>
        <button
          onClick={() => draw(winner!.id)}
          style={{
            padding: '0.75rem 1rem', borderRadius: '0.625rem',
            background: dark ? 'rgba(255,255,255,0.1)' : 'var(--bg-2)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
            color: dark ? 'rgba(255,255,255,0.7)' : 'var(--text-2)',
            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}
        >
          <RotateCcw size={14} /> Re-tirer
        </button>
      </div>
    </div>
  )

  /* ── Mode Projecteur ── */
  if (projector) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--brand)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Quitter */}
        <button onClick={toggleProjector} style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer',
          color: 'rgba(255,255,255,0.6)', display: 'flex',
        }}>
          <Minimize2 size={18} />
        </button>

        {/* Lot actuel */}
        {currentLot && phase !== 'completed' && (
          <div style={{ position: 'absolute', top: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
              {TYPE_LABELS[session.type] ?? session.type} · Lot {lotIndex + 1} / {sessionLots.length}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 1.5rem)', color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
              {currentLot.lot?.nom}
            </div>
          </div>
        )}

        {/* Zone centrale */}
        <div style={{ textAlign: 'center', padding: '0 2rem', width: '100%', maxWidth: 700 }}>

          {phase === 'animating' && (
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 7rem)',
              fontWeight: 900, letterSpacing: '-0.05em',
              color: 'rgba(255,255,255,0.3)', lineHeight: 1, userSelect: 'none',
            }}>
              {animName}
            </div>
          )}

          {phase === 'winner' && winner && (
            <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 11vw, 8rem)',
                fontWeight: 900, letterSpacing: '-0.05em', color: 'white',
                lineHeight: 1, marginBottom: '0.5rem',
                textShadow: '0 0 80px rgba(255,255,255,0.12)',
              }}>
                {winner.prenom}
              </div>
              {winner.nom && (
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 700, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.55)',
                  marginBottom: '2rem',
                }}>
                  {winner.nom}
                </div>
              )}
              <VerifyPanel dark />
            </div>
          )}

          {phase === 'ready' && (
            <div>
              <button
                onClick={() => draw()}
                style={{
                  padding: '1.5rem 3rem', borderRadius: '1rem',
                  background: 'var(--accent)', border: 'none', color: 'white',
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 'clamp(1.25rem, 3vw, 2rem)', letterSpacing: '-0.02em',
                  cursor: 'pointer', boxShadow: '0 8px 32px rgba(217,119,6,0.4)',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  margin: '0 auto',
                }}
              >
                <Play size={28} /> Tirer au sort
              </button>
              <div style={{ marginTop: '1.25rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>
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

        {/* Progression */}
        {sessionLots.length > 0 && phase !== 'completed' && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem' }}>
            {sessionLots.map((sl, i) => {
              const won = wins.some(w => w.sessionLotId === sl.id)
              return <div key={sl.id} style={{
                width: i === lotIndex ? 28 : 8, height: 8, borderRadius: 9999,
                background: won ? '#4ade80' : i === lotIndex ? 'white' : 'rgba(255,255,255,0.2)',
                transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)',
              }} />
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── Mode Dashboard ── */
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{TYPE_LABELS[session.type] ?? session.type}</h1>
          <p className="page-subtitle">{sessionLots.length} lot{sessionLots.length > 1 ? 's' : ''} · {eligibleCount} membres éligibles · {ticketCount} ticket{ticketCount > 1 ? 's' : ''}</p>
        </div>
        {phase !== 'completed' && (
          <button
            onClick={toggleProjector}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
              background: 'var(--brand)', color: 'white', border: 'none',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Maximize2 size={15} /> Mode projecteur
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', maxWidth: 540 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Progression */}
      {sessionLots.length > 0 && phase !== 'completed' && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', maxWidth: 540 }}>
          {sessionLots.map((sl, i) => {
            const won = wins.some(w => w.sessionLotId === sl.id)
            return <div key={sl.id} style={{
              flex: i === lotIndex ? 3 : 1, height: 6, borderRadius: 9999,
              background: won ? '#4ade80' : i === lotIndex ? 'var(--brand)' : 'var(--bg-2)',
              transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)',
            }} />
          })}
        </div>
      )}

      {/* Lot courant */}
      {currentLot && phase !== 'completed' && (
        <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 540, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
            Lot {lotIndex + 1} / {sessionLots.length}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
            {currentLot.lot?.nom}
          </div>
          <span style={{
            display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 9999,
            fontSize: '0.6875rem', fontWeight: 700,
            background: currentLot.lot?.categorie === 'tres_gros' ? '#ede9fe' : currentLot.lot?.categorie === 'gros' ? '#fef3c7' : '#f0f7f8',
            color: currentLot.lot?.categorie === 'tres_gros' ? '#5b21b6' : currentLot.lot?.categorie === 'gros' ? '#92400e' : '#2c6976',
          }}>
            {CATEGORIE_LABELS[currentLot.lot?.categorie as LotCategorie] ?? currentLot.lot?.categorie}
          </span>
        </div>
      )}

      {/* Zone de tirage */}
      <div style={{ maxWidth: 540 }}>
        {phase === 'ready' && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
              {eligibleCount} membres éligibles
              {!isSoiree && ` · ${ticketCount} tickets dans l'urne`}
            </div>
            <div style={{ color: 'var(--text-4)', fontSize: '0.8125rem', marginBottom: '1.75rem' }}>
              {isSoiree
                ? 'Tirage équitable — chaque inscrit a 1 chance'
                : 'Tirage pondéré — 1 commande = 1 chance supplémentaire'
              }
            </div>
            <button
              onClick={() => draw()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
                padding: '1rem 2.5rem', borderRadius: '0.875rem',
                border: 'none', background: 'var(--brand)', color: 'white',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem',
                letterSpacing: '-0.02em', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(15,45,53,0.25)',
              }}
            >
              <Play size={20} /> Tirer au sort
            </button>
          </div>
        )}

        {phase === 'animating' && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              fontWeight: 800, color: 'var(--text-3)', letterSpacing: '-0.03em',
              minHeight: '1.2em', userSelect: 'none',
            }}>
              {animName}
            </div>
          </div>
        )}

        {phase === 'winner' && winner && (
          <div className="card animate-scale-in" style={{ padding: '1.75rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)',
                fontWeight: 900, color: 'var(--brand)', letterSpacing: '-0.04em',
                marginBottom: '0.375rem',
              }}>
                {winner.prenom} {winner.nom ?? ''}
              </div>
              <div style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>
                {winner.email}
                {!isSoiree && (
                  <> · {commandes.filter(c => c.member_id === winner.id).length} commande{commandes.filter(c => c.member_id === winner.id).length > 1 ? 's' : ''}</>
                )}
              </div>
            </div>
            <VerifyPanel />
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
      </div>
    </div>
  )
}
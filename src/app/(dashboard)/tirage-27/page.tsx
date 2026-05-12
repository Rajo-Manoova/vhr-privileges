'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
  Trophy, Loader2, AlertCircle, Users, Ticket, Calendar
} from 'lucide-react'
import type { Member, Lot } from '@/types'

type Phase = 'loading' | 'setup' | 'starting' | 'ready' | 'animating' | 'winner' | 'completed'

interface Commande {
  id: string
  member_id: string
  statut: string
}

interface Win {
  memberId: string
  memberName: string
  lotNom: string
  sessionLotId: string
}

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  lot: Lot
}

export default function Tirage27Page() {
  const [phase, setPhase]         = useState<Phase>('loading')
  const [members, setMembers]     = useState<Member[]>([])
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [lots27, setLots27]       = useState<Lot[]>([])
  const [sessionLots, setSessionLots] = useState<SessionLot[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lotIndex, setLotIndex]   = useState(0)
  const [wins, setWins]           = useState<Win[]>([])
  const [animName, setAnimName]   = useState('')
  const [winner, setWinner]       = useState<Member | null>(null)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [projector, setProjector] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Chargement ── */
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: m }, { data: c }, { data: l }] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('commandes').select('id, member_id, statut').eq('statut', 'active'),
        supabase.from('lots').select('*').eq('palier', 'tirage_27mai').eq('disponible', true).order('created_at'),
      ])
      setMembers(m ?? [])
      setCommandes(c ?? [])
      setLots27(l ?? [])
      setPhase('setup')
    }
    load()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  /* ── Pool de tickets pondéré ── */
  function buildTicketPool(excludeWinnerIds: string[] = []) {
    const winnerSet = new Set(excludeWinnerIds)
    return members
      .filter(m => !winnerSet.has(m.id))
      .flatMap(m => {
        const count = commandes.filter(c => c.member_id === m.id).length
        return Array(count).fill(m) as Member[]
      })
  }

  /* ── Stats du pool ── */
  const allTickets   = buildTicketPool()
  const eligibleCount = new Set(commandes.map(c => c.member_id)).size
  const totalTickets = allTickets.length

  /* ── Top membres par chances ── */
  const ticketsByMember = members
    .map(m => ({
      member: m,
      tickets: commandes.filter(c => c.member_id === m.id).length,
    }))
    .filter(x => x.tickets > 0)
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 6)

  /* ── Démarrer la session ── */
  async function startSession() {
    setPhase('starting')
    setError(null)
    const supabase = createClient()
    try {
      const { data: session, error: e1 } = await supabase
        .from('tirage_sessions')
        .insert({ type: 'tirage_27mai', status: 'active', started_at: new Date().toISOString() })
        .select('id').single()
      if (e1) throw e1

      const slData = lots27.map((lot, i) => ({
        session_id: session.id, lot_id: lot.id, ordre: i + 1, status: 'pending',
      }))
      const { data: sl, error: e2 } = await supabase
        .from('session_lots').insert(slData).select('id, lot_id, ordre, status')
      if (e2) throw e2

      const mapped: SessionLot[] = (sl ?? []).map(s => ({
        ...s, lot: lots27.find(l => l.id === s.lot_id)!,
      })).sort((a, b) => a.ordre - b.ordre)

      setSessionId(session.id)
      setSessionLots(mapped)
      setPhase('ready')
    } catch {
      setError('Impossible de démarrer. Vérifiez la connexion.')
      setPhase('setup')
    }
  }

  /* ── Tirage pondéré ── */
  function draw(excludeId?: string) {
    const winnerIds = wins.map(w => w.memberId)
    if (excludeId) winnerIds.push(excludeId)
    const pool = buildTicketPool(winnerIds)

    if (pool.length === 0) {
      setError('Plus de membres éligibles avec des commandes.')
      return
    }

    const picked = pool[Math.floor(Math.random() * pool.length)]
    const allNames = Array.from(new Set(pool.map(m => `${m.prenom}${m.nom ? ' ' + m.nom : ''}`)))

    setPhase('animating')
    setWinner(picked)
    setVerifyEmail('')
    setVerifyError(null)

    const delays = [
      ...Array(25).fill(55), ...Array(12).fill(100),
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

  /* ── Confirmer ── */
  async function confirmWin() {
    if (!winner || !sessionId) return
    if (verifyEmail.trim().toLowerCase() !== winner.email.toLowerCase()) {
      setVerifyError('Email incorrect — cette personne est peut-être absente.')
      return
    }
    const currentSL = sessionLots[lotIndex]
    const newWin: Win = {
      memberId: winner.id,
      memberName: `${winner.prenom}${winner.nom ? ' ' + winner.nom : ''}`,
      lotNom: currentSL.lot.nom,
      sessionLotId: currentSL.id,
    }
    setWins(prev => [...prev, newWin])

    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id: sessionId,
      session_lot_id: currentSL.id,
      member_id: winner.id,
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

  function toggleProjector() {
    if (!projector) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setProjector(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setProjector(false)
    }
  }

  const currentLot = sessionLots[lotIndex]

  /* ── Mode Projecteur ── */
  if (projector) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a1f25',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        <button onClick={toggleProjector} style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', display: 'flex',
        }}>
          <Minimize2 size={18} />
        </button>

        {/* Badge Facebook Live */}
        <div style={{
          position: 'absolute', top: '1.5rem', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 9999, padding: '0.375rem 1rem',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'block', boxShadow: '0 0 6px #ef4444' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
            TIRAGE CART&apos;IN — 27 MAI 2026
          </span>
        </div>

        {currentLot && phase !== 'completed' && (
          <div style={{ position: 'absolute', top: '4.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>
              Lot {lotIndex + 1} sur {sessionLots.length}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 1.375rem)', color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.02em' }}>
              {currentLot.lot?.nom}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '0 2rem' }}>
          {phase === 'animating' && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 7rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.25)', lineHeight: 1, userSelect: 'none' }}>
              {animName}
            </div>
          )}

          {phase === 'winner' && winner && (
            <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 11vw, 8rem)', fontWeight: 900, letterSpacing: '-0.05em', color: 'white', lineHeight: 1, marginBottom: '0.5rem', textShadow: '0 0 80px rgba(255,255,255,0.12)' }}>
                {winner.prenom}
              </div>
              {winner.nom && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.55)', marginBottom: '1.5rem' }}>
                  {winner.nom}
                </div>
              )}
              <div style={{ maxWidth: 380, margin: '0 auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                <input
                  type="email" placeholder="Email du gagnant…" value={verifyEmail}
                  onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmWin() }}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'white', fontSize: '0.9375rem', fontFamily: 'var(--font-body)', outline: 'none', marginBottom: '0.75rem' }}
                />
                {verifyError && <div style={{ color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{verifyError}</div>}
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={confirmWin} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.625rem', background: '#16a34a', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={15} /> Confirmer
                  </button>
                  <button onClick={() => draw(winner.id)} style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <RotateCcw size={13} /> Re-tirer
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => draw()} style={{ padding: '1.5rem 3rem', borderRadius: '1rem', background: 'var(--accent)', border: 'none', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.25rem, 3vw, 2rem)', letterSpacing: '-0.02em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(217,119,6,0.4)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Play size={28} /> Tirer au sort
              </button>
              <div style={{ marginTop: '1.25rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
                {buildTicketPool(wins.map(w => w.memberId)).length} tickets dans l&apos;urne
              </div>
            </div>
          )}

          {phase === 'completed' && (
            <div style={{ textAlign: 'center' }}>
              <Trophy size={56} style={{ color: 'var(--accent)', margin: '0 auto 1.5rem' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: 'white', letterSpacing: '-0.04em' }}>
                Tirage terminé !
              </div>
            </div>
          )}
        </div>

        {sessionLots.length > 0 && phase !== 'completed' && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem' }}>
            {sessionLots.map((sl, i) => {
              const won = wins.some(w => w.sessionLotId === sl.id)
              return <div key={sl.id} style={{ width: i === lotIndex ? 28 : 8, height: 8, borderRadius: 9999, background: won ? '#4ade80' : i === lotIndex ? 'white' : 'rgba(255,255,255,0.2)', transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)' }} />
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── Vue Dashboard ── */
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tirage — 27 Mai</h1>
          <p className="page-subtitle">Tirage en direct (Facebook Live) — 1 commande = 1 chance</p>
        </div>
        {phase !== 'loading' && phase !== 'setup' && phase !== 'starting' && (
          <button onClick={toggleProjector} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: 'var(--brand)', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Maximize2 size={15} /> Mode Live
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', maxWidth: 540 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-3)' }}>
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      )}

      {(phase === 'setup' || phase === 'starting') && (
        <div style={{ maxWidth: 580 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { icon: Users,  label: 'Membres éligibles', value: eligibleCount },
              { icon: Ticket, label: 'Tickets dans l\'urne', value: totalTickets },
              { icon: Calendar, label: 'Lots à tirer', value: lots27.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Icon size={13} style={{ color: 'var(--brand-light)' }} />
                  <span className="stat-label">{label}</span>
                </div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>

          {/* Top membres */}
          {ticketsByMember.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
                Répartition des tickets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {ticketsByMember.map(({ member: m, tickets }) => {
                  const pct = totalTickets > 0 ? Math.round((tickets / totalTickets) * 100) : 0
                  return (
                    <div key={m.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>
                          {m.prenom} {m.nom ?? ''}
                        </span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>
                          {tickets} ticket{tickets > 1 ? 's' : ''} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand)', borderRadius: 9999, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lots */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '0.875rem' }}>
              Lots — Tirage 27 Mai
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lots27.map((lot, i) => (
                <div key={lot.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--bg-0)', borderRadius: '0.5rem' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: lot.categorie === 'tres_gros' ? 'var(--brand)' : 'var(--bg-2)', color: lot.categorie === 'tres_gros' ? 'white' : 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', flex: 1 }}>{lot.nom}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: lot.categorie === 'tres_gros' ? 'var(--accent)' : 'var(--text-4)' }}>{lot.categorie}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={phase === 'starting' || eligibleCount === 0}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.875rem', border: 'none', cursor: phase === 'starting' ? 'wait' : 'pointer', background: eligibleCount === 0 ? 'var(--bg-2)' : 'var(--brand)', color: eligibleCount === 0 ? 'var(--text-4)' : 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', boxShadow: eligibleCount === 0 ? 'none' : '0 4px 16px rgba(15,45,53,0.25)' }}
          >
            {phase === 'starting' ? <><Loader2 size={18} className="animate-spin" /> Initialisation…</> : <><Trophy size={18} /> Démarrer le tirage du 27 Mai</>}
          </button>
          {eligibleCount === 0 && <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>Aucun membre éligible. Enregistrez des commandes d&apos;abord.</p>}
        </div>
      )}

      {(phase === 'ready' || phase === 'animating' || phase === 'winner') && currentLot && (
        <div style={{ maxWidth: 540 }}>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {sessionLots.map((sl, i) => {
              const won = wins.some(w => w.sessionLotId === sl.id)
              return <div key={sl.id} style={{ flex: i === lotIndex ? 3 : 1, height: 6, borderRadius: 9999, background: won ? '#4ade80' : i === lotIndex ? 'var(--brand)' : 'var(--bg-2)', transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)' }} />
            })}
          </div>

          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              Lot {lotIndex + 1} / {sessionLots.length}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
              {currentLot.lot?.nom}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            {phase === 'ready' && (
              <>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {buildTicketPool(wins.map(w => w.memberId)).length} tickets dans l&apos;urne
                </div>
                <div style={{ color: 'var(--text-4)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                  ({new Set(buildTicketPool(wins.map(w => w.memberId)).map(m => m.id)).size} membres éligibles)
                </div>
                <button onClick={() => draw()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2.5rem', borderRadius: '0.875rem', border: 'none', background: 'var(--brand)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,45,53,0.25)' }}>
                  <Play size={20} /> Tirer au sort
                </button>
              </>
            )}

            {phase === 'animating' && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, color: 'var(--text-3)', letterSpacing: '-0.03em', minHeight: '1.2em', userSelect: 'none' }}>
                {animName}
              </div>
            )}

            {phase === 'winner' && winner && (
              <div className="animate-scale-in">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900, color: 'var(--brand)', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
                  {winner.prenom} {winner.nom ?? ''}
                </div>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                  {commandes.filter(c => c.member_id === winner.id).length} commande{commandes.filter(c => c.member_id === winner.id).length > 1 ? 's' : ''} enregistrée{commandes.filter(c => c.member_id === winner.id).length > 1 ? 's' : ''}
                </div>
                <div className="card-flat" style={{ textAlign: 'left', padding: '1.25rem', marginBottom: '1rem' }}>
                  <label className="label" htmlFor="verify27">Confirmer l&apos;email du gagnant</label>
                  <input id="verify27" type="email" className={`input${verifyError ? ' input-error' : ''}`} placeholder="Email du gagnant…" value={verifyEmail} onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null) }} onKeyDown={e => { if (e.key === 'Enter') confirmWin() }} autoFocus />
                  {verifyError && <div className="alert alert-error" style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem' }}><AlertCircle size={13} style={{ flexShrink: 0 }} /><span style={{ fontSize: '0.8125rem' }}>{verifyError}</span></div>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={confirmWin} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <CheckCircle2 size={16} /> Confirmer
                  </button>
                  <button onClick={() => draw(winner.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <RotateCcw size={14} /> Re-tirer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div style={{ maxWidth: 540 }}>
          <div className="card animate-scale-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Trophy size={22} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--text-1)', margin: 0 }}>
                {wins.length} gagnants — Tirage 27 Mai
              </h2>
            </div>
            {wins.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-0)', borderRadius: '0.625rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>{w.memberName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.lotNom}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
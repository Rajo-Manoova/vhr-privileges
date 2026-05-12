'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
  Trophy, ChevronRight, Users, Loader2, AlertCircle
} from 'lucide-react'
import type { Member, Lot } from '@/types'

type Phase = 'loading' | 'setup' | 'starting' | 'ready' | 'animating' | 'winner' | 'completed'

interface Win {
  memberId: string
  memberName: string
  lotNom: string
  lotCategorie: string
  sessionLotId: string
}

interface SessionLot {
  id: string
  lot_id: string
  ordre: number
  status: string
  lot: Lot
}

export default function TiragePage() {
  const [phase, setPhase]         = useState<Phase>('loading')
  const [members, setMembers]     = useState<Member[]>([])
  const [soireeLots, setSoireeLots] = useState<Lot[]>([])
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

  /* ── Chargement des données ── */
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: m }, { data: l }] = await Promise.all([
        supabase.from('members').select('*').order('created_at', { ascending: false }),
        supabase.from('lots').select('*').eq('palier', 'soiree').eq('disponible', true).order('created_at'),
      ])
      setMembers(m ?? [])
      setSoireeLots(l ?? [])
      setPhase('setup')
    }
    load()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  /* ── Membres éligibles (< 2 gains) ── */
  function getEligible(excludeId?: string) {
    return members.filter(m => {
      if (excludeId && m.id === excludeId) return false
      return wins.filter(w => w.memberId === m.id).length < 2
    })
  }

  /* ── Démarrer la session ── */
  async function startSession() {
    setPhase('starting')
    setError(null)
    const supabase = createClient()
    try {
      const { data: session, error: e1 } = await supabase
        .from('tirage_sessions')
        .insert({ type: 'soiree_16mai', status: 'active', started_at: new Date().toISOString() })
        .select('id').single()
      if (e1) throw e1

      const slData = soireeLots.map((lot, i) => ({
        session_id: session.id, lot_id: lot.id, ordre: i + 1, status: 'pending',
      }))
      const { data: sl, error: e2 } = await supabase
        .from('session_lots').insert(slData).select('id, lot_id, ordre, status')
      if (e2) throw e2

      const mapped: SessionLot[] = (sl ?? []).map(s => ({
        ...s, lot: soireeLots.find(l => l.id === s.lot_id)!,
      })).sort((a, b) => a.ordre - b.ordre)

      setSessionId(session.id)
      setSessionLots(mapped)
      setPhase('ready')
    } catch (err) {
      setError('Impossible de démarrer. Vérifiez la connexion.')
      setPhase('setup')
    }
  }

  /* ── Lancer l'animation ── */
  function draw(excludeId?: string) {
    const eligible = getEligible(excludeId)
    if (eligible.length === 0) { setError('Aucun membre éligible.'); return }

    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    const allNames = members.map(m => `${m.prenom}${m.nom ? ' ' + m.nom : ''}`)

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

  /* ── Confirmer le gain ── */
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
      lotCategorie: currentSL.lot.categorie,
      sessionLotId: currentSL.id,
    }
    setWins(prev => [...prev, newWin])

    // DB (fire & forget)
    const supabase = createClient()
    supabase.from('tirage_wins').insert({
      session_id: sessionId,
      session_lot_id: currentSL.id,
      member_id: winner.id,
    }).then(({ error }) => { if (error) console.error('Win save error:', error) })

    // Avancer
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

  /* ── Projecteur (plein écran) ── */
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

  /* ─────────────────────────────────────────── */
  /* ── Vue Projecteur (plein écran) ── */
  if (projector) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--brand)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}>

        {/* Bouton quitter */}
        <button
          onClick={toggleProjector}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center',
          }}
          title="Quitter le mode projecteur"
        >
          <Minimize2 size={18} />
        </button>

        {/* Lot actuel */}
        {currentLot && phase !== 'completed' && (
          <div style={{
            position: 'absolute', top: '2rem', left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)',
              marginBottom: '0.375rem',
            }}>
              Lot {lotIndex + 1} sur {sessionLots.length}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '-0.02em',
            }}>
              {currentLot.lot?.nom}
            </div>
          </div>
        )}

        {/* Nom animé / gagnant */}
        <div style={{ textAlign: 'center', padding: '0 2rem' }}>
          {phase === 'animating' && (
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 10vw, 7rem)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: 'rgba(255,255,255,0.35)',
              lineHeight: 1,
              minHeight: '1.1em',
              transition: 'color 60ms ease',
              userSelect: 'none',
            }}>
              {animName}
            </div>
          )}

          {phase === 'winner' && winner && (
            <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.5rem, 11vw, 8rem)',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                color: 'white',
                lineHeight: 1,
                marginBottom: '1rem',
                textShadow: '0 0 80px rgba(255,255,255,0.15)',
              }}>
                {winner.prenom}
              </div>
              {winner.nom && (
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 6vw, 4.5rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1,
                  marginBottom: '2rem',
                }}>
                  {winner.nom}
                </div>
              )}

              {/* Panel de vérification dans le mode projecteur */}
              <div style={{
                maxWidth: 400, margin: '0 auto',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '1rem', padding: '1.25rem',
              }}>
                <div style={{
                  fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)',
                  marginBottom: '0.75rem', textAlign: 'left',
                }}>
                  Confirmer l&apos;email du gagnant :
                </div>
                <input
                  type="email"
                  placeholder="email@exemple.com"
                  value={verifyEmail}
                  onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null) }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    borderRadius: '0.5rem', border: '1.5px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    fontSize: '0.9375rem', fontFamily: 'var(--font-body)',
                    outline: 'none', marginBottom: '0.75rem',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmWin() }}
                />
                {verifyError && (
                  <div style={{
                    color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <AlertCircle size={13} /> {verifyError}
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
                    onClick={() => draw(winner.id)}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: '0.625rem',
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.875rem',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    <RotateCcw size={14} /> Re-tirer
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => draw()}
                style={{
                  padding: '1.5rem 3rem', borderRadius: '1rem',
                  background: 'var(--accent)', border: 'none', color: 'white',
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 'clamp(1.25rem, 3vw, 2rem)',
                  letterSpacing: '-0.02em', cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(217,119,6,0.4)',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
              >
                <Play size={28} /> Tirer au sort
              </button>
              <div style={{
                marginTop: '1.5rem', color: 'rgba(255,255,255,0.4)',
                fontSize: '0.875rem',
              }}>
                {getEligible().length} membres éligibles
              </div>
            </div>
          )}

          {phase === 'completed' && (
            <div style={{ textAlign: 'center' }}>
              <Trophy size={60} style={{ color: 'var(--accent)', margin: '0 auto 1.5rem' }} />
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: 'white', letterSpacing: '-0.04em',
              }}>
                Tirage terminé !
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem', fontSize: '1.125rem' }}>
                {wins.length} lots attribués
              </div>
            </div>
          )}
        </div>

        {/* Progression en bas */}
        {sessionLots.length > 0 && phase !== 'completed' && (
          <div style={{
            position: 'absolute', bottom: '2rem', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: '0.5rem',
          }}>
            {sessionLots.map((sl, i) => {
              const won = wins.some(w => w.sessionLotId === sl.id)
              return (
                <div key={sl.id} style={{
                  width: i === lotIndex ? 28 : 8, height: 8,
                  borderRadius: 9999,
                  background: won
                    ? '#4ade80'
                    : i === lotIndex
                    ? 'white'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ─────────────────────────────────────────── */
  /* ── Vue Dashboard (mode normal) ── */
  return (
    <div>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1 className="page-title">Tirage au sort</h1>
          <p className="page-subtitle">Soirée du 16 Mai — Hôtel Eucalyptus, Ampefy</p>
        </div>
        {phase !== 'loading' && phase !== 'setup' && phase !== 'starting' && (
          <button
            onClick={toggleProjector}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
              background: 'var(--brand)', color: 'white', border: 'none',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Maximize2 size={15} />
            Mode projecteur
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.5rem', maxWidth: 540 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Phase : Loading */}
      {phase === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-3)' }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Chargement des données…</span>
        </div>
      )}

      {/* Phase : Setup */}
      {(phase === 'setup' || phase === 'starting') && (
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '0.625rem',
                background: 'rgba(15,45,53,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>
                  {members.length} membres inscrits
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-4)' }}>
                  éligibles au tirage au sort
                </div>
              </div>
            </div>
            <div className="divider" style={{ marginBottom: '1.25rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>
              Lots de la soirée ({soireeLots.length}) :
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {soireeLots.map((lot, i) => (
                <div key={lot.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                  background: 'var(--bg-0)',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: i >= soireeLots.length - 2 ? 'var(--brand)' : 'var(--bg-2)',
                    color: i >= soireeLots.length - 2 ? 'white' : 'var(--text-4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', flex: 1 }}>
                    {lot.nom}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: lot.categorie === 'gros' ? 'var(--accent)' : 'var(--text-4)',
                  }}>
                    {lot.categorie}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={phase === 'starting' || members.length === 0}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '1rem', borderRadius: '0.875rem',
              border: 'none', cursor: phase === 'starting' ? 'wait' : 'pointer',
              background: members.length === 0 ? 'var(--bg-2)' : 'var(--brand)',
              color: members.length === 0 ? 'var(--text-4)' : 'white',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem',
              letterSpacing: '-0.02em',
              boxShadow: members.length === 0 ? 'none' : '0 4px 16px rgba(15,45,53,0.25)',
            }}
          >
            {phase === 'starting' ? (
              <><Loader2 size={18} className="animate-spin" /> Initialisation…</>
            ) : (
              <><Trophy size={18} /> Démarrer le tirage de la soirée</>
            )}
          </button>
          {members.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
              Aucun membre inscrit. Lancez des inscriptions d&apos;abord.
            </p>
          )}
        </div>
      )}

      {/* Phase : Ready / Animating / Winner */}
      {(phase === 'ready' || phase === 'animating' || phase === 'winner') && currentLot && (
        <div style={{ maxWidth: 540 }}>
          {/* Progression */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
            {sessionLots.map((sl, i) => {
              const won = wins.some(w => w.sessionLotId === sl.id)
              return (
                <div key={sl.id} style={{
                  flex: i === lotIndex ? 3 : 1, height: 6, borderRadius: 9999,
                  background: won ? '#4ade80' : i === lotIndex ? 'var(--brand)' : 'var(--bg-2)',
                  transition: 'all 400ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              )
            })}
          </div>

          {/* Lot actuel */}
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--brand)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                  Lot {lotIndex + 1} sur {sessionLots.length}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                  {currentLot.lot?.nom}
                </div>
              </div>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '0.25rem 0.625rem',
                borderRadius: 9999, flexShrink: 0,
                background: currentLot.lot?.categorie === 'gros' ? 'rgba(217,119,6,0.1)' : 'var(--bg-1)',
                color: currentLot.lot?.categorie === 'gros' ? 'var(--accent)' : 'var(--text-4)',
              }}>
                {currentLot.lot?.categorie}
              </span>
            </div>
          </div>

          {/* Zone de tirage */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>

            {phase === 'ready' && (
              <>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  {getEligible().length} membres éligibles
                </div>
                <button
                  onClick={() => draw()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
                    padding: '1rem 2.5rem', borderRadius: '0.875rem',
                    border: 'none', background: 'var(--brand)', color: 'white',
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: '1.125rem', letterSpacing: '-0.02em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(15,45,53,0.25)',
                  }}
                >
                  <Play size={20} /> Tirer au sort
                </button>
              </>
            )}

            {phase === 'animating' && (
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                fontWeight: 800,
                color: 'var(--text-3)',
                letterSpacing: '-0.03em',
                minHeight: '1.2em',
                userSelect: 'none',
              }}>
                {animName}
              </div>
            )}

            {phase === 'winner' && winner && (
              <div className="animate-scale-in">
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  fontWeight: 900,
                  color: 'var(--brand)',
                  letterSpacing: '-0.04em',
                  marginBottom: '0.5rem',
                }}>
                  {winner.prenom} {winner.nom ?? ''}
                </div>
                <div style={{ color: 'var(--text-4)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                  {winner.email}
                </div>

                {/* Vérification email */}
                <div style={{
                  background: 'var(--bg-1)', borderRadius: '0.75rem',
                  padding: '1.25rem', marginBottom: '1rem', textAlign: 'left',
                }}>
                  <label className="label" htmlFor="verify">
                    Confirmer l&apos;email du gagnant
                  </label>
                  <input
                    id="verify"
                    type="email"
                    className={`input${verifyError ? ' input-error' : ''}`}
                    placeholder="Email du gagnant…"
                    value={verifyEmail}
                    onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') confirmWin() }}
                    autoFocus
                  />
                  {verifyError && (
                    <div className="alert alert-error" style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem' }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem' }}>{verifyError}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={confirmWin}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.875rem', borderRadius: '0.75rem',
                      border: 'none', background: '#16a34a', color: 'white',
                      fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <CheckCircle2 size={16} /> Confirmer le gain
                  </button>
                  <button
                    onClick={() => draw(winner.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.875rem 1rem', borderRadius: '0.75rem',
                      border: '1.5px solid var(--border)', background: 'transparent',
                      color: 'var(--text-3)', fontWeight: 600, fontSize: '0.875rem',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <RotateCcw size={14} /> Re-tirer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase : Completed */}
      {phase === 'completed' && (
        <div style={{ maxWidth: 540 }}>
          <div className="card animate-scale-in">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem',
            }}>
              <Trophy size={24} style={{ color: 'var(--accent)' }} />
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: '1.25rem', letterSpacing: '-0.025em',
                color: 'var(--text-1)', margin: 0,
              }}>
                Tirage terminé — {wins.length} lots attribués
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {wins.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', background: 'var(--bg-0)',
                  borderRadius: '0.625rem',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#dcfce7', color: '#16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>
                      {w.memberName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.lotNom}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
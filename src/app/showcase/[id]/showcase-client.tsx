'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { LotCategorie } from '@/types'
import { CATEGORIE_LABELS } from '@/types'

/* ── Types ── */
interface Lot {
  id: string; ordre: number; nom: string
  categorie: LotCategorie | null; valeur_ar: number | null; photo_url: string | null
}
interface Props {
  sessionId: string; sessionLabel: string
  lots: Lot[]; totalValue: number; nbMembres: number
}

/* ── Constants ── */
const SLIDE_DURATION = 6000
const LOT_DURATION   = 5000
const TOTAL_SLIDES   = 5

const PALIERS = [
  { key: 'membre',  label: 'Membre',  seuil: null,     chances: 1, emoji: '🌱', color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)',  desc: 'Dès votre 1ère commande' },
  { key: 'argent',  label: 'Argent',  seuil: '2M Ar',  chances: 2, emoji: '🥈', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.35)', desc: 'À partir de 2 000 000 Ar' },
  { key: 'or',      label: 'Or',      seuil: '5M Ar',  chances: 3, emoji: '🥇', color: '#D97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.35)',  desc: 'À partir de 5 000 000 Ar' },
  { key: 'vip',     label: 'VIP',     seuil: '12M Ar', chances: 5, emoji: '👑', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', desc: 'À partir de 12 000 000 Ar' },
]

const CSS_ANIMATIONS = `
  @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:none } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-24px) } to { opacity:1; transform:none } }
  @keyframes pulse    { 0%,100% { opacity:.6 } 50% { opacity:1 } }
  @keyframes progress { from { width:0% } to { width:100% } }
  @keyframes glow     { 0%,100% { text-shadow:0 0 40px rgba(217,119,6,0.3) } 50% { text-shadow:0 0 80px rgba(217,119,6,0.7), 0 0 120px rgba(217,119,6,0.3) } }
  @keyframes shimmer  { 0% { background-position:200% center } 100% { background-position:-200% center } }
  @keyframes starfall { 0% { transform:translateY(-10px) rotate(0); opacity:1 } 100% { transform:translateY(100vh) rotate(720deg); opacity:0 } }
`

function fmt(n: number) {
  return n.toLocaleString('fr-FR')
}

/* ── Fond étoilé ── */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  left:  Math.round(Math.random() * 100),
  top:   Math.round(Math.random() * 100),
  size:  Math.round(1 + Math.random() * 2),
  delay: Math.round(Math.random() * 4000),
  dur:   Math.round(2000 + Math.random() * 3000),
}))

/* ════════════════════════════════════════════ */
export default function ShowcaseClient({ sessionId, sessionLabel, lots, totalValue, nbMembres }: Props) {
  const [act,        setAct]        = useState<1|2>(1)
  const [slide,      setSlide]      = useState(0)   // 0-4
  const [lotIdx,     setLotIdx]     = useState(0)
  const [paused,     setPaused]     = useState(false)
  const [key,        setKey]        = useState(0)   // force re-render for CSS animations
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goSlide = useCallback((n: number) => {
    setSlide(n); setKey(k => k + 1)
  }, [])
  const goLot = useCallback((n: number) => {
    setLotIdx(n); setKey(k => k + 1)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (act === 1) {
      timerRef.current = setTimeout(() => {
        if (slide < TOTAL_SLIDES - 1) goSlide(slide + 1)
        else { setAct(2); setLotIdx(0); setKey(k => k + 1) }
      }, SLIDE_DURATION)
    } else {
      timerRef.current = setTimeout(() => {
        goLot((lotIdx + 1) % Math.max(1, lots.length))
      }, LOT_DURATION)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [act, slide, lotIdx, paused, goSlide, goLot, lots.length])

  function handlePrev() {
    setPaused(false)
    if (act === 2) { setAct(1); goSlide(TOTAL_SLIDES - 1) }
    else if (slide > 0) goSlide(slide - 1)
  }
  function handleNext() {
    setPaused(false)
    if (act === 1) {
      if (slide < TOTAL_SLIDES - 1) goSlide(slide + 1)
      else { setAct(2); setLotIdx(0); setKey(k => k + 1) }
    } else {
      goLot((lotIdx + 1) % Math.max(1, lots.length))
    }
  }
  function handleRestart() {
    setAct(1); goSlide(0); setPaused(false)
  }

  const currentLot = lots[lotIdx]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#07111a', fontFamily: 'var(--font-body)', overflow: 'hidden', userSelect: 'none' }}>
      <style>{CSS_ANIMATIONS}</style>

      {/* Stars background */}
      {STARS.map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: 'white', opacity: 0, animation: `pulse ${s.dur}ms ${s.delay}ms ease-in-out infinite` }} />
      ))}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'linear-gradient(to bottom, rgba(7,17,26,0.9) 0%, transparent 100%)' }}>
        {/* Logo placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.875rem', color: 'white', flexShrink: 0 }}>C</div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em' }}>CART'IN</div>
            <div style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>VHR Privilèges</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 2rem' }}>
          <div style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{sessionLabel}</div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {act === 1 ? `Slide ${slide + 1}/${TOTAL_SLIDES}` : `Lot ${lotIdx + 1}/${lots.length}`}
          </div>
        </div>
      </div>

      {/* ── ACTE 1 ── */}
      {act === 1 && (
        <div key={`a1-${slide}-${key}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 3rem 6rem' }}>

          {/* SLIDE 0 — HOOK */}
          {slide === 0 && (
            <div style={{ textAlign: 'center', animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '1.5rem', animation: 'fadeUp 0.5s 0.1s ease both' }}>
                Ce soir
              </div>
              {totalValue > 0 && (
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(3.5rem, 10vw, 8rem)', color: '#D97706', letterSpacing: '-0.05em', lineHeight: 0.9, marginBottom: '0.5rem', animation: 'glow 2s ease-in-out infinite' }}>
                  {fmt(totalValue)} Ar
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.25rem, 3vw, 2.5rem)', color: 'white', letterSpacing: '-0.03em', marginBottom: '1.5rem', animation: 'fadeUp 0.5s 0.3s ease both' }}>
                de lots à gagner
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.5s ease both' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: 'white' }}>{lots.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>lots à tirer</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: '#22c55e' }}>{nbMembres}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>membres inscrits</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1 — Cart'In */}
          {slide === 1 && (
            <div style={{ maxWidth: 900, width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeUp 0.5s ease both' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D97706', marginBottom: '0.75rem' }}>Vous connaissez Amazon ?</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  Cart'In vous livre Amazon<br />directement à Madagascar
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                  { icon: '📦', title: '+500M produits', desc: 'High-tech, auto, maison, mode, sport…' },
                  { icon: '💰', title: 'Prix tout compris', desc: 'Article + transport + douanes + livraison' },
                  { icon: '📱', title: 'App iOS & Android', desc: 'Commandez depuis votre smartphone' },
                  { icon: '🏆', title: '+250 000 clients', desc: '+800 000 colis livrés dans 6 pays' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animation: `fadeUp 0.5s ${0.1 + i * 0.1}s ease both` }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'white', marginBottom: '0.25rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 2 — VHR Privilèges */}
          {slide === 2 && (
            <div style={{ maxWidth: 960, width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeUp 0.5s ease both' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D97706', marginBottom: '0.5rem' }}>Programme exclusif</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: 'white', letterSpacing: '-0.03em' }}>
                  Plus vous commandez,<br />plus vous gagnez
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
                {PALIERS.map((p, i) => (
                  <div key={p.key} style={{ padding: '1.25rem 1rem', borderRadius: '1rem', background: p.bg, border: `1.5px solid ${p.border}`, textAlign: 'center', animation: `scaleIn 0.5s ${0.1 + i * 0.12}s cubic-bezier(0.34,1.56,0.64,1) both`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{p.emoji}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.25rem', color: p.color, marginBottom: '0.25rem' }}>{p.label}</div>
                    <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.875rem', fontWeight: 600, letterSpacing: '0.06em' }}>{p.desc}</div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.75rem', color: p.color, lineHeight: 1 }}>×{p.chances}</div>
                      <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>chance{p.chances > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)', animation: 'fadeIn 0.5s 0.6s ease both' }}>
                Chaque commande Cart'In accumule des points → vous montez de niveau → vos chances de gagner multiplient
              </div>
            </div>
          )}

          {/* SLIDE 3 — Les lots ce soir */}
          {slide === 3 && (
            <div style={{ maxWidth: 1000, width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeUp 0.5s ease both' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D97706', marginBottom: '0.5rem' }}>Ce soir à gagner</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', color: 'white', letterSpacing: '-0.03em' }}>
                  {lots.length} lots — {fmt(totalValue)} Ar de valeur totale
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(lots.length, 5)}, 1fr)`, gap: '0.75rem' }}>
                {lots.slice(0, 10).map((lot, i) => {
                  const catColor = lot.categorie === 'grand_prix' ? '#a855f7' : lot.categorie === 'prestige' ? '#D97706' : lot.categorie === 'premium' ? '#22c55e' : '#64748b'
                  return (
                    <div key={lot.id} style={{ borderRadius: '0.875rem', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', animation: `scaleIn 0.4s ${i * 0.06}s ease both` }}>
                      {lot.photo_url ? (
                        <img src={lot.photo_url} alt={lot.nom} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎁</div>
                      )}
                      <div style={{ padding: '0.5rem 0.625rem' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                          {lot.categorie ? CATEGORIE_LABELS[lot.categorie] : ''}
                        </div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lot.nom}</div>
                        {lot.valeur_ar && (
                          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#D97706', fontFamily: 'var(--font-display)' }}>{fmt(lot.valeur_ar)} Ar</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SLIDE 4 — Action */}
          {slide === 4 && (
            <div style={{ textAlign: 'center', animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both', maxWidth: 680 }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'fadeUp 0.5s 0.1s ease both' }}>🎯</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 4rem)', color: 'white', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '1.5rem', animation: 'fadeUp 0.5s 0.2s ease both' }}>
                Participez au tirage<br />de ce soir
              </div>
              <div style={{ fontSize: 'clamp(1rem, 2vw, 1.375rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '2.5rem', animation: 'fadeUp 0.5s 0.35s ease both' }}>
                Demandez à votre animateur de vous inscrire maintenant.<br />
                <span style={{ color: '#D97706', fontWeight: 700 }}>C'est gratuit. C'est immédiat. Vous pouvez gagner ce soir.</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.5s ease both' }}>
                <div style={{ padding: '1rem 2rem', borderRadius: '0.875rem', background: '#D97706', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1rem, 2vw, 1.25rem)', cursor: 'default' }}>
                  ✋ Inscrivez-vous maintenant
                </div>
                <div style={{ padding: '1rem 2rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(0.875rem, 1.5vw, 1.1rem)' }}>
                  🎁 Voir les lots →
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTE 2 — Carousel lots ── */}
      {act === 2 && currentLot && (
        <div key={`a2-${lotIdx}-${key}`} style={{ position: 'absolute', inset: 0 }}>
          {/* Fond photo floutée */}
          {currentLot.photo_url && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${currentLot.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08, filter: 'blur(40px)', animation: 'fadeIn 0.8s ease both' }} />
          )}

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 3rem 6rem', gap: 'clamp(2rem, 5vw, 5rem)', flexWrap: 'wrap' }}>
            {/* Photo */}
            <div style={{ flexShrink: 0, animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {currentLot.photo_url ? (
                <img src={currentLot.photo_url} alt={currentLot.nom} style={{ width: 'min(40vh, 380px)', height: 'min(40vh, 380px)', objectFit: 'cover', borderRadius: '1.5rem', display: 'block', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} />
              ) : (
                <div style={{ width: 'min(40vh, 380px)', height: 'min(40vh, 380px)', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎁</div>
              )}
            </div>

            {/* Infos */}
            <div style={{ flex: '1 1 280px', minWidth: 0, animation: 'fadeUp 0.5s 0.2s ease both' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
                Lot {currentLot.ordre} / {lots.length}
              </div>
              {currentLot.categorie && (() => {
                const catColor = currentLot.categorie === 'grand_prix' ? '#a855f7' : currentLot.categorie === 'prestige' ? '#D97706' : currentLot.categorie === 'premium' ? '#22c55e' : '#64748b'
                return (
                  <span style={{ display: 'inline-block', padding: '0.3rem 0.875rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: `${catColor}22`, border: `1px solid ${catColor}66`, color: catColor, marginBottom: '0.875rem' }}>
                    {CATEGORIE_LABELS[currentLot.categorie]}
                  </span>
                )
              })()}
              {currentLot.valeur_ar && (
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.75rem, 4vw, 3.5rem)', color: '#D97706', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.75rem', animation: 'glow 2s ease-in-out infinite' }}>
                  {fmt(currentLot.valeur_ar)} Ar
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: 'white', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                {currentLot.nom}
              </div>
            </div>
          </div>

          {/* Dots lots */}
          <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.375rem' }}>
            {lots.map((_, i) => (
              <button key={i} onClick={() => { goLot(i); setPaused(false) }} style={{ width: i === lotIdx ? 20 : 7, height: 7, borderRadius: 9999, background: i === lotIdx ? '#D97706' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 300ms ease', padding: 0 }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div
          key={`prog-${act}-${slide}-${lotIdx}-${key}`}
          style={{ height: '100%', background: '#D97706', animation: `progress ${act === 1 ? SLIDE_DURATION : LOT_DURATION}ms linear both` }}
        />
      </div>

      {/* ── Footer navigation ── */}
      <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 10, padding: '0 1.5rem' }}>
        {/* Slide dots (acte 1) */}
        {act === 1 && (
          <div style={{ display: 'flex', gap: '0.375rem', marginRight: '0.5rem' }}>
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button key={i} onClick={() => { goSlide(i); setPaused(false) }} style={{ width: i === slide ? 18 : 6, height: 6, borderRadius: 9999, background: i === slide ? '#D97706' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 250ms ease', padding: 0 }} />
            ))}
          </div>
        )}

        <button onClick={handlePrev} style={{ padding: '0.5rem 1.125rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          ← Préc.
        </button>

        <button onClick={handleRestart} style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ⟳ Début
        </button>

        <button onClick={() => setPaused(p => !p)} style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: paused ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${paused ? 'rgba(217,119,6,0.4)' : 'rgba(255,255,255,0.08)'}`, color: paused ? '#D97706' : 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>

        {act === 1 && slide < TOTAL_SLIDES - 1 && (
          <button onClick={handleNext} style={{ padding: '0.5rem 1.125rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            Suiv. →
          </button>
        )}
        {(act === 1 && slide === TOTAL_SLIDES - 1) || act === 2 ? (
          <button onClick={handleNext} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.625rem', background: '#D97706', border: 'none', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {act === 1 ? '🎁 Voir les lots →' : 'Lot suivant →'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
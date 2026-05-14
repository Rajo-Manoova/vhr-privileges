'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { LotCategorie } from '@/types'
import { CATEGORIE_LABELS } from '@/types'

interface Lot {
  id: string; ordre: number; nom: string
  categorie: LotCategorie | null; valeur_ar: number | null; photo_url: string | null
}
interface Props {
  sessionId: string; sessionLabel: string; scheduledAt: string | null
  lots: Lot[]; totalValue: number; nbMembres: number
}

const SLIDE_DURATION = 6000
const LOT_DURATION   = 5000
const TOTAL_SLIDES   = 5

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
function formatDate(iso: string | null): string {
  if (!iso) return 'ce soir'
  const d = new Date(iso)
  const s = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PALIERS = [
  { key:'membre', label:'Membre', chances:1, desc:"Dès l'inscription",        initial:'M', gradient:'linear-gradient(135deg,#1e293b,#334155)',          border:'rgba(148,163,184,0.28)', color:'#94a3b8', glow:'rgba(148,163,184,0.12)', badge:'#334155' },
  { key:'argent', label:'Argent', chances:2, desc:'À partir de 2 000 000 Ar', initial:'A', gradient:'linear-gradient(135deg,#1a2744,#1e3a5f)',           border:'rgba(96,165,250,0.38)',  color:'#93c5fd', glow:'rgba(96,165,250,0.14)',  badge:'#1e3a5f' },
  { key:'or',     label:'Or',     chances:3, desc:'À partir de 5 000 000 Ar', initial:'O', gradient:'linear-gradient(135deg,#1c1400,#92400e)',           border:'rgba(217,119,6,0.5)',   color:'#f59e0b', glow:'rgba(217,119,6,0.18)',  badge:'#92400e' },
  { key:'vip',    label:'VIP',    chances:5, desc:'À partir de 12 000 000 Ar',initial:'V', gradient:'linear-gradient(135deg,#0f0820,#4c1d95,#6d28d9)',   border:'rgba(167,139,250,0.45)', color:'#c4b5fd', glow:'rgba(167,139,250,0.18)', badge:'#4c1d95' },
]

const STARS = Array.from({ length: 60 }, () => ({
  left: Math.round(Math.random() * 100), top: Math.round(Math.random() * 100),
  size: Math.round(1 + Math.random() * 2.5),
  delay: Math.round(Math.random() * 5000), dur: Math.round(2500 + Math.random() * 3500),
}))

const CSS = `
@keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes scaleIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
@keyframes cardIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes glow    { 0%,100%{text-shadow:0 0 30px rgba(217,119,6,0.3)} 50%{text-shadow:0 0 70px rgba(217,119,6,0.65)} }
@keyframes starP   { 0%,100%{opacity:0} 50%{opacity:1} }
@keyframes progress{ from{width:0%} to{width:100%} }
@media(max-width:640px){
  .sc-palier{grid-template-columns:1fr 1fr!important}
  .sc-hdr-title{font-size:0.75rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .sc-sub{display:none!important}
  .sc-s5-btns{flex-direction:column!important;align-items:stretch!important}
}
`

export default function ShowcaseClient({ sessionId, sessionLabel, scheduledAt, lots, totalValue, nbMembres }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width:640px)')
    setIsMobile(mq.matches)
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const [act,     setAct]     = useState<1|2>(1)
  const [slide,   setSlide]   = useState(0)
  const [lotIdx,  setLotIdx]  = useState(0)
  const [paused,  setPaused]  = useState(false)
  const [ak,      setAk]      = useState(0)
  const tmr = useRef<ReturnType<typeof setTimeout>|null>(null)

  const go = useCallback((s: number) => { setSlide(s); setAk(k=>k+1) }, [])
  const gl = useCallback((i: number) => { setLotIdx(i); setAk(k=>k+1) }, [])

  useEffect(() => {
    if (paused) return
    if (tmr.current) clearTimeout(tmr.current)
    tmr.current = setTimeout(() => {
      if (act===1) { if(slide<TOTAL_SLIDES-1) go(slide+1); else{setAct(2);gl(0);setAk(k=>k+1)} }
      else gl((lotIdx+1) % Math.max(1,lots.length))
    }, act===1 ? SLIDE_DURATION : LOT_DURATION)
    return () => { if(tmr.current) clearTimeout(tmr.current) }
  }, [act, slide, lotIdx, paused, go, gl, lots.length])

  const prev = () => { setPaused(false); if(act===2&&lotIdx===0){setAct(1);go(TOTAL_SLIDES-1)} else if(act===2) gl(lotIdx-1); else if(slide>0) go(slide-1) }
  const next = () => { setPaused(false); if(act===1&&slide<TOTAL_SLIDES-1) go(slide+1); else if(act===1){setAct(2);gl(0);setAk(k=>k+1)} else gl((lotIdx+1)%Math.max(1,lots.length)) }
  const exit = () => { if(typeof window==='undefined') return; if(window.opener) window.close(); else window.location.href=`/tirages/${sessionId}` }

  const evDate = formatDate(scheduledAt)
  const cc = (cat: LotCategorie|null) => cat==='grand_prix'?'#c4b5fd':cat==='prestige'?'#f59e0b':cat==='premium'?'#4ade80':'#64748b'
  const lot = lots[lotIdx]
  const isLastSlide = act===1 && slide===TOTAL_SLIDES-1

  const Header = () => (
    <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, background:'linear-gradient(to bottom,rgba(7,14,24,0.95) 0%,transparent 100%)' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'0.75rem 1.25rem', gap:'0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', flexShrink:0 }}>
          {/* Cart'In logo */}
          <img src="/logo-cartin.png" alt="Cart'In"
            style={{ height:28, width:'auto', borderRadius:'0.3rem', flexShrink:0 }}
            onError={e=>{ const t=e.currentTarget as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement).style.display='flex' }} />
          <div style={{ display:'none', width:28, height:28, borderRadius:'0.4rem', background:'#D97706', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:'0.75rem', color:'white', flexShrink:0 }}>C</div>
          {/* Separator */}
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.2)', flexShrink:0 }} />
          {/* VHR logo */}
          <img src="/logo-vhr.png" alt="VHR"
            style={{ height:28, width:'auto', flexShrink:0 }}
            onError={e=>{ const t=e.currentTarget as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement).style.display='block' }} />
          <span style={{ display:'none', fontSize:'0.5625rem', fontWeight:800, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>VHR</span>
        </div>
        <div className="sc-hdr-title" style={{ flex:1, fontFamily:'var(--font-display)', fontWeight:800, fontSize:'clamp(0.75rem,2vw,1.25rem)', color:'white', letterSpacing:'-0.02em', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'0 0.5rem' }}>
          {sessionLabel}
        </div>
        <div style={{ fontSize:'0.5625rem', fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase' as const, letterSpacing:'0.1em', flexShrink:0 }}>
          {act===1 ? `${slide+1}/${TOTAL_SLIDES}` : `${lotIdx+1}/${lots.length}`}
        </div>
      </div>
    </div>
  )

  const Footer = () => {
    const btnBase: React.CSSProperties = { padding: isMobile ? '0.4rem 0.625rem' : '0.4rem 0.875rem', borderRadius:'0.5rem', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.75)', fontSize: isMobile ? '0.875rem' : '0.8125rem', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 150ms', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }
    const btns = [
      { l:'←', ll:'← Préc.',  fn:prev, s:{} as React.CSSProperties },
      { l:'⟳', ll:'⟳ Début',  fn:()=>{setAct(1);go(0);setPaused(false)}, s:{} as React.CSSProperties },
      { l:paused?'▶':'⏸', ll:paused?'▶ Play':'⏸', fn:()=>setPaused(p=>!p), s:(paused?{background:'rgba(217,119,6,0.2)',borderColor:'rgba(217,119,6,0.45)',color:'#D97706'}:{}) as React.CSSProperties },
      { l:isLastSlide?'Lots→':'→', ll:isLastSlide?'Lots →':'Suiv. →', fn:next, s:(isLastSlide?{background:'#D97706',border:'none',color:'white'}:{}) as React.CSSProperties },
    ]
    return (
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0.5rem 0.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.375rem', flexWrap:'nowrap', zIndex:20, background:'linear-gradient(to top,rgba(7,14,24,0.97) 0%,transparent 100%)' }}>
        {act===1 && (
          <div style={{ display:'flex', gap:'0.25rem', marginRight:'0.25rem', flexShrink:0 }}>
            {Array.from({length:TOTAL_SLIDES}).map((_,i)=>(
              <button key={i} onClick={()=>{go(i);setPaused(false)}} style={{ width:i===slide?12:4, height:4, borderRadius:9999, background:i===slide?'#D97706':'rgba(255,255,255,0.18)', border:'none', cursor:'pointer', transition:'all 250ms', padding:0, flexShrink:0 }} />
            ))}
          </div>
        )}
        {act===2 && lots.length>1 && (
          <div style={{ fontSize:'0.6875rem', fontWeight:700, color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-display)', marginRight:'0.25rem', flexShrink:0, minWidth:28, textAlign:'center' }}>
            {lotIdx+1}/{lots.length}
          </div>
        )}
        {btns.map((b,i)=>(
          <button key={i} onClick={b.fn} style={{ ...btnBase, ...b.s }}>{isMobile ? b.l : b.ll}</button>
        ))}
        <button onClick={exit} style={{ ...btnBase, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'rgba(239,68,68,0.7)' }}>
          {isMobile ? '✕' : '✕ Sortir'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#070e18', fontFamily:'var(--font-body)', overflow:'hidden' }}>
      <style>{CSS}</style>
      {STARS.map((s,i)=>(
        <div key={i} style={{ position:'absolute', left:`${s.left}%`, top:`${s.top}%`, width:s.size, height:s.size, borderRadius:'50%', background:'white', opacity:0, animation:`starP ${s.dur}ms ${s.delay}ms ease-in-out infinite`, pointerEvents:'none' }} />
      ))}
      {/* Progress */}
      <div style={{ position:'absolute', top:2, left:0, right:0, height:2, zIndex:30 }}>
        <div key={`p-${act}-${slide}-${lotIdx}-${ak}`} style={{ height:'100%', background:'#D97706', animation:`progress ${act===1?SLIDE_DURATION:LOT_DURATION}ms linear both` }} />
      </div>

      <Header />

      {/* ══ ACTE 1 ══ */}
      {act===1 && (
        <div key={`s${slide}-${ak}`} style={{ position:'absolute', inset:0, display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'center', padding: isMobile ? '4rem 1rem 3.5rem' : 'clamp(4rem,8vh,5.5rem) clamp(1.5rem,4vw,4rem) clamp(3.5rem,7vh,5rem)', overflowY:'auto' }}>

          {/* Slide 0 */}
          {slide===0 && (
            <div style={{ textAlign:'center', width:'100%', maxWidth:800 }}>
              <div style={{ fontSize:'clamp(0.75rem,1.4vw,1rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.22em', color:'rgba(255,255,255,0.38)', marginBottom:'1rem', animation:'fadeUp 0.5s 0.1s ease both' }}>{evDate}</div>
              {totalValue>0 && (
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(3rem,9vw,8rem)', color:'#D97706', letterSpacing:'-0.05em', lineHeight:0.95, marginBottom:'0.5rem', animation:'glow 2.5s ease-in-out infinite, scaleIn 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
                  {fmt(totalValue)} Ar
                </div>
              )}
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.125rem,2.8vw,2.25rem)', color:'white', letterSpacing:'-0.03em', marginBottom:'2rem', animation:'fadeUp 0.5s 0.35s ease both' }}>de lots à gagner</div>
              <div style={{ display:'flex', gap:'1.25rem', justifyContent:'center', flexWrap:'wrap', animation:'fadeUp 0.5s 0.5s ease both' }}>
                {[{v:fmt(lots.length),l:'lots à tirer',c:'white'},{v:fmt(nbMembres),l:'membres inscrits',c:'#4ade80'}].map((s,i)=>(
                  <div key={i} style={{ padding:'0.875rem 1.75rem', borderRadius:'1rem', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.75rem,4vw,2.75rem)', color:s.c, lineHeight:1 }}>{s.v}</div>
                    <div style={{ fontSize:'clamp(0.6875rem,1.1vw,0.875rem)', color:'rgba(255,255,255,0.38)', fontWeight:600, marginTop:'0.25rem' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide 1 */}
          {slide===1 && (
            <div style={{ maxWidth:960, width:'100%' }}>
              <div style={{ textAlign:'center', marginBottom:'clamp(1.25rem,2.5vh,2rem)', animation:'fadeUp 0.5s ease both' }}>
                <div style={{ fontSize:'clamp(0.6875rem,1.1vw,0.875rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.2em', color:'#D97706', marginBottom:'0.625rem' }}>Vous connaissez Amazon ?</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.375rem,3.5vw,2.75rem)', color:'white', letterSpacing:'-0.03em', lineHeight:1.1 }}>Cart'In vous livre Amazon<br />directement à Madagascar</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(190px,1fr))', gap:'clamp(0.5rem,1.5vw,1rem)' }}>
                {[
                  {icon:'◈',title:'+500M produits',      desc:'High-tech, auto, maison, mode, sport, beauté…'},
                  {icon:'◉',title:'Prix tout compris',    desc:'Article + transport + douanes + livraison'},
                  {icon:'◎',title:'App iOS & Android',    desc:'Commandez depuis votre smartphone'},
                  {icon:'✦',title:'+800 000 colis livrés',desc:'+250 000 clients dans 6 pays africains'},
                ].map((item,i)=>(
                  <div key={i} style={{ padding:'clamp(0.875rem,2vh,1.25rem)', borderRadius:'1rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', animation:`cardIn 0.5s ${0.1+i*0.1}s ease both` }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'#D97706', marginBottom:'0.5rem', fontWeight:900 }}>{item.icon}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'clamp(0.875rem,1.5vw,1rem)', color:'white', marginBottom:'0.3rem' }}>{item.title}</div>
                    <div style={{ fontSize:'clamp(0.6875rem,1.1vw,0.8125rem)', color:'rgba(255,255,255,0.4)', lineHeight:1.55 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide 2 */}
          {slide===2 && (
            <div style={{ maxWidth:1060, width:'100%' }}>
              <div style={{ textAlign:'center', marginBottom:'clamp(1rem,2.5vh,1.75rem)', animation:'fadeUp 0.5s ease both' }}>
                <div style={{ fontSize:'clamp(0.625rem,1vw,0.8125rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.22em', color:'#D97706', marginBottom:'0.5rem' }}>Programme exclusif</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.375rem,3.5vw,2.75rem)', color:'white', letterSpacing:'-0.03em', lineHeight:1.1 }}>Plus vous commandez,<br />plus vous gagnez</div>
              </div>
              <div className="sc-palier" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'clamp(0.5rem,1.5vw,1rem)' }}>
                {PALIERS.map((p,i)=>(
                  <div key={p.key} style={{ borderRadius:'clamp(0.75rem,1.5vw,1.1rem)', background:p.gradient, border:`1.5px solid ${p.border}`, overflow:'hidden', animation:`scaleIn 0.55s ${0.1+i*0.12}s cubic-bezier(0.34,1.56,0.64,1) both`, boxShadow:`0 8px 32px ${p.glow}` }}>
                    <div style={{ padding:'clamp(0.875rem,2vh,1.25rem) clamp(0.75rem,1.5vw,1rem)', textAlign:'center', borderBottom:`1px solid ${p.border}` }}>
                      <div style={{ width:'clamp(36px,5vw,46px)', height:'clamp(36px,5vw,46px)', borderRadius:'50%', background:p.badge, border:`2px solid ${p.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto clamp(0.5rem,1vh,0.75rem)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(0.875rem,1.5vw,1.1rem)', color:p.color }}>
                        {p.initial}
                      </div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(0.9375rem,2vw,1.375rem)', color:p.color, marginBottom:'0.25rem' }}>{p.label}</div>
                      <div style={{ fontSize:'clamp(0.5rem,0.85vw,0.6875rem)', color:'rgba(255,255,255,0.35)', fontWeight:600, lineHeight:1.45 }}>{p.desc}</div>
                    </div>
                    <div style={{ padding:'clamp(0.625rem,1.5vh,1rem)', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.375rem,3vw,2.25rem)', color:p.color, lineHeight:1 }}>×{p.chances}</div>
                      <div style={{ fontSize:'clamp(0.5rem,0.85vw,0.625rem)', color:'rgba(255,255,255,0.32)', fontWeight:600 }}>chance{p.chances>1?'s':''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign:'center', marginTop:'clamp(0.625rem,1.5vh,1rem)', fontSize:'clamp(0.6875rem,1.1vw,0.875rem)', color:'white', fontWeight:500, opacity:0.75, animation:'fadeIn 0.5s 0.65s ease both' }}>
                Chaque commande Cart'In accumule des points → vous montez de niveau → vos chances de gagner se multiplient
              </div>
            </div>
          )}

          {/* Slide 3 — Lots */}
          {slide===3 && (
            <div style={{ width:'100%', maxWidth:1100, display:'flex', flexDirection:'column', gap:'clamp(0.5rem,1.5vh,0.875rem)', ...(isMobile ? {} : { minHeight:0, flex:'1 1 0', overflow:'hidden' }) }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:'1rem', flexWrap:'wrap', flexShrink:0, animation:'fadeUp 0.4s ease both' }}>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1rem,2.5vw,1.75rem)', color:'white', letterSpacing:'-0.03em' }}>{lots.length} lots</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'clamp(0.875rem,1.8vw,1.25rem)', color:'#D97706' }}>{fmt(totalValue)} Ar de valeur totale</span>
              </div>
              <div style={{
                display:'grid',
                gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : `repeat(${Math.min(lots.length,5)},1fr)`,
                gap:'clamp(0.3rem,0.6vw,0.5rem)',
                ...(isMobile ? {} : { gridAutoRows:'1fr', flex:'1 1 0', minHeight:0, overflow:'hidden' }),
              }}>
                {lots.slice(0,10).map((l,i)=>(
                  <div key={l.id} style={{ borderRadius:'0.625rem', overflow:'hidden', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', animation:`cardIn 0.35s ${i*0.05}s ease both` }}>
                    <div style={{ height: isMobile ? '130px' : undefined, flex: isMobile ? 'none' : '1 1 0', background:'white', borderRadius:'0.5rem 0.5rem 0 0', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {l.photo_url ? (
                        <img src={l.photo_url} alt={l.nom} style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
                          onError={e=>{ const t=e.currentTarget as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement).style.display='flex' }} />
                      ) : null}
                      <div style={{ display: l.photo_url ? 'none' : 'flex', width:'100%', height:'100%', background:'rgba(255,255,255,0.04)', alignItems:'center', justifyContent:'center', color:'rgba(0,0,0,0.15)', fontFamily:'var(--font-display)', fontSize:'1.25rem', fontWeight:900 }}>✦</div>
                    </div>
                    <div style={{ padding:'0.3rem 0.4rem', flexShrink:0 }}>
                      <div style={{ fontSize:'clamp(0.4rem,0.7vw,0.5625rem)', fontWeight:700, color:cc(l.categorie), textTransform:'uppercase', letterSpacing:'0.05em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.categorie ? CATEGORIE_LABELS[l.categorie] : ''}
                      </div>
                      <div style={{ fontSize:'clamp(0.4375rem,0.8vw,0.625rem)', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.nom}</div>
                      {l.valeur_ar && <div style={{ fontSize:'clamp(0.4rem,0.7vw,0.5625rem)', fontWeight:700, color:'#D97706', fontFamily:'var(--font-display)' }}>{fmt(l.valeur_ar)} Ar</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide 4 — CTA */}
          {slide===4 && (
            <div style={{ textAlign:'center', maxWidth:700, width:'100%', animation:'scaleIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{ width:'clamp(56px,7vw,72px)', height:'clamp(56px,7vw,72px)', borderRadius:'50%', background:'linear-gradient(135deg,#92400e,#D97706)', border:'2px solid rgba(217,119,6,0.45)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto clamp(0.875rem,2vh,1.375rem)', boxShadow:'0 0 40px rgba(217,119,6,0.3)', animation:'glow 2.5s ease-in-out infinite' }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.375rem,2.5vw,2rem)', color:'white', fontWeight:900 }}>✦</span>
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.625rem,5vw,3.75rem)', color:'white', letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:'1.125rem', animation:'fadeUp 0.5s 0.15s ease both' }}>
                Participez au tirage<br />du {evDate}
              </div>
              <div style={{ fontSize:'clamp(0.875rem,1.7vw,1.25rem)', color:'rgba(255,255,255,0.48)', lineHeight:1.65, marginBottom:'2rem', animation:'fadeUp 0.5s 0.3s ease both' }}>
                Demandez à votre animateur de vous inscrire maintenant.<br />
                <span style={{ color:'#D97706', fontWeight:700 }}>C'est gratuit. C'est immédiat. Vous pouvez gagner.</span>
              </div>
              <div className="sc-s5-btns" style={{ display:'flex', gap:'0.875rem', justifyContent:'center', flexWrap:'wrap', animation:'fadeUp 0.5s 0.45s ease both', width:'100%' }}>
                <a href="/inscription" target="_blank" rel="noopener"
                  style={{ padding:'clamp(0.75rem,1.5vh,1rem) clamp(1.5rem,3vw,2.25rem)', borderRadius:'0.875rem', background:'#D97706', color:'white', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'clamp(0.875rem,1.75vw,1.25rem)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', textDecoration:'none', boxShadow:'0 4px 24px rgba(217,119,6,0.4)', width: isMobile ? '100%' : 'auto', boxSizing:'border-box' as const }}>
                  ✦ Inscrivez-vous maintenant
                </a>
                <button onClick={()=>{setAct(2);gl(0);setAk(k=>k+1)}}
                  style={{ padding:'clamp(0.75rem,1.5vh,1rem) clamp(1.5rem,3vw,2.25rem)', borderRadius:'0.875rem', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.18)', color:'white', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'clamp(0.875rem,1.75vw,1.25rem)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', width: isMobile ? '100%' : 'auto', boxSizing:'border-box' as const }}>
                  Voir les lots →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ACTE 2 ══ */}
      {act===2 && lot && (
        <div key={`lot-${lotIdx}-${ak}`} style={{ position:'absolute', inset:0 }}>
          {lot.photo_url && <div style={{ position:'absolute', inset:0, backgroundImage:`url(${lot.photo_url})`, backgroundSize:'cover', backgroundPosition:'center', opacity:0.07, filter:'blur(48px)', animation:'fadeIn 0.8s ease both' }} />}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? '4.5rem 1.25rem 3.5rem' : 'clamp(4.5rem,9vh,6rem) clamp(1.5rem,5vw,5rem) clamp(4rem,8vh,5.5rem)', gap: isMobile ? '0.875rem' : 'clamp(2rem,5vw,5rem)', flexDirection: isMobile ? 'column' : 'row', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowY: isMobile ? 'auto' : 'visible' }}>
            <div style={{ flexShrink:0, animation:'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {lot.photo_url ? (
                <img src={lot.photo_url} alt={lot.nom}
                  style={{ width: isMobile ? 'min(55vw,220px)' : 'min(38vh,360px)', height: isMobile ? 'min(55vw,220px)' : 'min(38vh,360px)', objectFit:'contain', borderRadius:'1.25rem', display:'block', boxShadow:'0 16px 48px rgba(0,0,0,0.5)', background:'white' }} />
              ) : (
                <div style={{ width: isMobile ? 'min(55vw,220px)' : 'min(38vh,360px)', height: isMobile ? 'min(55vw,220px)' : 'min(38vh,360px)', borderRadius:'1.25rem', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'3rem', color:'rgba(255,255,255,0.25)', fontWeight:900 }}>✦</div>
              )}
            </div>
            <div style={{ flex:'1 1 260px', minWidth:0, animation:'fadeUp 0.5s 0.2s ease both', textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ fontSize:'clamp(0.5625rem,0.9vw,0.75rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.28)', marginBottom:'0.625rem' }}>Lot {lot.ordre} / {lots.length}</div>
              {lot.categorie && (
                <span style={{ display:'inline-block', padding:'0.275rem 0.875rem', borderRadius:9999, fontSize:'clamp(0.5625rem,0.9vw,0.75rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:`${cc(lot.categorie)}1a`, border:`1px solid ${cc(lot.categorie)}55`, color:cc(lot.categorie), marginBottom:'0.75rem' }}>
                  {CATEGORIE_LABELS[lot.categorie]}
                </span>
              )}
              {lot.valeur_ar && (
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.375rem,4vw,3.5rem)', color:'#D97706', letterSpacing:'-0.03em', lineHeight:1, marginBottom:'0.625rem', animation:'glow 2.5s ease-in-out infinite' }}>{fmt(lot.valeur_ar)} Ar</div>
              )}
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(1.125rem,3vw,2.75rem)', color:'white', letterSpacing:'-0.04em', lineHeight:1.08 }}>{lot.nom}</div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
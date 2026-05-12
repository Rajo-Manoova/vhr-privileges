'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, RefreshCw, ChevronDown, AlertCircle, Copy, Check } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function InscriptionPage() {
  const [prenom,   setPrenom]   = useState('')
  const [nom,      setNom]      = useState('')
  const [email,    setEmail]    = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [etape,    setEtape]    = useState<Etape>('15_akoor_depart')
  const [pin,      setPin]      = useState(generatePin)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [lastName, setLastName] = useState('')
  const [lastPin,  setLastPin]  = useState('')
  const [count,    setCount]    = useState(0)
  const [copied,   setCopied]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    await new Promise(r => setTimeout(r, 0))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('members').insert({
      prenom:     prenom.trim(),
      nom:        nom.trim() || null,
      email:      email.trim().toLowerCase(),
      whatsapp:   whatsapp.trim(),
      etape,
      pin,
      created_by: user?.id ?? null,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Cet email est déjà inscrit.')
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    setLastName(prenom.trim())
    setLastPin(pin)
    setCount(c => c + 1)
    setSuccess(true)
    setLoading(false)
  }

  function handleNew() {
    setPrenom('')
    setNom('')
    setEmail('')
    setWhatsapp('')
    setEtape('15_akoor_depart')
    setPin(generatePin())
    setError(null)
    setSuccess(false)
    setCopied(false)
  }

  function handleCopyPin() {
    navigator.clipboard.writeText(lastPin).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (success) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.25rem',
        }}>
          <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          letterSpacing: '-0.035em', color: 'var(--text-1)',
          marginBottom: '0.375rem',
        }}>
          {lastName} est inscrit{lastName.endsWith('e') ? 'e' : ''} !
        </h2>

        {count > 1 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(15,45,53,0.07)',
            padding: '0.25rem 0.875rem', borderRadius: 9999,
            fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)',
            marginBottom: '1.5rem',
          }}>
            {count} inscrits cette session
          </div>
        )}

        {/* PIN affiché en grand */}
        <div style={{
          background: 'var(--brand)',
          borderRadius: '1.25rem',
          padding: '1.5rem 2.5rem',
          marginBottom: '1rem',
          marginTop: count <= 1 ? '1rem' : '0',
        }}>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.15em', color: 'rgba(255,255,255,0.55)',
            marginBottom: '0.5rem',
          }}>
            Code PIN du membre
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: '3rem', letterSpacing: '0.3em',
            color: 'white', lineHeight: 1,
            marginBottom: '0.75rem',
          }}>
            {lastPin}
          </div>
          <button
            onClick={handleCopyPin}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.875rem', borderRadius: 9999,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 150ms ease',
            }}
          >
            {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '2rem', maxWidth: 320 }}>
          Communiquez ce PIN à <strong>{lastName}</strong>. Il en aura besoin pour accéder à son espace VHR Privilèges.
        </p>

        <button
          onClick={handleNew}
          style={{
            padding: '0.875rem 2rem', borderRadius: '0.875rem',
            border: 'none', background: 'var(--brand)', color: 'white',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem',
            letterSpacing: '-0.02em', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(15,45,53,0.2)',
          }}
        >
          + Inscrire un autre membre
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inscription</h1>
        <p className="page-subtitle">Enregistrez un participant au Rallye VHR 2026.</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Prénom + Nom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="prenom">Prénom *</label>
              <input
                id="prenom" type="text" className="input"
                value={prenom} onChange={e => setPrenom(e.target.value)}
                placeholder="Jean-Paul" required autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="nom">Nom</label>
              <input
                id="nom" type="text" className="input"
                value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Rakoto"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label" htmlFor="email">Email *</label>
            <input
              id="email" type="email" className="input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jeanpaul@email.com" required
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp *</label>
            <input
              id="whatsapp" type="tel" className="input"
              value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="+261 34 00 000 00" required
            />
          </div>

          {/* Étape */}
          <div>
            <label className="label" htmlFor="etape">Étape *</label>
            <div style={{ position: 'relative' }}>
              <select
                id="etape" value={etape}
                onChange={e => setEtape(e.target.value as Etape)}
                className="input" required
                style={{ appearance: 'none', paddingRight: '2.5rem', cursor: 'pointer' }}
              >
                {(Object.entries(ETAPE_LABELS) as [Etape, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <ChevronDown size={15} style={{
                position: 'absolute', right: '0.875rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className="label" htmlFor="pin">PIN membre (4 chiffres) *</label>
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
              <input
                id="pin" type="text" className="input"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                pattern="[0-9]{4}" maxLength={4}
                required
                style={{
                  width: 100, textAlign: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800, fontSize: '1.5rem',
                  letterSpacing: '0.25em',
                }}
              />
              <button
                type="button"
                onClick={() => setPin(generatePin())}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 0.875rem', borderRadius: '0.625rem',
                  border: '1.5px solid var(--border)', background: 'transparent',
                  color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 150ms ease',
                }}
              >
                <RefreshCw size={13} /> Régénérer
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '0.375rem' }}>
              À communiquer verbalement au membre après inscription.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem', borderRadius: '0.875rem',
              border: 'none',
              background: loading ? 'rgba(15,45,53,0.5)' : 'var(--brand)',
              color: 'white',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.0625rem',
              letterSpacing: '-0.02em',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(15,45,53,0.2)',
              transition: 'all 200ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} />
                Inscription en cours…
              </>
            ) : '+ Inscrire ce membre'}
          </button>
        </form>
      </div>
    </div>
  )
}
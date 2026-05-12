'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Trophy, Lock } from 'lucide-react'

interface Props {
  error?: 'not_found' | 'pin_required' | 'wrong_pin'
  email?: string
}

const ERROR_MESSAGES = {
  not_found:   'Aucun membre trouvé avec cet email. Vérifiez votre saisie ou contactez un animateur Cart\'In.',
  pin_required: 'Ce compte est protégé. Entrez votre PIN à 4 chiffres.',
  wrong_pin:   'PIN incorrect. Contactez un animateur Cart\'In si vous avez oublié votre PIN.',
}

export default function PortailForm({ error, email: defaultEmail = '' }: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [pin,   setPin]   = useState('')
  const [showPin, setShowPin] = useState(error === 'pin_required' || error === 'wrong_pin')
  const router  = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const params = new URLSearchParams({ email: email.trim().toLowerCase() })
    if (pin.trim()) params.set('pin', pin.trim())
    router.push(`/portail?${params.toString()}`)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-0)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Image
          src="/cartin_logo_dark.png"
          alt="Cart'In"
          width={72} height={72}
          style={{ objectFit: 'contain', margin: '0 auto 1.5rem' }}
        />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          background: 'rgba(15,45,53,0.06)', borderRadius: 9999,
          padding: '0.25rem 0.875rem', marginBottom: '1.25rem',
        }}>
          <Trophy size={12} style={{ color: 'var(--accent)' }} />
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--accent)',
          }}>
            VHR Privilèges
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
          fontWeight: 900, letterSpacing: '-0.035em',
          color: 'var(--text-1)', marginBottom: '0.5rem',
        }}>
          Mon espace
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Accédez à votre profil VHR Privilèges.
        </p>

        {error && (
          <div
            className={`alert ${error === 'not_found' ? 'alert-warning' : 'alert-error'} animate-fade-in`}
            style={{ marginBottom: '1.25rem', textAlign: 'left' }}
          >
            <span>{ERROR_MESSAGES[error]}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: '1rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-4)',
              pointerEvents: 'none',
            }} />
            <input
              type="email"
              className="input"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ paddingLeft: '2.75rem', textAlign: 'left' }}
            />
          </div>

          {/* PIN */}
          {showPin ? (
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{
                position: 'absolute', left: '1rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-4)',
                pointerEvents: 'none',
              }} />
              <input
                type="text"
                className="input"
                placeholder="PIN à 4 chiffres"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                pattern="[0-9]{4}"
                maxLength={4}
                autoFocus
                style={{
                  paddingLeft: '2.75rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPin(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                padding: '0.625rem', borderRadius: '0.625rem',
                border: '1.5px dashed var(--border)',
                background: 'transparent', color: 'var(--text-4)',
                fontSize: '0.8125rem', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Lock size={12} /> J&apos;ai un PIN
            </button>
          )}

          <button
            type="submit"
            disabled={!email.trim() || (showPin && pin.length !== 4)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem', borderRadius: '0.75rem',
              border: 'none',
              background: (!email.trim() || (showPin && pin.length !== 4)) ? 'var(--bg-2)' : 'var(--brand)',
              color: (!email.trim() || (showPin && pin.length !== 4)) ? 'var(--text-4)' : 'white',
              fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 200ms ease',
            }}
          >
            Accéder à mon espace
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: 'var(--text-4)', fontSize: '0.8125rem' }}>
          Cart&apos;In × Rallye VHR Madagascar 2026
        </p>
      </div>
    </div>
  )
}
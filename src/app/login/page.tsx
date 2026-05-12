'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, LogIn, AlertCircle, Trophy } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-0)',
      display: 'flex',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Panneau gauche — branding (desktop uniquement) ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '45%',
          background: 'var(--brand)',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cercles décoratifs */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 50% 120%, rgba(51,128,141,0.35) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '-25%', right: '-15%',
          width: '65%', aspectRatio: '1',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '-20%',
          width: '55%', aspectRatio: '1',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.04)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Image
            src="/cartin_logo_transparent.png"
            alt="Cart'In"
            width={110}
            height={110}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Contenu central */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Pill badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '9999px',
            padding: '0.375rem 1rem',
            marginBottom: '1.75rem',
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#4ade80',
              display: 'block',
              boxShadow: '0 0 6px #4ade80',
            }} />
            <span style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}>
              Rallye VHR Madagascar 2026
            </span>
          </div>

          {/* Titre */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1.0,
            letterSpacing: '-0.045em',
            marginBottom: '1.25rem',
          }}>
            VHR<br />
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>Privilèges</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            maxWidth: '300px',
          }}>
            Programme de fidélité exclusif — 5ème édition du Rallye VHR Madagascar.
          </p>
        </div>

        {/* Stats bas */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {[
            { value: '~150', label: 'Membres' },
            { value: '4',    label: 'Paliers' },
            { value: '9',    label: 'Lots soirée' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.625rem',
                fontWeight: 800,
                color: 'white',
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{
                fontSize: '0.6875rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: '0.25rem',
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1.5rem, 6vw, 4rem)',
      }}>

        {/* Logo mobile uniquement */}
        <div
          className="lg:hidden"
          style={{ marginBottom: '2rem' }}
        >
          <Image
            src="/cartin_logo_dark.png"
            alt="Cart'In"
            width={80}
            height={80}
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* En-tête */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <Trophy size={14} style={{ color: 'var(--accent)' }} />
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
              }}>
                Espace équipe Cart&apos;In
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              color: 'var(--text-1)',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
            }}>
              Connexion
            </h2>
            <p style={{
              color: 'var(--text-3)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
            }}>
              Accédez à votre tableau de bord VHR Privilèges.
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              className="alert alert-error animate-fade-in"
              style={{ marginBottom: '1.5rem' }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form
            onSubmit={handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="vous@cartin.mg"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="label" htmlFor="password">
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  style={{
                    position: 'absolute',
                    right: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-4)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    transition: 'color 150ms ease',
                  }}
                >
                  {showPassword
                    ? <EyeOff size={15} />
                    : <Eye size={15} />
                  }
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                letterSpacing: '-0.01em',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                background: loading ? 'var(--brand-mid)' : 'var(--brand)',
                color: 'white',
                boxShadow: '0 1px 2px rgba(15,45,53,0.12)',
                transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                opacity: (!email || !password) ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <span
                    className="animate-spin"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.25)',
                      borderTopColor: 'white',
                      display: 'inline-block',
                    }}
                  />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Pied de page */}
          <div style={{
            marginTop: '2.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'var(--text-4)',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
            }}>
              Accès réservé à l&apos;équipe Cart&apos;In.<br />
              Contactez l&apos;administrateur pour tout accès.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
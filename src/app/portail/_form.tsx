'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Trophy } from 'lucide-react'

export default function PortailForm({ notFound }: { notFound?: boolean }) {
  const [email, setEmail] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    router.push(`/portail?email=${encodeURIComponent(email.trim().toLowerCase())}`)
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
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>
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
          Entrez votre email pour accéder à votre profil VHR Privilèges.
        </p>

        {notFound && (
          <div className="alert alert-warning animate-fade-in" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <span>Aucun membre trouvé avec cet email. Vérifiez votre saisie ou contactez un animateur Cart&apos;In.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            type="email"
            className="input"
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={{ textAlign: 'center', fontSize: '1rem' }}
          />
          <button
            type="submit"
            disabled={!email.trim()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem', borderRadius: '0.75rem',
              border: 'none', background: !email.trim() ? 'var(--bg-2)' : 'var(--brand)',
              color: !email.trim() ? 'var(--text-4)' : 'white',
              fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 200ms ease',
            }}
          >
            <Search size={16} /> Accéder à mon espace
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: 'var(--text-4)', fontSize: '0.8125rem' }}>
          Cart&apos;In × Rallye VHR Madagascar 2026
        </p>
      </div>
    </div>
  )
}
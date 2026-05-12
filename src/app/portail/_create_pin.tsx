'use client'

import { useActionState, useState } from 'react'
import { createPin } from '@/app/actions/portail'
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function CreatePinForm({ email, memberName }: { email: string; memberName: string }) {
  const [pin,          setPin]          = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [pinVisible,   setPinVisible]   = useState(false)
  const [confVisible,  setConfVisible]  = useState(false)
  const [state, action, isPending] = useActionState(createPin, null)

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-0)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <Image src="/cartin_logo_dark.png" alt="Cart'In" width={64} height={64}
          style={{ objectFit: 'contain', margin: '0 auto 1.5rem' }} />

        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(15,45,53,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Lock size={24} style={{ color: 'var(--brand)' }} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.625rem', letterSpacing: '-0.035em', color: 'var(--text-1)', marginBottom: '0.5rem' }}>
          Créez votre PIN
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Bonjour <strong>{memberName}</strong>, choisissez un PIN à 4 chiffres pour sécuriser votre espace.
        </p>

        {state?.error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>{state.error}</span>
          </div>
        )}

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="email" value={email} />

          {/* PIN */}
          <div>
            <label className="label" htmlFor="pin" style={{ textAlign: 'left', display: 'block' }}>
              Votre PIN *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pin" name="pin"
                type={pinVisible ? 'text' : 'password'}
                className="input"
                placeholder="• • • •"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                pattern="[0-9]{4}" maxLength={4}
                inputMode="numeric" required
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '2rem', letterSpacing: '0.5em',
                  textAlign: 'center', paddingRight: '3rem',
                }}
              />
              <button type="button" onClick={() => setPinVisible(v => !v)}
                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: '0.25rem' }}>
                {pinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="label" htmlFor="pin_confirm" style={{ textAlign: 'left', display: 'block' }}>
              Confirmer le PIN *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pin_confirm" name="pin_confirm"
                type={confVisible ? 'text' : 'password'}
                className="input"
                placeholder="• • • •"
                value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                pattern="[0-9]{4}" maxLength={4}
                inputMode="numeric" required
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '2rem', letterSpacing: '0.5em',
                  textAlign: 'center', paddingRight: '3rem',
                  borderColor: confirm.length === 4 && confirm !== pin ? '#dc2626' : 'var(--border)',
                }}
              />
              <button type="button" onClick={() => setConfVisible(v => !v)}
                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: '0.25rem' }}>
                {confVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirm.length === 4 && confirm !== pin && (
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem', textAlign: 'left' }}>
                Les PINs ne correspondent pas.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || pin.length !== 4 || pin !== confirm}
            style={{
              marginTop: '0.5rem', padding: '0.875rem',
              borderRadius: '0.875rem', border: 'none',
              background: (isPending || pin.length !== 4 || pin !== confirm) ? 'var(--bg-2)' : 'var(--brand)',
              color: (isPending || pin.length !== 4 || pin !== confirm) ? 'var(--text-4)' : 'white',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem',
              letterSpacing: '-0.02em',
              cursor: (isPending || pin.length !== 4 || pin !== confirm) ? 'not-allowed' : 'pointer',
              transition: 'all 200ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {isPending
              ? <><span className="animate-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block' }} /> Création…</>
              : <><CheckCircle2 size={16} /> Créer mon PIN</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { resetMemberPin } from '@/app/actions/members'
import { KeyRound, Copy, Check, X } from 'lucide-react'

export default function ResetPinButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [loading,  setLoading]  = useState(false)
  const [tempPin,  setTempPin]  = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)

  async function handle() {
    if (!confirm(`Réinitialiser le PIN de ${memberName} ?\nUn PIN temporaire sera généré.`)) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 0))
    const result = await resetMemberPin(memberId)
    if ('tempPin' in result) setTempPin(result.tempPin)
    setLoading(false)
  }

  function copy() {
    if (!tempPin) return
    navigator.clipboard.writeText(tempPin).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (tempPin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1rem', letterSpacing: '0.2em',
          background: '#dcfce7', color: '#16a34a',
          padding: '0.2rem 0.625rem', borderRadius: '0.375rem',
        }}>
          {tempPin}
        </span>
        <button onClick={copy} title="Copier" style={{ width: 24, height: 24, borderRadius: '0.375rem', border: 'none', background: 'transparent', color: copied ? '#16a34a' : 'var(--text-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
        <button onClick={() => setTempPin(null)} title="Fermer" style={{ width: 24, height: 24, borderRadius: '0.375rem', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={`Réinitialiser le PIN de ${memberName}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
        border: '1px solid var(--border)', background: 'transparent',
        color: 'var(--text-4)', fontSize: '0.75rem', fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = '#fef9c3'
        ;(e.currentTarget as HTMLElement).style.color = '#d97706'
        ;(e.currentTarget as HTMLElement).style.borderColor = '#d97706'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-4)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }}
    >
      {loading
        ? <span className="animate-spin" style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text-4)', display: 'inline-block' }} />
        : <KeyRound size={11} />
      }
      PIN
    </button>
  )
}
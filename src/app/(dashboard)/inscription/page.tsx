'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChevronDown, AlertCircle } from 'lucide-react'
import { ETAPE_LABELS } from '@/types'
import type { Etape } from '@/types'
import { logMemberCreated } from '@/app/actions/members'

export default function InscriptionPage() {
  const [prenom,   setPrenom]   = useState('')
  const [nom,      setNom]      = useState('')
  const [email,    setEmail]    = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [etape,    setEtape]    = useState<Etape>('15_akoor_depart')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [lastName, setLastName] = useState('')
  const [count,    setCount]    = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    await new Promise(r => setTimeout(r, 0))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: insertError } = await supabase
      .from('members')
      .insert({
        prenom:     prenom.trim(),
        nom:        nom.trim() || null,
        email:      email.trim().toLowerCase(),
        whatsapp:   whatsapp.trim(),
        etape,
        created_by: user?.id ?? null,
      })
      .select('id')

    if (insertError) {
      if (insertError.code === '23505') {
        if (insertError.message.toLowerCase().includes('whatsapp')) {
          setError('Ce numéro WhatsApp est déjà inscrit.')
        } else {
          setError('Cet email est déjà inscrit.')
        }
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    // Log audit (fire-and-forget)
    if (data?.[0]?.id) {
      logMemberCreated(
        data[0].id,
        `${prenom.trim()}${nom.trim() ? ' ' + nom.trim() : ''}`,
        etape
      )
    }

    setLastName(prenom.trim())
    setCount(c => c + 1)
    setSuccess(true)
    setLoading(false)
  }

  function handleNew() {
    setPrenom(''); setNom(''); setEmail('')
    setWhatsapp(''); setEtape('15_akoor_depart')
    setError(null); setSuccess(false)
  }

  if (success) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '2rem',
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
          marginBottom: '0.5rem',
        }}>
          {lastName} est inscrit{lastName.endsWith('e') ? 'e' : ''} !
        </h2>

        {count > 1 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: 'rgba(15,45,53,0.07)',
            padding: '0.25rem 0.875rem', borderRadius: 9999,
            fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)',
            marginBottom: '1rem',
          }}>
            {count} inscrits cette session
          </div>
        )}

        <div style={{
          background: 'var(--bg-1)', borderRadius: '0.875rem',
          padding: '1rem 1.5rem', marginBottom: '1.5rem', maxWidth: 360,
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Le membre pourra créer son propre PIN en accédant à son espace sur{' '}
            <strong>vhr-privileges.vercel.app/portail</strong>
          </p>
        </div>

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
        <p className="page-subtitle">Enregistrez un participant au Programme VHR Privilèges.</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

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

          <div>
            <label className="label" htmlFor="email">Email *</label>
            <input
              id="email" type="email" className="input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jeanpaul@email.com" required
            />
          </div>

          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp *</label>
            <input
              id="whatsapp" type="tel" className="input"
              value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="+261 34 00 000 00" required
            />
          </div>

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
                <span className="animate-spin" style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', display: 'inline-block',
                }} />
                Inscription en cours…
              </>
            ) : '+ Inscrire ce membre'}
          </button>
        </form>
      </div>
    </div>
  )
}
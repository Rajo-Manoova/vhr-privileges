'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserPlus, CheckCircle, RotateCcw,
  AlertCircle, ChevronDown, Users
} from 'lucide-react'
import Link from 'next/link'
import type { Etape } from '@/types'
import { ETAPE_LABELS } from '@/types'

export default function InscriptionPage() {
  const [prenom,   setPrenom]   = useState('')
  const [nom,      setNom]      = useState('')
  const [email,    setEmail]    = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [etape,    setEtape]    = useState<Etape | ''>('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<{ prenom: string; email: string } | null>(null)
  const [sessionCount, setSessionCount] = useState(0)

  const canSubmit = !!etape && !!prenom.trim() && !!email.trim() && !!whatsapp.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!etape || !canSubmit) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.from('members').insert({
      prenom:   prenom.trim(),
      nom:      nom.trim() || null,
      email:    email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      etape,
    })

    if (err) {
      setError(
        err.code === '23505'
          ? 'Cet email est déjà inscrit dans le programme VHR Privilèges.'
          : `Erreur lors de l'inscription : ${err.message}`
      )
      setLoading(false)
      return
    }

    setSuccess({ prenom: prenom.trim(), email: email.trim().toLowerCase() })
    setSessionCount(n => n + 1)
    setLoading(false)
  }

  function registerNext() {
    setPrenom('')
    setNom('')
    setEmail('')
    setWhatsapp('')
    setError(null)
    setSuccess(null)
    // Garde la même étape pour les inscriptions consécutives
  }

  /* ─── Vue Succès ─────────────────────────────── */
  if (success) {
    return (
      <div
        className="animate-scale-in"
        style={{
          maxWidth: 460,
          margin: '2rem auto 0',
          textAlign: 'center',
        }}
      >
        {/* Icône */}
        <div style={{
          width: 88, height: 88,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.75rem',
          boxShadow: '0 8px 24px rgba(22,163,74,0.18)',
        }}>
          <CheckCircle size={44} style={{ color: '#16a34a' }} />
        </div>

        {/* Nom */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: 'var(--text-1)',
          marginBottom: '0.5rem',
        }}>
          {success.prenom} est inscrit·e !
        </h2>

        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
          {success.email}
        </p>

        <p style={{
          color: 'var(--text-4)',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Membre VHR Privilèges activé.<br />
          Éligible au tirage au sort du 16 Mai.
        </p>

        {/* Compteur session */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 9999,
          padding: '0.375rem 1rem',
          marginBottom: '2rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-2)',
          fontFamily: 'var(--font-display)',
        }}>
          <Users size={13} style={{ color: 'var(--brand-light)' }} />
          {sessionCount} inscription{sessionCount > 1 ? 's' : ''} cette session
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: 340,
          margin: '0 auto',
        }}>
          <button
            onClick={registerNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.9375rem 1.5rem',
              borderRadius: '0.875rem',
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,45,53,0.25)',
              transition: 'all 200ms ease',
            }}
          >
            <RotateCcw size={17} />
            Personne suivante
          </button>

          <Link
            href="/membres"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.875rem',
              borderRadius: '0.75rem',
              border: '1.5px solid var(--border)',
              background: 'transparent',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-2)',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Users size={15} />
            Voir la liste des membres
          </Link>
        </div>
      </div>
    )
  }

  /* ─── Formulaire ─────────────────────────────── */
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inscription</h1>
        <p className="page-subtitle">
          Enregistrez les participants pour leur ouvrir l&apos;accès au programme.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="alert alert-error animate-fade-in"
          style={{ marginBottom: '1.5rem', maxWidth: 540 }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 540,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Étape */}
        <div>
          <label className="label" htmlFor="etape">Étape actuelle *</label>
          <div style={{ position: 'relative' }}>
            <select
              id="etape"
              required
              value={etape}
              onChange={e => setEtape(e.target.value as Etape)}
              className="input"
              style={{ appearance: 'none', paddingRight: '2.75rem', cursor: 'pointer' }}
            >
              <option value="" disabled>Sélectionner l&apos;étape…</option>
              {(Object.entries(ETAPE_LABELS) as [Etape, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-4)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Diviseur */}
        <div className="divider" />

        {/* Prénom + Nom */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
        }}>
          <div>
            <label className="label" htmlFor="prenom">Prénom *</label>
            <input
              id="prenom"
              type="text"
              className="input"
              placeholder="Rakoto"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="label" htmlFor="nom">
              Nom <span style={{ color: 'var(--text-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                (optionnel)
              </span>
            </label>
            <input
              id="nom"
              type="text"
              className="input"
              placeholder="Rasolofo"
              value={nom}
              onChange={e => setNom(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="label" htmlFor="email">Adresse email *</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="rakoto@exemple.mg"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <p style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-4)' }}>
            Identifiant unique — utilisé pour les notifications et le tirage.
          </p>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="label" htmlFor="whatsapp">Numéro WhatsApp *</label>
          <input
            id="whatsapp"
            type="tel"
            className="input"
            placeholder="+261 34 00 000 00"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            required
            autoComplete="tel"
          />
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          style={{
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.9375rem 1.5rem',
            borderRadius: '0.875rem',
            border: 'none',
            cursor: !canSubmit ? 'not-allowed' : loading ? 'wait' : 'pointer',
            background: !canSubmit ? 'var(--bg-2)' : 'var(--brand)',
            color: !canSubmit ? 'var(--text-4)' : 'white',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            letterSpacing: '-0.01em',
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            boxShadow: !canSubmit ? 'none' : '0 2px 12px rgba(15,45,53,0.22)',
          }}
        >
          {loading ? (
            <>
              <span
                className="animate-spin"
                style={{
                  width: 17, height: 17,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,0.25)',
                  borderTopColor: 'white',
                  display: 'inline-block',
                }}
              />
              Inscription en cours…
            </>
          ) : (
            <>
              <UserPlus size={17} />
              Inscrire au programme VHR Privilèges
            </>
          )}
        </button>
      </form>
    </div>
  )
}
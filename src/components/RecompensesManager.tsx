'use client'

import { useState } from 'react'
import { addTierReward, markTierRewardDelivered } from '@/app/actions/recompenses'
import { useRouter } from 'next/navigation'
import { Gift, CheckCircle2, Clock, ChevronDown, AlertCircle, Award } from 'lucide-react'
import type { Lot } from '@/types'

type MemberWithTier = {
  id: string
  prenom: string
  nom: string | null
  email: string
  cumul: number
  palier: 'argent' | 'or' | 'vip'
  rewards: Array<{ id: string; palier: string; lot_nom: string; statut: string; claimed_at: string }>
}

interface Props {
  members: MemberWithTier[]
  lots: Lot[]
}

const PALIER_CONFIG = {
  argent: { label: 'Argent', tierClass: 'tier-argent', lotPalier: 'argent' },
  or:     { label: 'Or',     tierClass: 'tier-or',     lotPalier: 'or'     },
  vip:    { label: 'VIP',    tierClass: 'tier-vip',    lotPalier: 'vip'    },
}

function formatAr(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' Ar'
}

export default function RecompensesManager({ members, lots }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formMember, setFormMember] = useState<string | null>(null)
  const [selectedLot, setSelectedLot] = useState('')
  const [customLot, setCustomLot] = useState('')
  const [saving, setSaving] = useState(false)
  const [delivering, setDelivering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAddReward(member: MemberWithTier) {
    const lotNom = selectedLot || customLot.trim()
    if (!lotNom) { setError('Sélectionnez ou saisissez un lot.'); return }

    setSaving(true)
    setError(null)
    const lotObj = lots.find(l => l.id === selectedLot)
    const result = await addTierReward(member.id, member.palier as any, lotObj?.nom ?? lotNom, lotObj?.id)

    if (result.error) {
      setError(result.error)
    } else {
      setFormMember(null)
      setSelectedLot('')
      setCustomLot('')
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDeliver(rewardId: string) {
    setDelivering(rewardId)
    await markTierRewardDelivered(rewardId)
    setDelivering(null)
    router.refresh()
  }

  const eligibleLots = (member: MemberWithTier) => {
    const palierMap: Record<string, string> = { argent: 'argent', or: 'or', vip: 'vip' }
    return lots.filter(l => l.palier === palierMap[member.palier])
  }

  if (members.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <Award size={36} />
        <h3>Aucun membre éligible</h3>
        <p>Les membres atteignant Argent, Or ou VIP apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680 }}>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {(['argent', 'or', 'vip'] as const).map(p => {
          const cfg = PALIER_CONFIG[p]
          const count = members.filter(m => m.palier === p).length
          return (
            <div key={p} className="stat-card">
              <span className={cfg.tierClass}>{cfg.label}</span>
              <div className="stat-value" style={{ marginTop: '0.5rem' }}>{count}</div>
              <div className="stat-label">membre{count > 1 ? 's' : ''}</div>
            </div>
          )
        })}
      </div>

      {/* Liste membres */}
      {members.map(member => {
        const cfg = PALIER_CONFIG[member.palier as keyof typeof PALIER_CONFIG]
        const pendingCount = member.rewards.filter(r => r.statut === 'claimed').length
        const isExpanded = expandedId === member.id
        const showForm = formMember === member.id

        return (
          <div key={member.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
            {/* Header du membre */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : member.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '1rem 1.25rem', cursor: 'pointer',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem',
                color: 'var(--brand)', flexShrink: 0,
              }}>
                {member.prenom.charAt(0)}{(member.nom ?? '').charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
                    {member.prenom} {member.nom ?? ''}
                  </span>
                  <span className={cfg.tierClass}>{cfg.label}</span>
                  {pendingCount > 0 && (
                    <span style={{ background: 'var(--accent)', color: 'white', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 9999 }}>
                      {pendingCount} à livrer
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '0.125rem' }}>
                  Cumul : {formatAr(member.cumul)}
                </div>
              </div>

              <ChevronDown size={16} style={{ color: 'var(--text-4)', transition: 'transform 200ms ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </div>

            {/* Contenu étendu */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', background: 'var(--bg-0)', animation: 'fadeIn 0.2s ease both' }}>

                {/* Récompenses existantes */}
                {member.rewards.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>
                      Récompenses enregistrées
                    </div>
                    {member.rewards.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '0.5rem', marginBottom: '0.375rem' }}>
                        {r.statut === 'delivered'
                          ? <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                          : <Clock size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.lot_nom}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)' }}>
                            Palier {r.palier} · {new Date(r.claimed_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        {r.statut === 'claimed' && (
                          <button
                            onClick={() => handleDeliver(r.id)}
                            disabled={delivering === r.id}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                              border: 'none', background: '#dcfce7', color: '#16a34a',
                              fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'var(--font-body)', flexShrink: 0,
                            }}
                          >
                            {delivering === r.id ? '…' : <><CheckCircle2 size={11} /> Livré</>}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire ajout récompense */}
                {showForm ? (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.625rem' }}>
                      Enregistrer une récompense {cfg.label}
                    </div>

                    {error && (
                      <div className="alert alert-error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem' }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem' }}>{error}</span>
                      </div>
                    )}

                    {eligibleLots(member).length > 0 && (
                      <div style={{ marginBottom: '0.625rem' }}>
                        <label className="label" htmlFor={`lot-sel-${member.id}`}>Lot du catalogue</label>
                        <div style={{ position: 'relative' }}>
                          <select
                            id={`lot-sel-${member.id}`}
                            value={selectedLot}
                            onChange={e => { setSelectedLot(e.target.value); setCustomLot('') }}
                            className="input"
                            style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                          >
                            <option value="">Sélectionner dans le catalogue…</option>
                            {eligibleLots(member).map(l => (
                              <option key={l.id} value={l.id}>{l.nom}</option>
                            ))}
                          </select>
                          <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label className="label" htmlFor={`lot-custom-${member.id}`}>
                        {eligibleLots(member).length > 0 ? 'Ou saisir un nom personnalisé' : 'Nom du lot *'}
                      </label>
                      <input
                        id={`lot-custom-${member.id}`}
                        type="text"
                        className="input"
                        placeholder="Nom du lot…"
                        value={customLot}
                        onChange={e => { setCustomLot(e.target.value); setSelectedLot('') }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleAddReward(member)}
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand)', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1 }}
                      >
                        {saving ? 'Enregistrement…' : <><Gift size={13} /> Enregistrer</>}
                      </button>
                      <button onClick={() => { setFormMember(null); setError(null); setSelectedLot(''); setCustomLot('') }} style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setFormMember(member.id); setError(null) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}
                  >
                    <Gift size={14} /> Attribuer une récompense {cfg.label}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
'use client'

import { useState, useTransition } from 'react'
import { saveTirageTypeConfig } from '@/app/actions/settings'
import { ChevronDown, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import type { LotCategorie, TirageType, TirageTypeConfig } from '@/types'
import { TIRAGE_TYPE_LABELS, CATEGORIE_LABELS } from '@/types'

/* ── Types ── */

type Rule = { categorie: LotCategorie; qty: number }

type LocalConfig = {
  type: TirageType
  rules: Rule[]
  budgetMax: string
  saved: boolean
  error: string | null
}

/* ── Composant config d'un type ── */

function TypeConfigPanel({
  type,
  initialRules,
  initialBudget,
}: {
  type: TirageType
  initialRules: Rule[]
  initialBudget: number | null
}) {
  const [rules,      setRules]      = useState<Rule[]>(initialRules)
  const [budgetMax,  setBudgetMax]  = useState(initialBudget?.toString() ?? '')
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [saving,     startSave]     = useTransition()

  function addRule() {
    setRules(prev => [...prev, { categorie: 'decouverte', qty: 1 }])
    setSaved(false)
  }

  function removeRule(i: number) {
    setRules(prev => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  function updateRule(i: number, field: keyof Rule, value: string | number) {
    setRules(prev => prev.map((r, idx) =>
      idx === i ? { ...r, [field]: field === 'qty' ? Number(value) : value } : r
    ))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    const budget = budgetMax ? parseInt(budgetMax) : null
    startSave(async () => {
      const result = await saveTirageTypeConfig(type, rules, budget)
      if (result.error) setError(result.error)
      else setSaved(true)
    })
  }

  const totalLots    = rules.reduce((s, r) => s + r.qty, 0)
  const isPonctuel   = type === 'ponctuel'

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
            {TIRAGE_TYPE_LABELS[type]}
          </div>
          {isPonctuel && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-4)', marginTop: '0.2rem' }}>
              Tirage libre — aucune règle requise.
            </div>
          )}
        </div>
        {totalLots > 0 && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)', background: 'rgba(15,45,53,0.07)', padding: '0.25rem 0.625rem', borderRadius: 9999 }}>
            {totalLots} lot{totalLots > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!isPonctuel && (
        <>
          {/* Règles lots */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>
              Composition des lots
            </div>

            {rules.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-4)', padding: '0.75rem 0', fontStyle: 'italic' }}>
                Aucune règle — tirage libre.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {/* Catégorie */}
                    <div style={{ position: 'relative', flex: 1 }}>
                      <select
                        value={rule.categorie}
                        onChange={e => updateRule(i, 'categorie', e.target.value)}
                        className="input"
                        style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        {(Object.entries(CATEGORIE_LABELS) as [LotCategorie, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                    </div>

                    {/* Quantité */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-4)' }}>×</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={rule.qty}
                        onChange={e => updateRule(i, 'qty', e.target.value)}
                        className="input"
                        style={{ width: 64, textAlign: 'center', fontSize: '0.875rem' }}
                      />
                    </div>

                    {/* Supprimer */}
                    <button
                      onClick={() => removeRule(i)}
                      style={{ width: 32, height: 32, borderRadius: '0.375rem', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-4)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addRule}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              <Plus size={13} /> Ajouter une règle
            </button>
          </div>

          {/* Budget max */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label" htmlFor={`budget-${type}`}>
              Budget maximum (Ar)
              <span style={{ fontWeight: 400, color: 'var(--text-4)', marginLeft: '0.375rem' }}>— dépassement de 10% toléré</span>
            </label>
            <input
              id={`budget-${type}`}
              type="number"
              min={0}
              className="input"
              style={{ maxWidth: 200 }}
              value={budgetMax}
              onChange={e => { setBudgetMax(e.target.value); setSaved(false) }}
              placeholder="ex : 500000"
            />
          </div>
        </>
      )}

      {/* Erreur / Confirmation */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8125rem' }}>{error}</span>
        </div>
      )}

      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#16a34a', marginBottom: '1rem' }}>
          <CheckCircle2 size={14} /> Enregistré
        </div>
      )}

      {/* Bouton Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: saving ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}
      >
        {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : <><CheckCircle2 size={14} /> Enregistrer</>}
      </button>
    </div>
  )
}

/* ── Page principale (reçoit les configs depuis le server wrapper) ── */

export default function SettingsClient({ configs }: { configs: TirageTypeConfig[] }) {
  const types: TirageType[] = ['ponctuel', 'hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel']

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Configuration des templates de tirage au sort.</p>
      </div>

      <div style={{ maxWidth: 620 }}>
        {types.map(type => {
          const cfg = configs.find(c => c.type === type)
          return (
            <TypeConfigPanel
              key={type}
              type={type}
              initialRules={cfg?.lot_rules ?? []}
              initialBudget={cfg?.budget_max_ar ?? null}
            />
          )
        })}
      </div>
    </div>
  )
}
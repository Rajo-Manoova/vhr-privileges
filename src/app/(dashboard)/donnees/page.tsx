'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Database, Users, TrendingUp, Clock, Wifi, WifiOff,
} from 'lucide-react'

interface SyncStats {
  odooClients: number
  membresTotal: number
  updated: number
  unchanged: number
  niveauChanges: { email: string; ancien: string; nouveau: string }[]
}

interface SyncResult {
  success: boolean
  startedAt?: string
  completedAt?: string
  stats?: SyncStats
  logs?: string[]
  error?: string
}

interface OdooStatus {
  connected: boolean
  odooClients?: number
  error?: string
}

const PALIER_COLORS: Record<string, { bg: string; color: string }> = {
  membre: { bg: '#f3f4f6', color: '#6b7280' },
  argent: { bg: '#eff6ff', color: '#1d4ed8' },
  or:     { bg: '#fef3c7', color: '#92400e' },
  vip:    { bg: '#f3e8ff', color: '#6d28d9' },
}

export default function DonneesPage() {
  const [odooStatus, setOdooStatus]   = useState<OdooStatus | null>(null)
  const [checking, setChecking]       = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [lastResult, setLastResult]   = useState<SyncResult | null>(null)
  const [showLogs, setShowLogs]       = useState(false)

  useEffect(() => {
    checkOdoo()
  }, [])

  async function checkOdoo() {
    setChecking(true)
    try {
      const res = await fetch('/api/sync', { method: 'GET' })
      const data = await res.json()
      setOdooStatus(data)
    } catch {
      setOdooStatus({ connected: false, error: 'Impossible de contacter l\'API' })
    } finally {
      setChecking(false)
    }
  }

  async function runSync() {
    setSyncing(true)
    setLastResult(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setLastResult(data)
      // Refresh Odoo status after sync
      checkOdoo()
    } catch (err: any) {
      setLastResult({ success: false, error: err.message })
    } finally {
      setSyncing(false)
    }
  }

  function formatDuration(start?: string, end?: string) {
    if (!start || !end) return ''
    const ms = new Date(end).getTime() - new Date(start).getTime()
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  function formatDate(iso?: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Indian/Antananarivo',
    })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Données & Synchronisation</h1>
        <p className="page-subtitle">Synchronisez les cumuls d'achats depuis Odoo vers VHR Privilèges.</p>
      </div>

      {/* Statut Odoo */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '0.75rem',
              background: odooStatus?.connected ? '#dcfce7' : odooStatus === null ? 'var(--bg-2)' : '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {odooStatus?.connected
                ? <Wifi size={20} style={{ color: '#16a34a' }} />
                : <WifiOff size={20} style={{ color: odooStatus === null ? 'var(--text-4)' : '#dc2626' }} />
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
                Base Odoo (Cart'In)
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-4)' }}>
                {checking ? 'Vérification...' :
                 odooStatus === null ? 'Non vérifié' :
                 odooStatus.connected
                   ? `Connecté · ${odooStatus.odooClients?.toLocaleString('fr-FR')} clients actifs`
                   : `Déconnecté · ${odooStatus.error ?? 'Erreur inconnue'}`
                }
              </div>
            </div>
          </div>
          <button
            onClick={checkOdoo}
            disabled={checking}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600,
              cursor: checking ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <RefreshCw size={14} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
            Vérifier
          </button>
        </div>
      </div>

      {/* Bouton sync */}
      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <Database size={32} style={{ color: 'var(--brand-light)', margin: '0 auto 0.75rem' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-1)', letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>
            Synchroniser avec Odoo
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-4)', maxWidth: 420, margin: '0 auto' }}>
            Met à jour le cumul d'achats et le niveau de chaque membre à partir des données Cart'In.
          </div>
        </div>

        <button
          onClick={runSync}
          disabled={syncing || !odooStatus?.connected}
          style={{
            marginTop: '1.25rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.875rem 2.5rem', borderRadius: '0.875rem',
            border: 'none',
            background: syncing || !odooStatus?.connected ? 'var(--bg-2)' : 'var(--brand)',
            color: syncing || !odooStatus?.connected ? 'var(--text-4)' : 'white',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.0625rem',
            letterSpacing: '-0.02em',
            cursor: syncing || !odooStatus?.connected ? 'not-allowed' : 'pointer',
            boxShadow: syncing || !odooStatus?.connected ? 'none' : '0 4px 16px rgba(15,45,53,0.25)',
            transition: 'all 200ms ease',
          }}
        >
          <RefreshCw size={18} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Synchronisation en cours...' : 'Lancer la synchronisation'}
        </button>

        {!odooStatus?.connected && odooStatus !== null && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#dc2626' }}>
            Connexion Odoo requise pour lancer la sync.
          </div>
        )}
      </div>

      {/* Résultat */}
      {lastResult && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {lastResult.success
              ? <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
              : <XCircle size={20} style={{ color: '#dc2626' }} />
            }
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)' }}>
                {lastResult.success ? 'Synchronisation réussie' : 'Échec de la synchronisation'}
              </div>
              {lastResult.startedAt && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                  {formatDate(lastResult.completedAt)} · {formatDuration(lastResult.startedAt, lastResult.completedAt)}
                </div>
              )}
            </div>
          </div>

          {lastResult.success && lastResult.stats && (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Clients Odoo', value: lastResult.stats.odooClients, icon: Database, color: 'var(--brand)' },
                  { label: 'Membres VHR', value: lastResult.stats.membresTotal, icon: Users, color: 'var(--brand-light)' },
                  { label: 'Mis à jour', value: lastResult.stats.updated, icon: RefreshCw, color: '#16a34a' },
                  { label: 'Inchangés', value: lastResult.stats.unchanged, icon: CheckCircle2, color: 'var(--text-4)' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{ background: 'var(--bg-1)', borderRadius: '0.625rem', padding: '0.875rem', textAlign: 'center' }}>
                    <Icon size={16} style={{ color, margin: '0 auto 0.375rem' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                      {value.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Changements de niveau */}
              {lastResult.stats.niveauChanges.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                    {lastResult.stats.niveauChanges.length} changement{lastResult.stats.niveauChanges.length > 1 ? 's' : ''} de niveau
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {lastResult.stats.niveauChanges.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', background: 'var(--bg-0)', borderRadius: '0.5rem', fontSize: '0.8125rem' }}>
                        <span style={{ flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.email}</span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: PALIER_COLORS[c.ancien]?.bg, color: PALIER_COLORS[c.ancien]?.color }}>
                          {c.ancien}
                        </span>
                        <span style={{ color: 'var(--text-4)' }}>→</span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 700, background: PALIER_COLORS[c.nouveau]?.bg, color: PALIER_COLORS[c.nouveau]?.color }}>
                          {c.nouveau}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {lastResult.error && (
            <div className="alert alert-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{lastResult.error}</span>
            </div>
          )}

          {/* Logs */}
          {lastResult.logs && lastResult.logs.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(v => !v)}
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}
              >
                {showLogs ? '▲ Masquer les logs' : '▼ Voir les logs'}
              </button>
              {showLogs && (
                <div style={{ marginTop: '0.5rem', background: '#0d1f2d', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                  {lastResult.logs.map((log, i) => (
                    <div key={i} style={{ color: log.startsWith('✓') ? '#4ade80' : log.startsWith('✗') ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addLot } from '@/app/actions/lots'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, AlertCircle, ChevronDown, Link2, Upload, X, Loader2 } from 'lucide-react'
import type { LotCategorie } from '@/types'
import { CATEGORIE_LABELS } from '@/types'

type PhotoMode = 'url' | 'upload'

export default function CatalogueManager() {
  const [open,       setOpen]       = useState(false)
  const [nom,        setNom]        = useState('')
  const [description,setDescription]= useState('')
  const [categorie,  setCategorie]  = useState<LotCategorie | ''>('')
  const [stock,      setStock]      = useState(1)
  const [valeur,     setValeur]     = useState('')
  const [photoMode,  setPhotoMode]  = useState<PhotoMode>('url')
  const [photoUrl,   setPhotoUrl]   = useState('')
  const [preview,    setPreview]    = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()

  function reset() {
    setNom(''); setDescription(''); setCategorie(''); setStock(1); setValeur('')
    setPhotoUrl(''); setPreview(null); setPhotoMode('url'); setError(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Fichier trop volumineux (max 5 Mo).'); return }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext      = file.name.split('.').pop()
    const path     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error: upErr } = await supabase.storage
      .from('lots')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr || !data) {
      setError('Erreur upload : ' + (upErr?.message ?? 'inconnu'))
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('lots').getPublicUrl(data.path)
    setPhotoUrl(publicUrl)
    setPreview(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || !categorie) { setError('Nom et catégorie sont requis.'); return }

    setSaving(true)
    setError(null)

    const fd = new FormData()
    fd.set('nom',         nom.trim())
    fd.set('description', description.trim())
    fd.set('categorie',   categorie)
    fd.set('stock',       String(stock))
    if (valeur)    fd.set('valeur_ar', valeur)
    if (photoUrl)  fd.set('photo_url', photoUrl)

    const result = await addLot(null, fd)
    if (result?.error) {
      setError(result.error)
      setSaving(false)
    } else {
      reset()
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <div>
      <button
        onClick={() => { setOpen(v => !v); if (open) reset() }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
          background: open ? 'var(--bg-2)' : 'var(--brand)',
          color: open ? 'var(--text-2)' : 'white',
          border: 'none', cursor: 'pointer',
          fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          transition: 'all 150ms ease',
        }}
      >
        <Plus size={15} />
        {open ? 'Annuler' : 'Ajouter un lot'}
      </button>

      {open && (
        <div className="card animate-fade-in" style={{ marginTop: '1rem', maxWidth: 580, borderLeft: '3px solid var(--brand)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
            Nouveau lot
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label className="label" htmlFor="lot-nom">Nom *</label>
              <input id="lot-nom" type="text" className="input" value={nom} onChange={e => setNom(e.target.value)} placeholder="ex : Dreame H15 Pro Aspirateur" required />
            </div>

            <div>
              <label className="label" htmlFor="lot-desc">Description</label>
              <input id="lot-desc" type="text" className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description courte (optionnel)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {/* Catégorie */}
              <div>
                <label className="label" htmlFor="lot-cat">Catégorie *</label>
                <div style={{ position: 'relative' }}>
                  <select id="lot-cat" value={categorie} onChange={e => setCategorie(e.target.value as LotCategorie)} className="input" required
                    style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
                    <option value="" disabled>Catégorie…</option>
                    {(Object.entries(CATEGORIE_LABELS) as [LotCategorie, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="lot-stock">Stock</label>
                <input id="lot-stock" type="number" className="input" value={stock} onChange={e => setStock(Number(e.target.value))} min={0} />
              </div>

              <div>
                <label className="label" htmlFor="lot-valeur">Valeur (Ar)</label>
                <input id="lot-valeur" type="number" className="input" value={valeur} onChange={e => setValeur(e.target.value)} placeholder="Optionnel" min={0} />
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="label">Photo</label>

              {/* Toggle URL / Upload */}
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {(['url', 'upload'] as PhotoMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setPhotoMode(mode); setPhotoUrl(''); setPreview(null) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.3rem 0.75rem', borderRadius: '0.5rem',
                      border: `1.5px solid ${photoMode === mode ? 'var(--brand)' : 'var(--border)'}`,
                      background: photoMode === mode ? 'rgba(15,45,53,0.06)' : 'transparent',
                      color: photoMode === mode ? 'var(--brand)' : 'var(--text-4)',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    {mode === 'url' ? <><Link2 size={12} /> Lien URL</> : <><Upload size={12} /> Fichier</>}
                  </button>
                ))}
              </div>

              {photoMode === 'url' ? (
                <input
                  type="url"
                  className="input"
                  value={photoUrl}
                  onChange={e => { setPhotoUrl(e.target.value); setPreview(e.target.value || null) }}
                  placeholder="https://…"
                />
              ) : (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem',
                      border: '1.5px dashed var(--border)', background: 'transparent',
                      color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600,
                      cursor: uploading ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    {uploading
                      ? <><Loader2 size={14} className="animate-spin" /> Upload en cours…</>
                      : <><Upload size={14} /> Choisir une image</>
                    }
                  </button>
                </div>
              )}

              {/* Prévisualisation */}
              {preview && (
                <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                  <img
                    src={preview}
                    alt="Aperçu"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'block' }}
                    onError={() => setPreview(null)}
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoUrl(''); setPreview(null) }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button type="button" onClick={() => { setOpen(false); reset() }}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Annuler
              </button>
              <button type="submit" disabled={saving || uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: (saving || uploading) ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: (saving || uploading) ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Ajout…</>
                  : <><CheckCircle2 size={14} /> Ajouter au catalogue</>
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
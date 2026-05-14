'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateLot } from '@/app/actions/lots'
import { CheckCircle2, AlertCircle, ChevronDown, Link2, Upload, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Lot, LotCategorie } from '@/types'
import { CATEGORIE_LABELS } from '@/types'

type PhotoMode = 'url' | 'upload'

export default function LotEditForm({ lot }: { lot: Lot }) {
  const [photoMode, setPhotoMode] = useState<PhotoMode>('url')
  const [photoUrl,  setPhotoUrl]  = useState(lot.photo_url ?? '')
  const [preview,   setPreview]   = useState<string | null>(lot.photo_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Fichier trop volumineux (max 5 Mo).'); return }

    setUploading(true)
    setUploadErr(null)

    const supabase = createClient()
    const ext      = file.name.split('.').pop()
    const path     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error: upErr } = await supabase.storage
      .from('lots')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (upErr || !data) {
      setUploadErr('Erreur upload : ' + (upErr?.message ?? 'inconnu'))
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('lots').getPublicUrl(data.path)
    setPhotoUrl(publicUrl)
    setPreview(publicUrl)
    setUploading(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    // Injecter la photo_url résolue (URL externe ou Supabase)
    fd.set('photo_url', photoUrl)
    startTransition(async () => {
      const result = await updateLot(null, fd)
      if (result?.error) setFormError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <input type="hidden" name="id" value={lot.id} />

      {(formError || uploadErr) && (
        <div className="alert alert-error">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem' }}>{formError ?? uploadErr}</span>
        </div>
      )}

      <div>
        <label className="label" htmlFor="edit-lot-nom">Nom *</label>
        <input id="edit-lot-nom" name="nom" type="text" className="input" defaultValue={lot.nom} required />
      </div>

      <div>
        <label className="label" htmlFor="edit-lot-desc">Description</label>
        <input id="edit-lot-desc" name="description" type="text" className="input" defaultValue={lot.description ?? ''} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {/* Catégorie */}
        <div>
          <label className="label" htmlFor="edit-lot-cat">Catégorie *</label>
          <div style={{ position: 'relative' }}>
            <select id="edit-lot-cat" name="categorie" className="input" defaultValue={lot.categorie} required
              style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}>
              {(Object.entries(CATEGORIE_LABELS) as [LotCategorie, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="edit-lot-stock">Stock</label>
          <input id="edit-lot-stock" name="stock" type="number" className="input" defaultValue={lot.stock} min={0} />
        </div>

        <div>
          <label className="label" htmlFor="edit-lot-valeur">Valeur (Ar)</label>
          <input id="edit-lot-valeur" name="valeur_ar" type="number" className="input" defaultValue={lot.valeur_ar ?? ''} min={0} />
        </div>
      </div>

      {/* Photo */}
      <div>
        <label className="label">Photo</label>

        {/* Toggle */}
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

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button type="submit" disabled={isPending || uploading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: (isPending || uploading) ? 'rgba(15,45,53,0.5)' : 'var(--brand)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: (isPending || uploading) ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 150ms ease' }}>
          {isPending
            ? <><Loader2 size={13} className="animate-spin" /> Enregistrement…</>
            : <><CheckCircle2 size={13} /> Enregistrer</>
          }
        </button>
        <Link href="/catalogue" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
          Annuler
        </Link>
      </div>
    </form>
  )
}
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  buildUrl: (page: number) => string
}

function btnStyle(active: boolean, disabled = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '0.5rem',
    fontSize: '0.875rem', fontWeight: active ? 700 : 500,
    textDecoration: 'none',
    background: active ? 'var(--brand)' : 'white',
    color: active ? 'white' : disabled ? 'var(--border)' : 'var(--text-2)',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    opacity: disabled ? 0.4 : 1,
    pointerEvents: (disabled ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease',
    fontFamily: 'var(--font-body)',
  }
}

export default function Pagination({ currentPage, totalPages, buildUrl }: Props) {
  if (totalPages <= 1) return null

  const start = Math.max(1, currentPage - 2)
  const end   = Math.min(totalPages, currentPage + 2)
  const range: number[] = []
  for (let i = start; i <= end; i++) range.push(i)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.375rem',
      padding: '1.5rem 0',
      flexWrap: 'wrap',
    }}>
      {/* Précédent */}
      {currentPage > 1 ? (
        <Link href={buildUrl(currentPage - 1)} style={btnStyle(false)}>
          <ChevronLeft size={14} />
        </Link>
      ) : (
        <span style={btnStyle(false, true)}><ChevronLeft size={14} /></span>
      )}

      {/* Première page */}
      {start > 1 && (
        <>
          <Link href={buildUrl(1)} style={btnStyle(false)}>1</Link>
          {start > 2 && (
            <span style={{ color: 'var(--text-4)', fontSize: '0.875rem', padding: '0 0.25rem' }}>…</span>
          )}
        </>
      )}

      {/* Pages */}
      {range.map(p => (
        <Link key={p} href={buildUrl(p)} style={btnStyle(p === currentPage)}>
          {p}
        </Link>
      ))}

      {/* Dernière page */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span style={{ color: 'var(--text-4)', fontSize: '0.875rem', padding: '0 0.25rem' }}>…</span>
          )}
          <Link href={buildUrl(totalPages)} style={btnStyle(false)}>{totalPages}</Link>
        </>
      )}

      {/* Suivant */}
      {currentPage < totalPages ? (
        <Link href={buildUrl(currentPage + 1)} style={btnStyle(false)}>
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span style={btnStyle(false, true)}><ChevronRight size={14} /></span>
      )}

      {/* Infos */}
      <span style={{
        fontSize: '0.8125rem', color: 'var(--text-4)',
        marginLeft: '0.75rem',
        fontFamily: 'var(--font-body)',
      }}>
        Page {currentPage} / {totalPages}
      </span>
    </div>
  )
}
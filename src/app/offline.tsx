export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', gap: '1rem',
      fontFamily: 'sans-serif', background: '#FAFAF8', textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>📡</div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F2D35', margin: 0 }}>
        Pas de connexion
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0, maxWidth: 280 }}>
        Vérifiez votre connexion internet et réessayez.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', background: '#0F2D35', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
      >
        Réessayer
      </button>
    </div>
  )
}
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            fontFamily: 'Inter, Arial, sans-serif',
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ color: '#0f172a', fontSize: 20, marginBottom: 8 }}>Algo deu errado</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              Ocorreu um erro inesperado. Tente novamente.
            </p>
            <button
              onClick={reset}
              style={{ background: '#2560db', color: '#fff', border: 0, borderRadius: 12, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

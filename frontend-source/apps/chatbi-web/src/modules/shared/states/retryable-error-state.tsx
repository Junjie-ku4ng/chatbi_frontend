'use client'

export function RetryableErrorState({
  message,
  retry
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div data-testid="loadable-error-state" className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
      <span className="badge badge-danger">Retryable Error</span>
      <span style={{ color: 'var(--muted)' }}>{message}</span>
      {retry ? (
        <button
          data-testid="loadable-retry-action"
          type="button"
          onClick={retry}
          style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '6px 12px', width: 'fit-content' }}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

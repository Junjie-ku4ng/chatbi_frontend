'use client'

import { ReactNode } from 'react'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ForbiddenState } from './forbidden-state'
import { RetryableErrorState } from './retryable-error-state'
import { UnauthorizedState } from './unauthorized-state'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div data-testid="loadable-loading-state" className="card" style={{ padding: 12 }}>
      <span className="badge badge-warn">{label}</span>
    </div>
  )
}

export function EmptyState({ label = 'No data' }: { label?: string }) {
  return (
    <div data-testid="loadable-empty-state" className="card" style={{ padding: 12 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const normalized = normalizeUiError(error)
  if (normalized.type === 'unauthorized') {
    return <UnauthorizedState message={normalized.message} />
  }
  if (normalized.type === 'forbidden') {
    return <ForbiddenState message={normalized.message} />
  }
  if (normalized.retryable) {
    return <RetryableErrorState message={normalized.message} retry={retry} />
  }
  return <RetryableErrorState message={normalized.message} />
}

export function LoadablePanel({
  loading,
  error,
  empty,
  emptyLabel,
  loadingLabel,
  retry,
  children
}: {
  loading?: boolean
  error?: unknown
  empty?: boolean
  emptyLabel?: string
  loadingLabel?: string
  retry?: () => void
  children: ReactNode
}) {
  if (loading) return <LoadingState label={loadingLabel} />
  if (error) return <ErrorState error={error} retry={retry} />
  if (empty) return <EmptyState label={emptyLabel} />
  return <>{children}</>
}

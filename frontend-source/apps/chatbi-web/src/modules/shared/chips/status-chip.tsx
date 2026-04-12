'use client'

import { cn } from '../ui/cn'

type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral'

export function StatusChip({
  value,
  tone,
  testId
}: {
  value: string
  tone?: StatusTone
  testId?: string
}) {
  const resolvedTone = tone ?? inferTone(value)
  const className = cn('nx-badge', `nx-badge-${resolvedTone}`, 'nx-status-chip')

  return (
    <span data-testid={testId} className={className}>
      {value}
    </span>
  )
}

function inferTone(value: string): StatusTone {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'failed' || normalized === 'error' || normalized === 'disabled' || normalized === 'high') {
    return 'danger'
  }
  if (normalized === 'warning' || normalized === 'warn' || normalized === 'degraded' || normalized === 'medium') {
    return 'warn'
  }
  if (normalized === 'active' || normalized === 'healthy' || normalized === 'success' || normalized === 'ok') {
    return 'ok'
  }
  return 'neutral'
}

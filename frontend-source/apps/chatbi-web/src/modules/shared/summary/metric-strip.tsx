'use client'

type MetricStripItem = {
  label: string
  value: string | number
  tone?: 'ok' | 'warn' | 'danger'
}

export function MetricStrip({ items, testId }: { items: MetricStripItem[]; testId?: string }) {
  if (!items || items.length === 0) {
    return null
  }
  return (
    <div data-testid={testId} className="nx-metric-strip">
      {items.map(item => (
        <span key={item.label} className={`${toBadgeClass(item.tone)} nx-metric-strip-item`}>
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  )
}

function toBadgeClass(tone?: 'ok' | 'warn' | 'danger') {
  if (tone === 'danger') return 'badge badge-danger'
  if (tone === 'warn') return 'badge badge-warn'
  return 'badge badge-ok'
}

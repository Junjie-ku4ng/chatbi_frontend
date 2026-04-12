'use client'

import { KvGrid } from './kv-grid'

type PayloadHighlight = {
  key: string
  value: unknown
}

export function PayloadHighlightsPanel({
  highlights,
  emptyLabel = '暂无载荷摘要',
  testId
}: {
  highlights?: PayloadHighlight[]
  emptyLabel?: string
  testId?: string
}) {
  const rows = Array.isArray(highlights) ? highlights.filter(item => typeof item?.key === 'string') : []
  if (rows.length === 0) {
    return <span data-testid={testId} className="badge badge-warn">{emptyLabel}</span>
  }

  return (
    <KvGrid
      testId={testId}
      items={rows.map(item => ({
        label: item.key,
        value: summarizeValue(item.value)
      }))}
    />
  )
}

function summarizeValue(value: unknown) {
  if (value === null || value === undefined) return '无'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `${value.length} 项`
  }
  if (typeof value === 'object') {
    return `${Object.keys(value as Record<string, unknown>).length} 字段`
  }
  return String(value)
}

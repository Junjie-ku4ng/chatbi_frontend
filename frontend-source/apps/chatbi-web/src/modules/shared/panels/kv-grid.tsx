'use client'

import { ReactNode } from 'react'

export type KvGridItem = {
  label: string
  value: ReactNode
  testId?: string
}

export function KvGrid({
  items,
  testId
}: {
  items: KvGridItem[]
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'grid',
        gap: 6,
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 10
      }}
    >
      {items.length === 0 ? (
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>No fields</span>
      ) : (
        items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            data-testid={item.testId}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(110px, 36%) 1fr',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.label}</span>
            <span style={{ fontSize: 12 }}>{formatValue(item.value)}</span>
          </div>
        ))
      )}
    </div>
  )
}

function formatValue(value: ReactNode) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return value
}

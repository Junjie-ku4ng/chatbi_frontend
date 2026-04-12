'use client'

import { ReactNode } from 'react'
import { KvGrid } from './kv-grid'

type SummaryRecord = Record<string, unknown> | null | undefined

export function VersionSummaryPanel({
  snapshotSummary,
  changeSummary,
  extra,
  testIdPrefix
}: {
  snapshotSummary?: SummaryRecord
  changeSummary?: SummaryRecord
  extra?: SummaryRecord
  testIdPrefix?: string
}) {
  const snapshotItems = toItems(snapshotSummary)
  const changeItems = toItems(changeSummary)
  const extraItems = toItems(extra)

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <section style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 12 }}>Snapshot</strong>
        {snapshotItems.length === 0 ? (
          <span className="badge badge-warn">暂无快照摘要</span>
        ) : (
          <KvGrid testId={join(testIdPrefix, 'snapshot')} items={snapshotItems} />
        )}
      </section>
      <section style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 12 }}>Change Summary</strong>
        {changeItems.length === 0 ? (
          <span className="badge badge-warn">暂无变更摘要</span>
        ) : (
          <KvGrid testId={join(testIdPrefix, 'change')} items={changeItems} />
        )}
      </section>
      {extraItems.length > 0 ? (
        <section style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 12 }}>补充统计</strong>
          <KvGrid testId={join(testIdPrefix, 'extra')} items={extraItems} />
        </section>
      ) : null}
    </div>
  )
}

function toItems(record: SummaryRecord): Array<{ label: string; value: ReactNode }> {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return []
  }
  return Object.entries(record).map(([key, value]) => ({
    label: key,
    value: renderValue(value)
  }))
}

function renderValue(value: unknown): ReactNode {
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

function join(prefix?: string, suffix?: string) {
  if (!prefix && !suffix) return undefined
  return [prefix, suffix].filter(Boolean).join('-')
}

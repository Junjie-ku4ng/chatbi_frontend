'use client'

import { ReactNode } from 'react'
import { AdvancedJsonPanel } from './advanced-json'
import { KvGrid, type KvGridItem } from './kv-grid'

type DetailSection = {
  title: string
  items?: KvGridItem[]
  content?: ReactNode
  testId?: string
}

export function EntityDetailSections({
  overview,
  operationalFields,
  diagnostics,
  rawValue,
  advancedTestId,
  testIdPrefix
}: {
  overview: KvGridItem[]
  operationalFields: KvGridItem[]
  diagnostics?: KvGridItem[]
  rawValue?: unknown
  advancedTestId?: string
  testIdPrefix?: string
}) {
  const sections: DetailSection[] = [
    {
      title: 'Overview',
      items: overview,
      testId: joinTestId(testIdPrefix, 'overview')
    },
    {
      title: 'Operational Fields',
      items: operationalFields,
      testId: joinTestId(testIdPrefix, 'operational')
    }
  ]

  if ((diagnostics ?? []).length > 0) {
    sections.push({
      title: 'Diagnostics',
      items: diagnostics,
      testId: joinTestId(testIdPrefix, 'diagnostics')
    })
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {sections.map(section => (
        <section key={section.title} style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 13 }}>{section.title}</strong>
          {section.items ? <KvGrid items={section.items} testId={section.testId} /> : section.content}
        </section>
      ))}
      <AdvancedJsonPanel testId={advancedTestId} value={rawValue} />
    </div>
  )
}

function joinTestId(prefix?: string, suffix?: string) {
  if (!prefix && !suffix) return undefined
  return [prefix, suffix].filter(Boolean).join('-')
}

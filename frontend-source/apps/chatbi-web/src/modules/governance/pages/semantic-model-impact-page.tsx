'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { getSemanticCrossImpact, getSemanticImpactSummary } from '@/modules/governance/semantic/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function SemanticImpactPage() {
  const params = useParams<{ id: string }>()
  const modelId = params.id
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null)

  const summaryQuery = useQuery({
    queryKey: ['semantic-impact-summary', modelId],
    queryFn: () => getSemanticImpactSummary(modelId, { windowHours: 24 * 7, includeCrossModel: true }),
    enabled: Boolean(modelId)
  })

  const crossImpactQuery = useQuery({
    queryKey: ['semantic-cross-impact', modelId],
    queryFn: () => getSemanticCrossImpact(modelId),
    enabled: Boolean(modelId)
  })

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Semantic Impact</strong>
        </header>

        <LoadablePanel loading={summaryQuery.isLoading} error={summaryQuery.error} loadingLabel="Loading semantic impact summary...">
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>Impact summary</strong>
            <MetricStrip
              testId="semantic-impact-summary-strip"
              items={[
                {
                  label: 'risk',
                  value: String(summaryQuery.data?.risk?.level ?? 'unknown'),
                  tone: summaryQuery.data?.risk?.level === 'high' ? 'danger' : summaryQuery.data?.risk?.level === 'medium' ? 'warn' : 'ok'
                },
                { label: 'affected queries', value: String(summaryQuery.data?.affected?.queries?.total ?? 0), tone: 'warn' },
                { label: 'affected stories', value: String(summaryQuery.data?.affected?.stories?.total ?? 0), tone: 'warn' },
                { label: 'affected indicators', value: String(summaryQuery.data?.affected?.indicators?.total ?? 0), tone: 'warn' },
                { label: 'blockers', value: String(summaryQuery.data?.risk?.blockers?.length ?? 0), tone: 'danger' }
              ]}
            />
            <OperationalTable
              testId="semantic-impact-blockers-table"
              columns={[
                { key: 'code', label: 'Blocker', render: row => String(row.code ?? '-') },
                { key: 'severity', label: 'Severity', render: row => String(row.severity ?? '-') },
                { key: 'ownerHint', label: 'Owner', render: row => String(row.ownerHint ?? '-') },
                { key: 'retryable', label: 'Retryable', render: row => String(row.retryable ?? false) }
              ]}
              rows={((summaryQuery.data?.blockerDetails ?? []) as Array<Record<string, unknown>>) || []}
              rowKey={(row, index) => `${String(row.code ?? 'blocker')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No blockers"
            />
            <AdvancedJsonPanel testId="semantic-impact-summary-json" value={summaryQuery.data} />
          </article>
        </LoadablePanel>

        <LoadablePanel loading={crossImpactQuery.isLoading} error={crossImpactQuery.error} loadingLabel="Loading cross-model impact...">
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>Cross-model impact</strong>
            <MetricStrip
              testId="semantic-impact-cross-strip"
              items={[
                { label: 'blocked', value: String(crossImpactQuery.data?.blocked ?? false), tone: crossImpactQuery.data?.blocked ? 'danger' : 'ok' },
                { label: 'impacted models', value: String(crossImpactQuery.data?.summary?.impactedCount ?? 0), tone: 'warn' },
                { label: 'risk', value: String(crossImpactQuery.data?.summary?.riskLevel ?? 'unknown'), tone: 'warn' }
              ]}
            />
            <OperationalTable
              testId="semantic-impact-cross-table"
              columns={[
                { key: 'modelId', label: 'Model', render: row => String(row.modelId ?? '-') },
                { key: 'relation', label: 'Relation', render: row => String(row.relation ?? '-') }
              ]}
              rows={((crossImpactQuery.data?.impactedModels ?? []) as Array<Record<string, unknown>>) || []}
              rowKey={(row, index) => `${String(row.modelId ?? 'model')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No impacted models"
            />
            <AdvancedJsonPanel testId="semantic-impact-cross-json" value={crossImpactQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="semantic-impact-detail-drawer"
          title="Impact detail"
          open={selectedDetail !== null}
          onClose={() => setSelectedDetail(null)}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(selectedDetail ?? {}, null, 2)}</pre>
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

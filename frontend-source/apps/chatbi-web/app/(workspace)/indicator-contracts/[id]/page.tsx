'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  getIndicatorContractDiffPresentation,
  getIndicatorContractPresentation
} from '@/modules/governance/indicator/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function IndicatorContractDetailPage() {
  const params = useParams<{ id: string }>()
  const contractId = params.id
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  const presentationQuery = useQuery({
    queryKey: ['indicator-contract-presentation', contractId],
    queryFn: () => getIndicatorContractPresentation(contractId),
    enabled: Boolean(contractId)
  })
  const contractVersion = presentationQuery.data?.contract?.version ?? 1
  const diffFromVersion = Math.max(1, contractVersion - 1)

  const diffQuery = useQuery({
    queryKey: ['indicator-contract-diff', contractId, diffFromVersion, contractVersion],
    queryFn: () =>
      getIndicatorContractDiffPresentation(contractId, {
        fromVersion: diffFromVersion,
        toVersion: contractVersion
      }),
    enabled: Boolean(contractId) && contractVersion > 1
  })

  const riskLevel = presentationQuery.data?.risk?.riskLevel ?? 'low'
  const diffChanges = diffQuery.data?.changes
  const changedFields = diffChanges?.changedFields ?? []
  const addedFields = diffChanges?.addedFields ?? []
  const removedFields = diffChanges?.removedFields ?? []
  const breakingChanges = diffChanges?.breakingChanges ?? []

  return (
    <AccessGuard scopes={['allow:indicator:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Indicator Contract Detail</strong>
        </header>
        <LoadablePanel
          loading={presentationQuery.isLoading}
          error={presentationQuery.error}
          empty={!presentationQuery.data}
          loadingLabel="Loading indicator contract presentation..."
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>Contract presentation</strong>
            <MetricStrip
              testId="indicator-contract-presentation-strip"
              items={[
                { label: 'risk', value: riskLevel, tone: riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warn' : 'ok' },
                { label: 'allowed', value: String(presentationQuery.data?.risk?.allowed ?? false), tone: presentationQuery.data?.risk?.allowed ? 'ok' : 'danger' },
                { label: 'breaking', value: String(presentationQuery.data?.risk?.breakingCount ?? 0), tone: 'danger' },
                { label: 'removed', value: String(presentationQuery.data?.risk?.removedFieldCount ?? 0), tone: 'warn' }
              ]}
            />
            <OperationalTable
              testId="indicator-contract-presentation-table"
              columns={[
                { key: 'name', label: 'Name', render: row => String(row.name ?? '-') },
                { key: 'code', label: 'Code', render: row => String(row.code ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                { key: 'contractVersion', label: 'Contract', render: row => String(row.contractVersion ?? '-') },
                { key: 'schemaVersion', label: 'Schema', render: row => String(row.schemaVersion ?? '-') }
              ]}
              rows={presentationQuery.data?.contract ? [presentationQuery.data.contract as unknown as Record<string, unknown>] : []}
              rowKey={() => 'contract'}
              onRowClick={row => setSelected(row)}
            />
            <OperationalTable
              testId="indicator-contract-suggestions-table"
              columns={[{ key: 'suggestion', label: 'Suggested action', render: row => String(row.suggestion ?? '-') }]}
              rows={(presentationQuery.data?.suggestedActions ?? []).map(item => ({ suggestion: item }))}
              rowKey={(row, index) => `${String(row.suggestion ?? 'suggestion')}-${index}`}
              onRowClick={row => setSelected(row)}
            />
            <AdvancedJsonPanel testId="indicator-contract-json" value={presentationQuery.data} />
          </article>
        </LoadablePanel>
        {contractVersion <= 1 ? (
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Compatibility Diff</strong>
            <span data-testid="indicator-contract-diff-unavailable" className="badge badge-warn" style={{ width: 'fit-content' }}>
              No previous version for compatibility diff
            </span>
          </article>
        ) : (
          <LoadablePanel
            loading={diffQuery.isLoading}
            error={diffQuery.error}
            empty={!diffQuery.data}
            loadingLabel="Loading indicator contract diff..."
          >
            <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
              <strong>Compatibility Diff</strong>
              <MetricStrip
                items={[
                  { label: 'changed', value: changedFields.length, tone: 'warn' },
                  { label: 'added', value: addedFields.length, tone: 'ok' },
                  { label: 'removed', value: removedFields.length, tone: 'warn' },
                  { label: 'breaking', value: breakingChanges.length, tone: 'danger' },
                  { label: 'risk', value: String(diffQuery.data?.summary?.riskLevel ?? 'low'), tone: 'warn' }
                ]}
              />
              <OperationalTable
                testId="indicator-contract-diff-table"
                columns={[
                  { key: 'type', label: 'Type', render: row => String(row.type ?? '-') },
                  { key: 'field', label: 'Field', render: row => String(row.field ?? '-') }
                ]}
                rows={[
                  ...changedFields.map(field => ({ type: 'changed', field })),
                  ...addedFields.map(field => ({ type: 'added', field })),
                  ...removedFields.map(field => ({ type: 'removed', field })),
                  ...breakingChanges.map(field => ({ type: 'breaking', field }))
                ]}
                rowKey={(row, index) => `${String(row.type ?? 'row')}-${String(row.field ?? 'field')}-${index}`}
                onRowClick={row => setSelected(row)}
                emptyLabel="No diff changes"
              />
              <AdvancedJsonPanel testId="indicator-contract-diff-json" value={diffQuery.data} />
            </article>
          </LoadablePanel>
        )}

        <DetailDrawer
          testId="indicator-contract-detail-drawer"
          title="Contract detail"
          open={selected !== null}
          onClose={() => setSelected(null)}
        >
          <EntityDetailSections
            testIdPrefix="indicator-contract-detail"
            overview={[
              { label: 'name', value: String(selected?.name ?? selected?.field ?? selected?.suggestion ?? '-') },
              { label: 'type', value: String(selected?.type ?? 'detail') },
              { label: 'status', value: <StatusChip value={String(selected?.status ?? riskLevel ?? '-')} /> }
            ]}
            operationalFields={[
              { label: 'code', value: String(selected?.code ?? '-') },
              { label: 'field', value: String(selected?.field ?? '-') },
              { label: 'contract version', value: String(selected?.contractVersion ?? '-') },
              { label: 'schema version', value: String(selected?.schemaVersion ?? '-') }
            ]}
            diagnostics={[
              { label: 'risk level', value: String(riskLevel) },
              {
                label: 'breaking count',
                value: String(presentationQuery.data?.risk?.breakingCount ?? diffQuery.data?.summary?.breakingCount ?? 0)
              }
            ]}
            rawValue={selected}
            advancedTestId="indicator-contract-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

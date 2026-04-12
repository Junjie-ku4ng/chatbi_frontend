'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listSemanticModels } from '@/lib/api-client'
import { getIndicatorContractGovernanceSummary, listIndicatorContracts } from '@/modules/governance/indicator/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function IndicatorContractsPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  const contractsQuery = useQuery({
    queryKey: ['indicator-contracts', activeModelId],
    queryFn: () => listIndicatorContracts(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const summaryQuery = useQuery({
    queryKey: ['indicator-contract-summary', activeModelId],
    queryFn: () =>
      getIndicatorContractGovernanceSummary({
        modelId: activeModelId as string,
        windowHours: 24 * 7
      }),
    enabled: Boolean(activeModelId)
  })

  const items = (contractsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const summary = summaryQuery.data as
    | {
        totals?: {
          contracts?: number
          published?: number
          draft?: number
          breakingIndicators?: number
          incompatibleConsumers?: number
        }
        contractVersionBreakdown?: Array<Record<string, unknown>>
        riskBreakdown?: Array<Record<string, unknown>>
        consumers?: {
          total?: number
          active?: number
          disabled?: number
        }
      }
    | undefined

  const summaryRows: Array<Record<string, unknown>> = [
    ...(summary?.contractVersionBreakdown ?? []).map(item => ({
      category: 'contract-version',
      name: String(item.contractVersion ?? '-'),
      count: Number(item.count ?? 0)
    })),
    ...(summary?.riskBreakdown ?? []).map(item => ({
      category: 'risk',
      name: String(item.riskLevel ?? '-'),
      count: Number(item.count ?? 0)
    }))
  ]

  return (
    <AccessGuard scopes={['allow:indicator:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Indicator Contracts</strong>
          <select
            data-testid="indicator-contract-model-select"
            value={activeModelId ?? ''}
            onChange={event => setModelId(event.target.value)}
            style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', maxWidth: 360 }}
          >
            {(modelsQuery.data ?? []).map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </header>

        <LoadablePanel
          loading={summaryQuery.isLoading}
          error={summaryQuery.error}
          empty={!summary}
          loadingLabel="Loading governance summary..."
          emptyLabel="No governance summary"
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Governance summary</strong>
            <MetricStrip
              testId="indicator-contracts-summary-strip"
              items={[
                { label: 'contracts', value: String(summary?.totals?.contracts ?? 0), tone: 'ok' },
                { label: 'published', value: String(summary?.totals?.published ?? 0), tone: 'ok' },
                { label: 'breaking', value: String(summary?.totals?.breakingIndicators ?? 0), tone: 'warn' },
                { label: 'incompatible', value: String(summary?.totals?.incompatibleConsumers ?? 0), tone: 'warn' },
                { label: 'active consumers', value: String(summary?.consumers?.active ?? 0), tone: 'ok' }
              ]}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span data-testid="indicator-contract-summary-contracts" className="badge badge-ok">
                contracts: {String(summary?.totals?.contracts ?? 0)}
              </span>
              <span data-testid="indicator-contract-summary-breaking" className="badge badge-warn">
                breaking: {String(summary?.totals?.breakingIndicators ?? 0)}
              </span>
              <span data-testid="indicator-contract-summary-incompatible" className="badge badge-warn">
                incompatible-consumers: {String(summary?.totals?.incompatibleConsumers ?? 0)}
              </span>
            </div>
            <OperationalTable
              testId="indicator-contracts-summary-table"
              columns={[
                { key: 'category', label: 'Category', render: row => String(row.category ?? '-') },
                { key: 'name', label: 'Name', render: row => String(row.name ?? '-') },
                { key: 'count', label: 'Count', render: row => String(row.count ?? 0) }
              ]}
              rows={summaryRows}
              rowKey={(row, index) => `${String(row.category ?? 'summary')}-${String(row.name ?? index)}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No summary rows"
            />
            <AdvancedJsonPanel
              testId="indicator-contracts-summary-json"
              value={{
                contractVersionBreakdown: summary?.contractVersionBreakdown ?? [],
                riskBreakdown: summary?.riskBreakdown ?? [],
                consumers: summary?.consumers ?? {}
              }}
            />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={contractsQuery.isLoading}
          error={contractsQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading indicator contracts..."
          emptyLabel="No contracts for model"
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Contracts</strong>
            <OperationalTable
              testId="indicator-contracts-table"
              columns={[
                {
                  key: 'name',
                  label: 'Name',
                  render: row => (
                    <span data-testid={`indicator-contract-row-${String(row.id)}`}>{String(row.name ?? row.id ?? '-')}</span>
                  )
                },
                { key: 'contractVersion', label: 'Version', render: row => String(row.contractVersion ?? row.version ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                {
                  key: 'open',
                  label: 'Detail',
                  render: row => (
                    <Link
                      data-testid={`indicator-contract-open-${String(row.id)}`}
                      href={`/indicator-contracts/${encodeURIComponent(String(row.id ?? ''))}`}
                      className="badge badge-ok"
                    >
                      View Diff
                    </Link>
                  )
                }
              ]}
              rows={items}
              rowKey={(row, index) => `${String(row.id ?? 'contract')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No contracts"
            />
            <AdvancedJsonPanel testId="indicator-contracts-json" value={contractsQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="indicator-contracts-detail-drawer"
          title="Contract detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="indicator-contract-list-detail"
            overview={[
              { label: 'id', value: String(selectedRow?.id ?? '-') },
              { label: 'name', value: String(selectedRow?.name ?? selectedRow?.code ?? '-') },
              { label: 'status', value: <StatusChip value={String(selectedRow?.status ?? '-')} /> }
            ]}
            operationalFields={[
              { label: 'contract version', value: String(selectedRow?.contractVersion ?? selectedRow?.version ?? '-') },
              { label: 'schema version', value: String(selectedRow?.schemaVersion ?? '-') },
              { label: 'risk level', value: <StatusChip value={String(selectedRow?.riskLevel ?? '-')} /> },
              { label: 'category', value: String(selectedRow?.category ?? '-') },
              { label: 'count', value: String(selectedRow?.count ?? '-') }
            ]}
            diagnostics={[
              { label: 'updated', value: String(selectedRow?.updatedAt ?? '-') },
              { label: 'model', value: String(activeModelId ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="indicator-contract-list-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

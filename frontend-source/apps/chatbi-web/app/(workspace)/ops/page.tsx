'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listSemanticModels } from '@/lib/api-client'
import { getConsumptionReport, listEmbeddingTrends, listTenantSlaTrends } from '@/modules/ops/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

export default function OpsPage() {
  const [window, setWindow] = useState<'7d' | '30d' | '90d'>('30d')
  const [groupBy, setGroupBy] = useState<'tenant' | 'model' | 'consumer'>('tenant')
  const [modelId, setModelId] = useState<string | undefined>()
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  const embeddingTrendsQuery = useQuery({
    queryKey: ['embedding-trends', activeModelId, window],
    queryFn: () => listEmbeddingTrends(activeModelId as string, window),
    enabled: Boolean(activeModelId)
  })

  const tenantSlaTrendsQuery = useQuery({
    queryKey: ['tenant-sla-trends', window],
    queryFn: () => listTenantSlaTrends(window === '7d' ? 7 * 24 : window === '30d' ? 30 * 24 : 90 * 24)
  })

  const reportQuery = useQuery({
    queryKey: ['consumption-report', groupBy],
    queryFn: () => getConsumptionReport({ windowHours: 24 * 30, groupBy, format: 'json' })
  })

  const embeddingItems = embeddingTrendsQuery.data?.items ?? []
  const embeddingOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: embeddingItems.map(item => String(item.bucket ?? item.day ?? ''))
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        data: embeddingItems.map(item => Number(item.compositeDrift ?? item.drift ?? 0)),
        smooth: true,
        lineStyle: { color: '#b3342f', width: 3 }
      }
    ]
  }

  const slaItems = tenantSlaTrendsQuery.data?.items ?? []
  const reportItems =
    ((reportQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []) as Array<
      Record<string, unknown>
    >

  const reportSummary = useMemo(() => {
    const delivered = reportItems.reduce((sum, row) => sum + Number(row.delivered ?? 0), 0)
    const failed = reportItems.reduce((sum, row) => sum + Number(row.failed ?? 0), 0)
    const dlq = reportItems.reduce((sum, row) => sum + Number(row.dlq ?? 0), 0)
    return { delivered, failed, dlq }
  }, [reportItems])

  const slaOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: slaItems.map(item => String(item.bucket ?? item.window ?? ''))
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        data: slaItems.map(item => Number(item.deliveryRate ?? item.sla ?? 0)),
        smooth: true,
        lineStyle: { color: '#1f7f54', width: 3 }
      }
    ]
  }

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack" style={{ display: 'grid', gap: 16 }}>
        <header className="card nexus-domain-hero" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Ops Dashboard</strong>
            <Link href="/ops/alerts" className="badge badge-warn">
              Manage Alerts
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['7d', '30d', '90d'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setWindow(item)}
                className={item === window ? 'badge badge-ok' : 'badge badge-warn'}
                style={{ border: 'none', cursor: 'pointer' }}
              >
                {item}
              </button>
            ))}
            <select
              value={activeModelId ?? ''}
              onChange={event => setModelId(event.target.value)}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '7px 10px', background: '#fff' }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <select
              value={groupBy}
              onChange={event => setGroupBy(event.target.value as 'tenant' | 'model' | 'consumer')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '7px 10px', background: '#fff' }}
            >
              <option value="tenant">tenant</option>
              <option value="model">model</option>
              <option value="consumer">consumer</option>
            </select>
          </div>
        </header>

        <section className="card nexus-domain-card" style={{ padding: 16 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Embedding Drift Trend</strong>
          <ReactECharts option={embeddingOption} style={{ height: 280 }} />
        </section>

        <section className="card nexus-domain-card" style={{ padding: 16 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Tenant SLA Trend</strong>
          <ReactECharts option={slaOption} style={{ height: 280 }} />
        </section>

        <LoadablePanel
          loading={reportQuery.isLoading}
          error={reportQuery.error}
          empty={reportItems.length === 0}
          loadingLabel="Loading consumption report..."
          emptyLabel="No consumption report rows found for the selected window."
          retry={() => {
            void reportQuery.refetch()
          }}
        >
          <section className="card nexus-domain-card" style={{ padding: 16, display: 'grid', gap: 8 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Consumption Report ({groupBy})</strong>
            <MetricStrip
              testId="ops-dashboard-consumption-strip"
              items={[
                { label: 'rows', value: reportItems.length, tone: 'ok' },
                { label: 'delivered', value: reportSummary.delivered, tone: 'ok' },
                { label: 'failed', value: reportSummary.failed, tone: reportSummary.failed > 0 ? 'warn' : 'ok' },
                { label: 'dlq', value: reportSummary.dlq, tone: reportSummary.dlq > 0 ? 'warn' : 'ok' }
              ]}
            />
            <OperationalTable
              testId="ops-dashboard-consumption-table"
              columns={[
                { key: 'group', label: groupBy, render: row => String(row[groupBy] ?? row.key ?? '-') },
                { key: 'delivered', label: 'delivered', render: row => String(row.delivered ?? 0) },
                { key: 'failed', label: 'failed', render: row => String(row.failed ?? 0) },
                { key: 'dlq', label: 'dlq', render: row => String(row.dlq ?? 0) }
              ]}
              rows={reportItems.slice(0, 30)}
              rowKey={(row, index) => `${String(row[groupBy] ?? row.key ?? 'row')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No report rows"
            />
            <AdvancedJsonPanel testId="ops-dashboard-report-json" value={reportQuery.data} />
          </section>
        </LoadablePanel>

        <DetailDrawer
          testId="ops-dashboard-detail-drawer"
          title="Consumption detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="ops-dashboard-detail"
            overview={[
              { label: 'group', value: String(selectedRow?.[groupBy] ?? selectedRow?.key ?? '-') },
              { label: 'window', value: window },
              { label: 'groupBy', value: groupBy }
            ]}
            operationalFields={[
              { label: 'delivered', value: String(selectedRow?.delivered ?? 0) },
              { label: 'failed', value: String(selectedRow?.failed ?? 0) },
              { label: 'dlq', value: String(selectedRow?.dlq ?? 0) },
              { label: 'active subscriptions', value: String(selectedRow?.activeSubscriptions ?? '-') },
              { label: 'failure rate', value: String((selectedRow?.presentation as any)?.failureRate ?? '-') },
              {
                label: 'dominant failure',
                value: String((selectedRow?.presentation as any)?.dominantFailureCode ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'audits', value: String(selectedRow?.audits ?? '-') },
              { label: 'dlq open', value: String(selectedRow?.dlqOpen ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="ops-dashboard-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import {
  getToolsetLearningInsights,
  getToolsetOpsSummary,
  listToolsetExecutions,
  replayToolsetLearning
} from '@/modules/governance/toolset/api'
import { ToolsetCompatNotice } from '@/modules/governance/toolset/compat-notice'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

type ExecutionStatus = 'success' | 'failed' | 'all'

export default function ToolsetLearningPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [pluginId, setPluginId] = useState('')
  const [scenario, setScenario] = useState('')
  const [domain, setDomain] = useState('')
  const [status, setStatus] = useState<ExecutionStatus>('all')
  const [policyViolation, setPolicyViolation] = useState<'all' | 'violated' | 'clean'>('all')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<Record<string, unknown> | null>(null)
  const pageSize = 50

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const modelOptions = modelsQuery.data ?? []
  const activeModelId = modelId ?? modelOptions[0]?.id

  const insightsQuery = useQuery({
    queryKey: ['toolset-learning-insights', activeModelId],
    queryFn: () => getToolsetLearningInsights(activeModelId as string, 24),
    enabled: Boolean(activeModelId)
  })

  const executionsQuery = useInfiniteQuery({
    queryKey: ['toolset-executions', activeModelId, pluginId, scenario, domain, status, policyViolation],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listToolsetExecutions({
        modelId: activeModelId as string,
        pluginId: pluginId.trim() === '' ? undefined : pluginId.trim(),
        scenario: scenario.trim() === '' ? undefined : scenario.trim(),
        domain: domain.trim() === '' ? undefined : domain.trim(),
        status: status === 'all' ? undefined : status,
        policyViolation: policyViolation === 'all' ? undefined : policyViolation === 'violated' ? true : false,
        view: 'operational',
        limit: pageSize,
        offset: Number(pageParam ?? 0)
      }),
    enabled: Boolean(activeModelId),
    getNextPageParam: (lastPage, pages) => {
      const typedPages = pages as Array<{ items?: Array<Record<string, unknown>> }>
      const typedLastPage = lastPage as { total?: number }
      const loaded = typedPages.reduce((sum, page) => sum + (page.items?.length ?? 0), 0)
      if (loaded >= (typedLastPage.total ?? 0)) {
        return undefined
      }
      return loaded
    }
  })

  const opsSummaryQuery = useQuery({
    queryKey: ['toolset-ops-summary', activeModelId, scenario, domain],
    queryFn: () =>
      getToolsetOpsSummary({
        modelId: activeModelId as string,
        domain: domain.trim() === '' ? undefined : domain.trim(),
        scenario: scenario.trim() === '' ? undefined : scenario.trim(),
        windowHours: 24
      }),
    enabled: Boolean(activeModelId)
  })
  const opsSummary = opsSummaryQuery.data

  const replayMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId) throw new Error('Select model first')
      return replayToolsetLearning({
        modelId: activeModelId,
        scenario: scenario.trim() === '' ? undefined : scenario.trim(),
        strategy: 'adaptive'
      })
    },
    onSuccess: async () => {
      setStatusMessage('Replay completed')
      await insightsQuery.refetch()
      await executionsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Replay failed')
    }
  })

  const executionPage = executionsQuery.data as
    | {
        pages?: Array<{
          items?: Array<Record<string, unknown>>
          total?: number
        }>
      }
    | undefined
  const executionItems = (executionPage?.pages ?? []).flatMap(page => page.items ?? [])
  const hasNext = executionsQuery.hasNextPage ?? false

  const totalLabel = useMemo(() => {
    const lastPage = executionPage?.pages && executionPage.pages.length > 0 ? executionPage.pages[executionPage.pages.length - 1] : undefined
    if (typeof lastPage?.total === 'number') {
      return `${lastPage.total}`
    }
    return 'unknown'
  }, [executionPage?.pages])

  const insightsRecord = (insightsQuery.data as Record<string, unknown> | undefined) ?? {}
  const insightRows = Object.entries(insightsRecord)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({ key, value }))
  const modelsLoading = modelsQuery.isLoading
  const insightsLoading = Boolean(activeModelId) && insightsQuery.isLoading
  const opsSummaryLoading = Boolean(activeModelId) && opsSummaryQuery.isLoading
  const executionsLoading = Boolean(activeModelId) && executionsQuery.isLoading
  const modelSelectPlaceholder = modelsLoading ? 'Loading semantic models...' : 'No semantic models available'

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack">
        <header className="card nexus-domain-hero toolset-hero">
          <div className="nexus-domain-heading-row toolset-heading-row">
            <strong className="toolset-title">Toolset Learning</strong>
            <Link href="/toolset/actions" className="badge badge-warn">
              Actions
            </Link>
            <Link href="/toolset/plugins" className="badge badge-warn">
              Plugins
            </Link>
            <Link href="/toolset/scenarios" className="badge badge-warn">
              Scenarios
            </Link>
          </div>
          <ToolsetCompatNotice />
          <form
            data-testid="toolset-learning-filter-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await executionsQuery.refetch()
            }}
            className="nexus-domain-form-row toolset-form-row"
          >
            <select
              data-testid="toolset-learning-model-select"
              value={activeModelId ?? ''}
              onChange={event => {
                setModelId(event.target.value)
              }}
              disabled={modelsLoading || modelOptions.length === 0}
              className="nexus-domain-input toolset-input toolset-input-wide"
            >
              {modelOptions.length === 0 ? (
                <option value="">{modelSelectPlaceholder}</option>
              ) : (
                modelOptions.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
            <input
              data-testid="toolset-learning-plugin-id"
              value={pluginId}
              onChange={event => setPluginId(event.target.value)}
              placeholder="plugin id"
              className="nexus-domain-input toolset-input"
            />
            <input
              data-testid="toolset-learning-scenario"
              value={scenario}
              onChange={event => setScenario(event.target.value)}
              placeholder="scenario"
              className="nexus-domain-input toolset-input"
            />
            <input
              data-testid="toolset-learning-domain"
              value={domain}
              onChange={event => setDomain(event.target.value)}
              placeholder="domain"
              className="nexus-domain-input toolset-input"
            />
            <select
              data-testid="toolset-learning-status"
              value={status}
              onChange={event => setStatus(event.target.value as ExecutionStatus)}
              className="nexus-domain-input toolset-input"
            >
              <option value="all">all</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
            </select>
            <select
              data-testid="toolset-learning-policy-violation"
              value={policyViolation}
              onChange={event => setPolicyViolation(event.target.value as 'all' | 'violated' | 'clean')}
              className="nexus-domain-input toolset-input"
            >
              <option value="all">policy all</option>
              <option value="violated">policy violated</option>
              <option value="clean">policy clean</option>
            </select>
            <button data-testid="toolset-learning-filter-submit" type="submit" className="nexus-domain-btn toolset-btn">
              Filter
            </button>
            <button
              data-testid="toolset-learning-replay-submit"
              type="button"
              onClick={() => replayMutation.mutate()}
              disabled={replayMutation.isPending || !activeModelId}
              className="nexus-domain-btn toolset-btn"
            >
              {replayMutation.isPending ? 'Replaying...' : 'Replay & Recommend'}
            </button>
          </form>
          {statusMessage ? (
            <span data-testid="toolset-learning-status-message" className="badge badge-warn toolset-fit">
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={modelsLoading || insightsLoading}
          error={modelsQuery.error ?? insightsQuery.error}
          empty={!modelsLoading && !insightsLoading && !modelsQuery.error && !insightsQuery.error && (!activeModelId || !insightsQuery.data)}
          loadingLabel={modelsLoading ? 'Loading toolset learning models...' : 'Loading learning insights...'}
          emptyLabel={activeModelId ? 'No insights data' : 'Select a semantic model to load learning insights.'}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void insightsQuery.refetch()
            }
          }}
        >
          <article className="card nexus-domain-card toolset-card">
            <strong>Learning insights</strong>
            <MetricStrip
              testId="toolset-learning-insights-strip"
              items={[
                { label: 'keys', value: Object.keys(insightsRecord).length, tone: 'ok' },
                { label: 'plugin', value: pluginId.trim() || 'all', tone: 'warn' },
                { label: 'scenario', value: scenario.trim() || 'all', tone: 'warn' }
              ]}
            />
            <OperationalTable
              testId="toolset-learning-insights-table"
              columns={[
                { key: 'key', label: 'Key', render: row => String(row.key ?? '-') },
                { key: 'value', label: 'Value', render: row => String(row.value ?? '-') }
              ]}
              rows={insightRows as Array<Record<string, unknown>>}
              rowKey={(row, index) => `${String(row.key ?? 'key')}-${index}`}
              onRowClick={row => setSelectedExecution(row)}
              emptyLabel="No scalar insights"
            />
            <AdvancedJsonPanel testId="toolset-learning-insights-json" value={insightsQuery.data} />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={modelsLoading || opsSummaryLoading}
          error={modelsQuery.error ?? opsSummaryQuery.error}
          empty={!modelsLoading && !opsSummaryLoading && !modelsQuery.error && !opsSummaryQuery.error && (!activeModelId || !opsSummary)}
          loadingLabel={modelsLoading ? 'Loading toolset learning models...' : 'Loading toolset ops summary...'}
          emptyLabel={activeModelId ? 'No ops summary' : 'Select a semantic model to load toolset ops summary.'}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void opsSummaryQuery.refetch()
            }
          }}
        >
          <article className="card nexus-domain-card toolset-card">
            <strong>Ops summary</strong>
            <MetricStrip
              testId="toolset-ops-summary-strip"
              items={[
                {
                  label: 'status',
                  value: `${opsSummary?.summary?.statusBreakdown?.success ?? 0} success / ${opsSummary?.summary?.statusBreakdown?.failed ?? 0} failed`,
                  tone: 'ok'
                },
                {
                  label: 'success rate',
                  value: `${Math.round((opsSummary?.summary?.successRate ?? 0) * 100)}%`,
                  tone: 'ok'
                },
                {
                  label: 'p95',
                  value: `${opsSummary?.summary?.p95LatencyMs ?? opsSummary?.summary?.p95DurationMs ?? 0}ms`,
                  tone: 'warn'
                }
              ]}
            />
            <div className="toolset-summary-row">
              <span data-testid="toolset-ops-summary-status-breakdown" className="badge badge-ok">
                status: {opsSummary?.summary?.statusBreakdown?.success ?? 0} success / {opsSummary?.summary?.statusBreakdown?.failed ?? 0} failed
              </span>
              <span data-testid="toolset-ops-summary-p95" className="badge badge-warn">
                p95: {opsSummary?.summary?.p95LatencyMs ?? opsSummary?.summary?.p95DurationMs ?? 0}ms
              </span>
            </div>
            <OperationalTable
              testId="toolset-ops-summary-table"
              columns={[
                { key: 'metric', label: 'Metric', render: row => String(row.metric ?? '-') },
                { key: 'value', label: 'Value', render: row => String(row.value ?? '-') }
              ]}
              rows={[
                { metric: 'total outcomes', value: opsSummary?.summary?.totalOutcomes ?? 0 },
                { metric: 'success count', value: opsSummary?.summary?.successCount ?? 0 },
                { metric: 'failure count', value: opsSummary?.summary?.failureCount ?? 0 },
                { metric: 'avg duration ms', value: opsSummary?.summary?.avgDurationMs ?? 0 },
                { metric: 'running sessions', value: opsSummary?.summary?.runningSessions ?? 0 }
              ]}
              rowKey={(row, index) => `${String(row.metric ?? 'metric')}-${index}`}
              onRowClick={row => setSelectedExecution(row)}
              emptyLabel="No summary rows"
            />
            <AdvancedJsonPanel testId="toolset-ops-summary" value={opsSummary ?? {}} />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={modelsLoading || executionsLoading}
          error={modelsQuery.error ?? executionsQuery.error}
          empty={!modelsLoading && !executionsLoading && !modelsQuery.error && !executionsQuery.error && (!activeModelId || executionItems.length === 0)}
          loadingLabel={modelsLoading ? 'Loading toolset learning models...' : 'Loading toolset executions...'}
          emptyLabel={activeModelId ? 'No execution rows' : 'Select a semantic model to load toolset executions.'}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void executionsQuery.refetch()
            }
          }}
        >
          <section className="card nexus-domain-card toolset-card">
            <div className="toolset-summary-actions">
              <strong>Execution traces</strong>
              <div className="toolset-summary-row">
                <span className="badge badge-warn">policy violation</span>
                <span className="badge badge-ok">total: {totalLabel}</span>
              </div>
            </div>
            <OperationalTable
              testId="toolset-learning-execution-table"
              columns={[
                { key: 'id', label: 'Execution', render: row => String(row.id ?? '-') },
                { key: 'action', label: 'Action', render: row => String(row.action ?? '-') },
                { key: 'domain', label: 'Domain', render: row => String(row.domain ?? '-') },
                { key: 'status', label: 'Status', render: row => String(row.status ?? '-') },
                {
                  key: 'policy',
                  label: 'Policy',
                  render: row =>
                    row.policyViolation === true ? (
                      <span className="badge badge-danger">violated</span>
                    ) : (
                      <span className="badge badge-ok">clean</span>
                    )
                },
                { key: 'createdAt', label: 'Created', render: row => String(row.createdAt ?? '-') }
              ]}
              rows={executionItems}
              rowKey={(row, index) => `${String(row.id ?? 'execution')}-${index}`}
              onRowClick={row => setSelectedExecution(row)}
              emptyLabel="No execution traces"
            />
            <div>
              <button
                type="button"
                onClick={() => {
                  if (hasNext) {
                    executionsQuery.fetchNextPage()
                  }
                }}
                disabled={!hasNext || executionsQuery.isFetchingNextPage}
                className="nexus-domain-btn toolset-btn toolset-btn-compact"
              >
                {executionsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
            <AdvancedJsonPanel testId="toolset-learning-execution-json" value={executionPage ?? {}} />
          </section>
        </LoadablePanel>

        <DetailDrawer
          testId="toolset-learning-detail-drawer"
          title="Toolset detail"
          open={selectedExecution !== null}
          onClose={() => setSelectedExecution(null)}
        >
          <EntityDetailSections
            testIdPrefix="toolset-learning-detail"
            overview={[
              { label: 'execution', value: String(selectedExecution?.id ?? '-') },
              { label: 'action', value: String(selectedExecution?.action ?? selectedExecution?.metric ?? '-') },
              {
                label: 'status',
                value: (
                  <StatusChip
                    value={String(
                      selectedExecution?.status ??
                        (selectedExecution?.policyViolation ? 'violated' : 'clean')
                    )}
                  />
                )
              }
            ]}
            operationalFields={[
              { label: 'domain', value: String(selectedExecution?.domain ?? '-') },
              { label: 'scenario', value: String(selectedExecution?.scenario ?? '-') },
              { label: 'plugin', value: String(selectedExecution?.pluginId ?? '-') },
              {
                label: 'input summary',
                value: String((selectedExecution?.presentation as any)?.inputSummary?.kind ?? '-')
              },
              {
                label: 'output summary',
                value: String((selectedExecution?.presentation as any)?.outputSummary?.kind ?? '-')
              },
              {
                label: 'policy reason',
                value: String((selectedExecution?.presentation as any)?.policyViolationReason ?? selectedExecution?.errorMessage ?? '-')
              },
              {
                label: 'retryable',
                value: String((selectedExecution?.presentation as any)?.retryable ?? '-')
              }
            ]}
            diagnostics={[
              { label: 'created', value: String(selectedExecution?.createdAt ?? '-') },
              { label: 'error code', value: String(selectedExecution?.errorCode ?? '-') }
            ]}
            rawValue={selectedExecution}
            advancedTestId="toolset-learning-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

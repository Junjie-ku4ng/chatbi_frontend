'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { listSemanticModels } from '@/lib/api-client'
import {
  cancelIndicatorImportJob,
  createIndicatorImportJob,
  executeIndicatorImportJob,
  getIndicatorGovernanceWorkbench,
  listIndicatorApprovalHistory,
  listIndicatorApprovalQueue,
  listIndicatorImportJobItems,
  listIndicatorImportJobs,
  listIndicatorRegistryTemplates,
  retryFailedIndicatorImportJob,
  voteIndicatorApprovalsBatch
} from '@/modules/governance/indicator/api'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'
import { mergePagingItems, toPagingWindowState } from '@/modules/shared/paging/paging-adapter'

const v2FlagEnabled = String(process.env.NEXT_PUBLIC_INDICATOR_OPS_V2 || '').toLowerCase() === 'true'
const v2Allowlist = String(process.env.NEXT_PUBLIC_INDICATOR_OPS_V2_ALLOWLIST || '')
  .split(',')
  .map(item => item.trim())
  .filter(item => item !== '')

export default function IndicatorOpsPage() {
  const [modelId, setModelId] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedApprovals, setSelectedApprovals] = useState<Record<string, boolean>>({})
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedItemKeys, setSelectedItemKeys] = useState<Record<string, boolean>>({})
  const [importStatusFilter, setImportStatusFilter] = useState('')
  const [itemStatusFilter, setItemStatusFilter] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState('')
  const [lastFailedVotes, setLastFailedVotes] = useState<Array<{ indicatorId: string; decision: 'approve' | 'reject'; comment?: string }>>([])
  const [importJobsRows, setImportJobsRows] = useState<any[]>([])
  const [importJobsNextCursor, setImportJobsNextCursor] = useState<string | null>(null)
  const [approvalHistoryRows, setApprovalHistoryRows] = useState<any[]>([])
  const [approvalHistoryNextCursor, setApprovalHistoryNextCursor] = useState<string | null>(null)
  const [jobItemsRows, setJobItemsRows] = useState<any[]>([])
  const [jobItemsNextCursor, setJobItemsNextCursor] = useState<string | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['indicator-ops-models'],
    queryFn: listSemanticModels
  })

  const effectiveModelId = modelId || modelsQuery.data?.[0]?.id || ''
  const v2EnabledForModel = useMemo(() => {
    if (!effectiveModelId) return false
    if (!v2FlagEnabled) return false
    if (v2Allowlist.length === 0) return true
    return v2Allowlist.includes(effectiveModelId)
  }, [effectiveModelId])

  const workbenchQuery = useQuery({
    queryKey: ['indicator-ops-workbench', effectiveModelId],
    enabled: Boolean(effectiveModelId),
    queryFn: () => getIndicatorGovernanceWorkbench(effectiveModelId, { windowHours: 72 })
  })

  const importJobsQuery = useQuery({
    queryKey: ['indicator-ops-import-jobs', effectiveModelId, importStatusFilter],
    enabled: Boolean(effectiveModelId),
    queryFn: () =>
      listIndicatorImportJobs(effectiveModelId, {
        status: importStatusFilter || undefined,
        cursor: '0',
        limit: 50
      })
  })

  const approvalsQuery = useQuery({
    queryKey: ['indicator-ops-approvals', effectiveModelId, search],
    enabled: Boolean(effectiveModelId),
    queryFn: () => listIndicatorApprovalQueue(effectiveModelId, { q: search || undefined, limit: 100, offset: 0 })
  })

  const approvalHistoryQuery = useQuery({
    queryKey: ['indicator-ops-approval-history', effectiveModelId, historyStatusFilter],
    enabled: Boolean(effectiveModelId),
    queryFn: () =>
      listIndicatorApprovalHistory(effectiveModelId, {
        status: historyStatusFilter || undefined,
        cursor: '0',
        limit: 50
      })
  })

  const templatesQuery = useQuery({
    queryKey: ['indicator-ops-templates', effectiveModelId],
    enabled: Boolean(effectiveModelId),
    queryFn: () => listIndicatorRegistryTemplates(effectiveModelId)
  })

  const jobItemsQuery = useQuery({
    queryKey: ['indicator-ops-job-items', selectedJobId, itemStatusFilter],
    enabled: Boolean(selectedJobId),
    queryFn: () =>
      listIndicatorImportJobItems(selectedJobId as string, {
        status: itemStatusFilter || undefined,
        cursor: '0',
        limit: 100
      })
  })

  useEffect(() => {
    const payload = importJobsQuery.data
    if (!payload) return
    const windowed = toPagingWindowState(payload)
    setImportJobsRows(windowed.items)
    setImportJobsNextCursor(windowed.nextCursor)
  }, [importJobsQuery.data])

  useEffect(() => {
    const payload = approvalHistoryQuery.data
    if (!payload) return
    const windowed = toPagingWindowState(payload)
    setApprovalHistoryRows(windowed.items)
    setApprovalHistoryNextCursor(windowed.nextCursor)
  }, [approvalHistoryQuery.data])

  useEffect(() => {
    const payload = jobItemsQuery.data
    if (!payload) return
    const windowed = toPagingWindowState(payload)
    setJobItemsRows(windowed.items)
    setJobItemsNextCursor(windowed.nextCursor)
  }, [jobItemsQuery.data])

  const loadMoreImportJobsMutation = useMutation({
    mutationFn: async (cursor: string) =>
      listIndicatorImportJobs(effectiveModelId, {
        status: importStatusFilter || undefined,
        cursor,
        limit: 50
      }),
    onSuccess: payload => {
      const windowed = toPagingWindowState(payload)
      setImportJobsRows(current => mergePagingItems(current, windowed.items, item => String((item as any).id)))
      setImportJobsNextCursor(windowed.nextCursor)
    }
  })

  const loadMoreApprovalHistoryMutation = useMutation({
    mutationFn: async (cursor: string) =>
      listIndicatorApprovalHistory(effectiveModelId, {
        status: historyStatusFilter || undefined,
        cursor,
        limit: 50
      }),
    onSuccess: payload => {
      const windowed = toPagingWindowState(payload)
      setApprovalHistoryRows(current => mergePagingItems(current, windowed.items, item => String((item as any).id)))
      setApprovalHistoryNextCursor(windowed.nextCursor)
    }
  })

  const loadMoreJobItemsMutation = useMutation({
    mutationFn: async (cursor: string) =>
      listIndicatorImportJobItems(selectedJobId as string, {
        status: itemStatusFilter || undefined,
        cursor,
        limit: 100
      }),
    onSuccess: payload => {
      const windowed = toPagingWindowState(payload)
      setJobItemsRows(current => mergePagingItems(current, windowed.items, item => String((item as any).id)))
      setJobItemsNextCursor(windowed.nextCursor)
    }
  })

  const refreshAll = async () => {
    await Promise.all([
      workbenchQuery.refetch(),
      importJobsQuery.refetch(),
      approvalsQuery.refetch(),
      approvalHistoryQuery.refetch(),
      selectedJobId ? jobItemsQuery.refetch() : Promise.resolve()
    ])
  }

  const createImportMutation = useMutation({
    mutationFn: async () =>
      createIndicatorImportJob({
        modelId: effectiveModelId,
        sourceType: 'manual',
        payload: {
          items: [
            {
              code: `E2E_IMPORT_${Date.now()}`,
              name: 'Ops imported indicator',
              type: 'measure',
              simulateTransientFailure: true
            }
          ]
        }
      }),
    onSuccess: async job => {
      setStatus(`Import job created (${job.id})`)
      await refreshAll()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Failed to create import job')
    }
  })

  const executeImportMutation = useMutation({
    mutationFn: async (jobId: string) => executeIndicatorImportJob(jobId, { actor: 'ops-user' }),
    onSuccess: async result => {
      setStatus(`Import executed: ${result.summary.succeeded}/${result.summary.total} succeeded`)
      await refreshAll()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Failed to execute import job')
    }
  })

  const retryImportMutation = useMutation({
    mutationFn: async (payload: { jobId: string; itemIds?: string[] }) =>
      retryFailedIndicatorImportJob(payload.jobId, {
        actor: 'ops-user',
        itemIds: payload.itemIds
      }),
    onSuccess: async result => {
      setStatus(`Retry finished: ${result.summary.succeeded}/${result.summary.total} succeeded`)
      await refreshAll()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Retry failed')
    }
  })

  const cancelImportMutation = useMutation({
    mutationFn: async (jobId: string) => cancelIndicatorImportJob(jobId, { actor: 'ops-user' }),
    onSuccess: async result => {
      setStatus(`Import job cancelled (${result.job.id})`)
      await refreshAll()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Cancel failed')
    }
  })

  const voteBatchMutation = useMutation({
    mutationFn: async (payload: Array<{ indicatorId: string; decision: 'approve' | 'reject'; comment?: string }>) =>
      voteIndicatorApprovalsBatch({
        modelId: effectiveModelId,
        voteStage: 'review',
        items: payload,
        actor: 'ops-user'
      }),
    onSuccess: async result => {
      const failed = result.items.filter(item => !item.success).map(item => ({
        indicatorId: item.indicatorId,
        decision: (item.decision === 'reject' ? 'reject' : 'approve') as 'approve' | 'reject',
        comment: item.error
      }))
      setLastFailedVotes(failed)
      setStatus(`Batch vote finished: ${result.summary.succeeded}/${result.summary.total} succeeded`)
      setSelectedApprovals({})
      await refreshAll()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Batch vote failed')
    }
  })

  const selectedApprovalIds = useMemo(
    () => Object.entries(selectedApprovals).filter(([, checked]) => checked).map(([id]) => id),
    [selectedApprovals]
  )

  const selectedRetryItemIds = useMemo(
    () => Object.entries(selectedItemKeys).filter(([, checked]) => checked).map(([id]) => id),
    [selectedItemKeys]
  )

  const summary = workbenchQuery.data?.summary
  const importJobs = importJobsRows
  const approvals = approvalsQuery.data?.items ?? []
  const approvalHistory = approvalHistoryRows
  const templates = templatesQuery.data ?? []
  const jobItems = jobItemsRows

  const selectedJob = useMemo(() => importJobs.find(item => item.id === selectedJobId), [importJobs, selectedJobId])

  return (
    <AccessGuard scopes={['allow:indicator:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Indicator Ops Workbench Pro</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              data-testid="indicator-ops-model-select"
              aria-label="Indicator ops model"
              value={effectiveModelId}
              onChange={event => setModelId(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 220, background: '#fff' }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.cube ?? 'n/a'})
                </option>
              ))}
            </select>
            <button
              data-testid="indicator-ops-create-import-job"
              className="badge badge-ok"
              style={{ border: 'none', cursor: 'pointer' }}
              onClick={() => createImportMutation.mutate()}
              type="button"
              disabled={!effectiveModelId}
            >
              Create import job
            </button>
          </div>
          {status ? (
            <span data-testid="indicator-ops-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {status}
            </span>
          ) : null}
          {!v2EnabledForModel ? (
            <span className="badge badge-warn">Indicator Ops V2 disabled for current model (flag + allowlist)</span>
          ) : null}
        </header>

        <LoadablePanel loading={workbenchQuery.isLoading || importJobsQuery.isLoading} error={workbenchQuery.error || importJobsQuery.error}>
          <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <MetricStrip
              testId="indicator-ops-summary-strip"
              items={[
                {
                  label: 'import success',
                  value: `${Math.round((summary?.importThroughput.successRate ?? 0) * 100)}%`,
                  tone: (summary?.importThroughput.successRate ?? 0) < 0.8 ? 'warn' : 'ok'
                },
                {
                  label: 'approval backlog',
                  value: summary?.approvalBacklog.pendingItems ?? approvals.length,
                  tone: (summary?.approvalBacklog.pendingItems ?? approvals.length) > 10 ? 'warn' : 'ok'
                },
                {
                  label: 'processed 24h',
                  value: summary?.importThroughput.processedItems ?? 0,
                  tone: 'ok'
                },
                {
                  label: 'failed 24h',
                  value: summary?.importThroughput.failedItems ?? 0,
                  tone: (summary?.importThroughput.failedItems ?? 0) > 0 ? 'danger' : 'ok'
                }
              ]}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>Import Jobs</strong>
              <select
                data-testid="indicator-ops-import-status-filter"
                aria-label="Import jobs status filter"
                value={importStatusFilter}
                onChange={event => setImportStatusFilter(event.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
              >
                <option value="">all status</option>
                <option value="pending">pending</option>
                <option value="running">running</option>
                <option value="completed">completed</option>
                <option value="partial">partial</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <OperationalTable
              testId="indicator-ops-import-jobs-table"
              rows={importJobs.map(item => ({ ...item }))}
              rowKey={row => String(row.id)}
              columns={[
                { key: 'id', label: 'Job', render: row => <span className="badge badge-ok">{String(row.id)}</span> },
                { key: 'status', label: 'Status', render: row => <span className="badge badge-warn">{String(row.status)}</span> },
                { key: 'sourceType', label: 'Source', render: row => String(row.sourceType) },
                {
                  key: 'progress',
                  label: 'Progress',
                  render: row => `${Number(row.processedItems ?? 0)}/${Number(row.totalItems ?? 0)} (failed ${Number(row.failedItems ?? 0)})`
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: row => {
                    const jobId = String(row.id)
                    return (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          data-testid={`indicator-ops-import-execute-${jobId}`}
                          type="button"
                          className="badge badge-ok"
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={event => {
                            event.stopPropagation()
                            executeImportMutation.mutate(jobId)
                          }}
                        >
                          Execute
                        </button>
                        <button
                          data-testid={`indicator-ops-import-retry-${jobId}`}
                          type="button"
                          className="badge badge-warn"
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={event => {
                            event.stopPropagation()
                            retryImportMutation.mutate({ jobId })
                          }}
                        >
                          Retry failed
                        </button>
                        <button
                          data-testid={`indicator-ops-import-cancel-${jobId}`}
                          type="button"
                          className="badge badge-danger"
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={event => {
                            event.stopPropagation()
                            cancelImportMutation.mutate(jobId)
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          data-testid={`indicator-ops-import-view-${jobId}`}
                          type="button"
                          className="badge badge-ok"
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={event => {
                            event.stopPropagation()
                            setSelectedJobId(jobId)
                            setSelectedItemKeys({})
                          }}
                        >
                          View
                        </button>
                      </div>
                    )
                  }
                }
              ]}
              emptyLabel="No import jobs"
            />
            {importJobsNextCursor ? (
              <button
                data-testid="indicator-ops-import-jobs-load-more"
                type="button"
                className="badge badge-warn"
                style={{ border: 'none', cursor: 'pointer', width: 'fit-content' }}
                disabled={loadMoreImportJobsMutation.isPending}
                onClick={() => loadMoreImportJobsMutation.mutate(importJobsNextCursor)}
              >
                {loadMoreImportJobsMutation.isPending ? 'Loading...' : 'Load more jobs'}
              </button>
            ) : null}

            <section className="card" style={{ padding: 10, display: 'grid', gap: 8, background: '#fff' }}>
              <strong>Failure hotspots</strong>
              {(summary?.failureHotspots ?? []).length === 0 ? (
                <span className="state state-empty">No import failures in selected window.</span>
              ) : (
                (summary?.failureHotspots ?? []).map(item => (
                  <div key={item.code} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{item.code}</span>
                    <span className="badge badge-warn">{item.total}</span>
                  </div>
                ))
              )}
            </section>
          </section>
        </LoadablePanel>

        <LoadablePanel loading={approvalsQuery.isLoading || approvalHistoryQuery.isLoading} error={approvalsQuery.error || approvalHistoryQuery.error}>
          <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>Approval Queue</strong>
            <form
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                const payload = selectedApprovalIds.map(indicatorId => ({ indicatorId, decision: 'approve' as const }))
                if (payload.length > 0) {
                  await voteBatchMutation.mutateAsync(payload)
                }
              }}
              style={{ display: 'grid', gap: 10 }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  data-testid="indicator-ops-search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search code/name"
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 240 }}
                />
                <button data-testid="indicator-ops-approve-selected" className="badge badge-ok" style={{ border: 'none', cursor: 'pointer' }}>
                  Approve selected ({selectedApprovalIds.length})
                </button>
              </div>

              <OperationalTable
                testId="indicator-ops-approval-queue-table"
                rows={approvals.map(item => ({ ...item }))}
                rowKey={row => String(row.indicatorId)}
                columns={[
                  {
                    key: 'select',
                    label: 'Select',
                    render: row => (
                      <input
                        data-testid={`indicator-ops-approval-select-${String(row.indicatorId)}`}
                        aria-label={`Select approval indicator ${String(row.code ?? row.indicatorId)}`}
                        type="checkbox"
                        checked={Boolean(selectedApprovals[String(row.indicatorId)])}
                        onChange={event =>
                          setSelectedApprovals(prev => ({
                            ...prev,
                            [String(row.indicatorId)]: event.target.checked
                          }))
                        }
                      />
                    )
                  },
                  { key: 'code', label: 'Code', render: row => <span className="badge badge-warn">{String(row.code)}</span> },
                  { key: 'name', label: 'Name', render: row => String(row.name) },
                  { key: 'workflow', label: 'Workflow', render: row => <span className="badge badge-ok">{String(row.workflow)}</span> },
                  { key: 'status', label: 'Status', render: row => String(row.status) }
                ]}
                emptyLabel="No approval items"
              />
            </form>

            {lastFailedVotes.length > 0 ? (
              <button
                type="button"
                data-testid="indicator-ops-retry-failed"
                className="badge badge-warn"
                style={{ border: 'none', cursor: 'pointer', width: 'fit-content' }}
                onClick={async () => {
                  await voteBatchMutation.mutateAsync(lastFailedVotes)
                }}
              >
                Retry failed approvals ({lastFailedVotes.length})
              </button>
            ) : null}

            <section className="card" style={{ padding: 10, display: 'grid', gap: 8, background: '#fff' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>Approval History</strong>
                <select
                  data-testid="indicator-ops-history-status-filter"
                  aria-label="Approval history status filter"
                  value={historyStatusFilter}
                  onChange={event => setHistoryStatusFilter(event.target.value)}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                >
                  <option value="">all status</option>
                  <option value="applied">applied</option>
                  <option value="failed">failed</option>
                </select>
              </div>
              {approvalHistory.length === 0 ? (
                <span className="state state-empty">No approval history</span>
              ) : (
                <div data-testid="indicator-ops-approval-history-table">
                  <VirtualizedList
                    items={approvalHistory}
                    estimateSize={72}
                    height={320}
                    hasMore={Boolean(approvalHistoryNextCursor)}
                    isLoadingMore={loadMoreApprovalHistoryMutation.isPending}
                    onLoadMore={() => {
                      if (approvalHistoryNextCursor && !loadMoreApprovalHistoryMutation.isPending) {
                        loadMoreApprovalHistoryMutation.mutate(approvalHistoryNextCursor)
                      }
                    }}
                    getKey={item => String((item as any).id)}
                    renderItem={item => (
                      <article className="card" style={{ borderRadius: 10, padding: 8, display: 'grid', gap: 4, marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="badge badge-warn">{String((item as any).status ?? 'unknown')}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{String((item as any).createdAt ?? 'n/a')}</span>
                          <span className="badge badge-ok">{String((item as any).indicatorCode ?? (item as any).indicatorId ?? 'n/a')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                          <span>decision: {String((item as any).decision ?? '-')}</span>
                          <span>actor: {String((item as any).createdBy ?? 'system')}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {String((item as any).resolutionHint ?? (item as any).errorMessage ?? '-')}
                        </span>
                      </article>
                    )}
                  />
                </div>
              )}
            </section>
          </section>
        </LoadablePanel>

        <LoadablePanel loading={templatesQuery.isLoading} error={templatesQuery.error}>
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Registry templates</strong>
            <OperationalTable
              testId="indicator-ops-template-table"
              rows={templates.map(item => ({ ...item }))}
              rowKey={row => String(row.id)}
              columns={[
                { key: 'name', label: 'Name', render: row => <span className="badge badge-ok">{String(row.name)}</span> },
                { key: 'description', label: 'Description', render: row => String(row.description ?? '-') },
                { key: 'createdBy', label: 'Created by', render: row => String(row.createdBy ?? 'system') }
              ]}
              emptyLabel="No templates found"
            />
            <AdvancedJsonPanel testId="indicator-ops-templates-json" value={templates} />
          </section>
        </LoadablePanel>

        <AdvancedJsonPanel testId="indicator-ops-workbench-json" value={workbenchQuery.data ?? {}} />

        <DetailDrawer
          open={Boolean(selectedJobId)}
          onClose={() => {
            setSelectedJobId(null)
            setSelectedItemKeys({})
          }}
          title={`Import Job ${selectedJobId ?? ''}`}
          testId="indicator-ops-job-detail-drawer"
        >
          <MetricStrip
            items={[
              { label: 'status', value: selectedJob?.status ?? 'n/a', tone: selectedJob?.status === 'failed' ? 'danger' : 'warn' },
              {
                label: 'processed',
                value: `${selectedJob?.processedItems ?? 0}/${selectedJob?.totalItems ?? 0}`,
                tone: 'ok'
              },
              {
                label: 'failed',
                value: selectedJob?.failedItems ?? 0,
                tone: (selectedJob?.failedItems ?? 0) > 0 ? 'danger' : 'ok'
              }
            ]}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              data-testid="indicator-ops-drawer-execute"
              type="button"
              className="badge badge-ok"
              style={{ border: 'none', cursor: 'pointer' }}
              disabled={!selectedJobId}
              onClick={() => selectedJobId && executeImportMutation.mutate(selectedJobId)}
            >
              Execute
            </button>
            <button
              data-testid="indicator-ops-drawer-retry"
              type="button"
              className="badge badge-warn"
              style={{ border: 'none', cursor: 'pointer' }}
              disabled={!selectedJobId}
              onClick={() =>
                selectedJobId &&
                retryImportMutation.mutate({
                  jobId: selectedJobId,
                  itemIds: selectedRetryItemIds.length > 0 ? selectedRetryItemIds : undefined
                })
              }
            >
              Retry failed
            </button>
            <button
              data-testid="indicator-ops-drawer-cancel"
              type="button"
              className="badge badge-danger"
              style={{ border: 'none', cursor: 'pointer' }}
              disabled={!selectedJobId}
              onClick={() => selectedJobId && cancelImportMutation.mutate(selectedJobId)}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong>Items</strong>
            <select
              data-testid="indicator-ops-item-status-filter"
              aria-label="Import job item status filter"
              value={itemStatusFilter}
              onChange={event => setItemStatusFilter(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
            >
              <option value="">all status</option>
              <option value="pending">pending</option>
              <option value="succeeded">succeeded</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <LoadablePanel loading={jobItemsQuery.isLoading} error={jobItemsQuery.error}>
            {jobItems.length === 0 ? (
              <span className="state state-empty">No job items</span>
            ) : (
              <div data-testid="indicator-ops-job-items-table">
                <VirtualizedList
                  items={jobItems}
                  estimateSize={72}
                  height={320}
                  hasMore={Boolean(jobItemsNextCursor)}
                  isLoadingMore={loadMoreJobItemsMutation.isPending}
                  onLoadMore={() => {
                    if (jobItemsNextCursor && !loadMoreJobItemsMutation.isPending) {
                      loadMoreJobItemsMutation.mutate(jobItemsNextCursor)
                    }
                  }}
                  getKey={item => String((item as any).id)}
                  renderItem={item => {
                    const row = item as any
                    const itemKey = String(row.itemKey ?? '')
                    const checked = Boolean(selectedItemKeys[itemKey])
                    return (
                      <article className="card" style={{ borderRadius: 10, padding: 8, display: 'grid', gap: 4, marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            data-testid={`indicator-ops-item-select-${itemKey}`}
                            aria-label={`Select import item ${itemKey}`}
                            type="checkbox"
                            disabled={String(row.status) !== 'failed'}
                            checked={checked}
                            onChange={event =>
                              setSelectedItemKeys(prev => ({
                                ...prev,
                                [itemKey]: event.target.checked
                              }))
                            }
                          />
                          <span className="badge badge-ok">{itemKey}</span>
                          <span className="badge badge-warn">{String(row.status ?? 'unknown')}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>attempts: {Number(row.attemptCount ?? 0)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                          <span>errorCode: {String(row.errorCode ?? '-')}</span>
                          <span>error: {String(row.errorMessage ?? '-')}</span>
                        </div>
                      </article>
                    )
                  }}
                />
              </div>
            )}
          </LoadablePanel>

          <AdvancedJsonPanel testId="indicator-ops-job-items-json" value={jobItemsQuery.data ?? {}} />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

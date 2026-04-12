'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getTrace, listTraceActions, listTraceTimeline, runTraceAction, type TraceActionRun } from '@/modules/trace/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function TraceDetailPage() {
  const pageSize = 50
  const params = useParams<{ traceKey: string }>()
  const traceKey = params.traceKey
  const [eventId, setEventId] = useState('')
  const [replayModelId, setReplayModelId] = useState('')
  const [timelineKind, setTimelineKind] = useState<'all' | 'run' | 'link' | 'action'>('all')
  const [timelineStatus, setTimelineStatus] = useState<'all' | 'open' | 'completed' | 'failed' | 'applied' | 'partial'>('all')
  const [actionStatusFilter, setActionStatusFilter] = useState<'all' | 'applied' | 'partial' | 'failed'>('all')
  const [actionTypeFilter, setActionTypeFilter] = useState<'all' | 'ack_alert' | 'replay_dlq'>('all')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<Record<string, unknown> | null>(null)

  const traceQuery = useQuery({
    queryKey: ['trace-detail', traceKey],
    enabled: Boolean(traceKey),
    queryFn: () => getTrace(traceKey)
  })

  const actionRunsQuery = useInfiniteQuery({
    queryKey: ['trace-action-runs', traceKey, actionStatusFilter, actionTypeFilter],
    enabled: Boolean(traceKey),
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listTraceActions(traceKey, {
        status: actionStatusFilter === 'all' ? undefined : actionStatusFilter,
        actionType: actionTypeFilter === 'all' ? undefined : actionTypeFilter,
        limit: pageSize,
        offset: Number(pageParam ?? 0)
      }),
    getNextPageParam: (lastPage, pages) => {
      const typedPages = pages as Array<{ items?: TraceActionRun[] }>
      const typedLast = lastPage as { total?: number }
      const loaded = typedPages.reduce((sum, page) => sum + (page.items?.length ?? 0), 0)
      if (loaded >= (typedLast.total ?? 0)) {
        return undefined
      }
      return loaded
    }
  })
  const timelineQuery = useQuery({
    queryKey: ['trace-timeline', traceKey, timelineKind, timelineStatus],
    enabled: Boolean(traceKey),
    queryFn: () =>
      listTraceTimeline(traceKey, {
        kind: timelineKind === 'all' ? undefined : timelineKind,
        status: timelineStatus === 'all' ? undefined : timelineStatus,
        view: 'operational',
        page: 1,
        pageSize: 100
      })
  })

  const runMutation = useMutation({
    mutationFn: async (input: {
      action: 'ack_alert' | 'replay_dlq'
      params?: Record<string, unknown>
    }) => runTraceAction(traceKey, input),
    onSuccess: async payload => {
      setStatusMessage(`Action completed${payload.actionRun ? ` (${payload.actionRun.status})` : ''}`)
      await traceQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Trace action failed')
    }
  })

  const detail = traceQuery.data
  const timelineItems = timelineQuery.data?.items ?? []
  const actionItems = useMemo(() => (actionRunsQuery.data?.pages ?? []).flatMap(page => page.items ?? []), [actionRunsQuery.data?.pages])
  const defaultModelId = useMemo(() => detail?.run?.modelId ?? '', [detail?.run?.modelId])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Trace Detail</strong>
          <span data-testid="trace-detail-key" className="badge badge-warn" style={{ width: 'fit-content' }}>
            {traceKey}
          </span>
          {statusMessage ? (
            <span data-testid="trace-detail-status" className="badge badge-ok" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={traceQuery.isLoading}
          error={traceQuery.error}
          empty={!detail}
          loadingLabel="Loading trace detail..."
          emptyLabel="Trace not found"
          retry={() => {
            void traceQuery.refetch()
          }}
        >
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Run summary</strong>
            <MetricStrip
              testId="trace-run-summary-strip"
              items={[
                { label: 'root', value: String(detail?.run.rootType ?? '-'), tone: 'warn' },
                { label: 'status', value: String(detail?.run.status ?? '-'), tone: detail?.run.status === 'failed' ? 'danger' : 'ok' },
                { label: 'model', value: String(detail?.run.modelId ?? '-'), tone: 'ok' }
              ]}
            />
            <OperationalTable
              testId="trace-run-summary-table"
              columns={[
                { key: 'traceKey', label: 'Trace', render: row => String(row.traceKey ?? traceKey) },
                { key: 'conversationId', label: 'Conversation', render: row => String(row.conversationId ?? '-') },
                { key: 'queryLogId', label: 'QueryLog', render: row => String(row.queryLogId ?? '-') },
                { key: 'startedAt', label: 'Started', render: row => String(row.startedAt ?? '-') }
              ]}
              rows={detail?.run ? [detail.run as unknown as Record<string, unknown>] : []}
              rowKey={() => 'trace-run-row'}
              onRowClick={row => setSelectedTimelineItem(row)}
            />
            {detail?.run.modelId ? (
              <Link
                data-testid="trace-related-feed-link"
                href={`/feed?modelId=${encodeURIComponent(detail.run.modelId)}&q=${encodeURIComponent(traceKey)}`}
                className="badge badge-warn"
              >
                Feed
              </Link>
            ) : null}
            <AdvancedJsonPanel testId="trace-run-json" value={detail?.run ?? {}} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(detail?.links ?? [])
                .filter(link => link.linkType === 'insight' || link.linkType === 'query_log')
                .slice(0, 5)
                .map(link =>
                  link.linkType === 'insight' ? (
                    <Link
                      key={`${link.linkType}-${link.refId}`}
                      data-testid={`trace-related-insight-${link.refId}`}
                      href={`/dashboard/${encodeURIComponent(link.refId)}`}
                      className="badge badge-ok"
                    >
                      Insight {link.refId}
                    </Link>
                  ) : (
                    <Link
                      key={`${link.linkType}-${link.refId}`}
                      data-testid={`trace-related-query-log-${link.refId}`}
                      href={`/chat?queryLogId=${encodeURIComponent(link.refId)}`}
                      className="badge badge-ok"
                    >
                      QueryLog {link.refId}
                    </Link>
                  )
                )}
            </div>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Actions</strong>
            <div style={{ display: 'grid', gap: 10 }}>
              <form
                data-testid="trace-action-ack-form"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault()
                  const targetEventId = eventId.trim()
                  if (!targetEventId) {
                    setStatusMessage('eventId is required')
                    return
                  }
                  runMutation.mutate({
                    action: 'ack_alert',
                    params: {
                      eventId: targetEventId
                    }
                  })
                }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
              >
                <input
                  data-testid="trace-action-ack-event-id"
                  value={eventId}
                  onChange={event => setEventId(event.target.value)}
                  placeholder="alert event id"
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 220 }}
                />
                <ActionGuard scopes={['allow:write:model:*']}>
                  {permission => (
                    <button
                      data-testid="trace-action-ack-submit"
                      type="submit"
                      disabled={permission.state !== 'enabled' || runMutation.isPending}
                      title={permission.reason}
                      style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                    >
                      Ack Alert
                    </button>
                  )}
                </ActionGuard>
              </form>

              <form
                data-testid="trace-action-replay-form"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault()
                  runMutation.mutate({
                    action: 'replay_dlq',
                    params: {
                      modelId: replayModelId.trim() || defaultModelId,
                      limit: 20
                    }
                  })
                }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
              >
                <input
                  data-testid="trace-action-replay-model-id"
                  value={replayModelId}
                  onChange={event => setReplayModelId(event.target.value)}
                  placeholder={defaultModelId ? `model id (${defaultModelId})` : 'model id'}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 220 }}
                />
                <ActionGuard scopes={['allow:write:model:*']}>
                  {permission => (
                    <button
                      data-testid="trace-action-replay-submit"
                      type="submit"
                      disabled={permission.state !== 'enabled' || runMutation.isPending}
                      title={permission.reason}
                      style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                    >
                      Replay DLQ
                    </button>
                  )}
                </ActionGuard>
              </form>

            </div>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Timeline</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                data-testid="trace-timeline-kind-filter"
                value={timelineKind}
                onChange={event => setTimelineKind(event.target.value as typeof timelineKind)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
              >
                <option value="all">all kinds</option>
                <option value="run">run</option>
                <option value="link">link</option>
                <option value="action">action</option>
              </select>
              <select
                data-testid="trace-timeline-status-filter"
                value={timelineStatus}
                onChange={event => setTimelineStatus(event.target.value as typeof timelineStatus)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
              >
                <option value="all">all status</option>
                <option value="open">open</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="applied">applied</option>
                <option value="partial">partial</option>
              </select>
            </div>
            <LoadablePanel
              loading={timelineQuery.isLoading}
              error={timelineQuery.error}
              empty={timelineItems.length === 0}
              loadingLabel="Loading trace timeline..."
              emptyLabel="No timeline items"
              retry={() => {
                void timelineQuery.refetch()
              }}
            >
              <OperationalTable
                testId="trace-timeline"
                columns={[
                  { key: 'kind', label: 'Kind', render: row => String(row.kind ?? '-') },
                  { key: 'at', label: 'At', render: row => String(row.at ?? '-') },
                  { key: 'status', label: 'Status', render: row => String((row.data as any)?.status ?? '-') },
                  { key: 'suggestion', label: 'Suggestion', render: row => String(row.suggestion ?? '-') }
                ]}
                rows={(timelineItems as unknown as Array<Record<string, unknown>>) ?? []}
                rowKey={(row, index) => `${String(row.kind ?? 'kind')}-${String(row.at ?? 'at')}-${index}`}
                onRowClick={row => setSelectedTimelineItem(row)}
              />
            </LoadablePanel>
            <AdvancedJsonPanel testId="trace-timeline-json" value={timelineQuery.data} />
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Action history</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                data-testid="trace-actions-status-filter"
                value={actionStatusFilter}
                onChange={event => setActionStatusFilter(event.target.value as typeof actionStatusFilter)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
              >
                <option value="all">all status</option>
                <option value="applied">applied</option>
                <option value="partial">partial</option>
                <option value="failed">failed</option>
              </select>
              <select
                data-testid="trace-actions-type-filter"
                value={actionTypeFilter}
                onChange={event => setActionTypeFilter(event.target.value as typeof actionTypeFilter)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
              >
                <option value="all">all actions</option>
                <option value="ack_alert">ack_alert</option>
                <option value="replay_dlq">replay_dlq</option>
              </select>
            </div>
            <LoadablePanel
              loading={actionRunsQuery.isLoading}
              error={actionRunsQuery.error}
              empty={actionItems.length === 0}
              loadingLabel="Loading trace action history..."
              emptyLabel="No action runs"
              retry={() => {
                void actionRunsQuery.refetch()
              }}
            >
              <VirtualizedList
                items={actionItems}
                estimateSize={112}
                height={360}
                hasMore={actionRunsQuery.hasNextPage ?? false}
                isLoadingMore={actionRunsQuery.isFetchingNextPage}
                onLoadMore={() => {
                  if (actionRunsQuery.hasNextPage) {
                    actionRunsQuery.fetchNextPage()
                  }
                }}
                getKey={item => item.id}
                renderItem={item => (
                  <article
                    data-testid={`trace-action-row-${item.id}`}
                    className="card"
                    style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 6, marginBottom: 8 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{item.actionType}</strong>
                      <span className={item.status === 'failed' ? 'badge badge-danger' : 'badge badge-ok'}>{item.status}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.createdAt ?? ''}</span>
                    {item.errorMessage ? <span style={{ fontSize: 12, color: '#b3342f' }}>{item.errorMessage}</span> : null}
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      payload keys:{' '}
                      {Object.keys((item.resultPayload ?? item.requestPayload ?? {}) as Record<string, unknown>)
                        .slice(0, 4)
                        .join(', ') || 'none'}
                    </span>
                  </article>
                )}
              />
            </LoadablePanel>
          </section>
        </LoadablePanel>

        <DetailDrawer
          testId="trace-timeline-detail-drawer"
          title="Timeline detail"
          open={selectedTimelineItem !== null}
          onClose={() => setSelectedTimelineItem(null)}
        >
          <EntityDetailSections
            testIdPrefix="trace-timeline-detail"
            overview={[
              { label: 'kind', value: String(selectedTimelineItem?.kind ?? '-') },
              { label: 'time', value: String(selectedTimelineItem?.at ?? '-') },
              {
                label: 'status',
                value: (
                  <StatusChip
                    value={String(
                      (selectedTimelineItem?.data as Record<string, unknown> | undefined)?.status ??
                        selectedTimelineItem?.status ??
                        '-'
                    )}
                  />
                )
              }
            ]}
            operationalFields={[
              {
                label: 'event summary',
                value: String((selectedTimelineItem?.presentation as any)?.eventSummary ?? selectedTimelineItem?.suggestion ?? '-')
              },
              {
                label: 'action hint',
                value: String((selectedTimelineItem?.presentation as any)?.actionHint ?? '-')
              },
              {
                label: 'resource',
                value: String((selectedTimelineItem?.presentation as any)?.relatedResourceLabel ?? '-')
              }
            ]}
            diagnostics={[
              {
                label: 'suggestion',
                value: String(selectedTimelineItem?.suggestion ?? '-')
              }
            ]}
            rawValue={selectedTimelineItem}
            advancedTestId="trace-timeline-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

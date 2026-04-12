'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import {
  ackAlertEvent,
  ackAlertEventsBatch,
  createAlertRule,
  listAlertEvents,
  listAlertRules,
  listWebhookDlq,
  replayWebhookDlqBatch
} from '@/modules/ops/api'
import { listRelatedAlertTraces } from '@/modules/trace/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'

const pageSize = 50

export default function OpsAlertsPage() {
  const [name, setName] = useState('Embedding Drift Alert')
  const [metricCode, setMetricCode] = useState('embedding_composite_drift')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedDlqIds, setSelectedDlqIds] = useState<string[]>([])
  const [retryDlqIds, setRetryDlqIds] = useState<string[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [dlqStatus, setDlqStatus] = useState<'open' | 'replayed' | 'discarded'>('open')
  const [eventCodeFilter, setEventCodeFilter] = useState('')
  const [modelId, setModelId] = useState<string | undefined>()
  const [traceKey, setTraceKey] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  const rulesQuery = useQuery({
    queryKey: ['ops-alert-rules'],
    queryFn: listAlertRules
  })

  const eventsQuery = useInfiniteQuery({
    queryKey: ['ops-alert-events', eventCodeFilter],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listAlertEvents({
        limit: pageSize,
        offset: Number(pageParam ?? 0),
        eventCode: eventCodeFilter.trim() || undefined
      }),
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
  const eventItems = useMemo(() => (eventsQuery.data?.pages ?? []).flatMap(page => page.items ?? []), [eventsQuery.data?.pages])
  const activeEventId = selectedEventId ?? (eventItems[0] ? String(eventItems[0].id ?? '') : '')

  const relatedTraceQuery = useQuery({
    queryKey: ['ops-alert-related-traces', activeEventId, activeModelId],
    enabled: activeEventId !== '',
    queryFn: () =>
      listRelatedAlertTraces(activeEventId, {
        modelId: activeModelId,
        limit: 20,
        offset: 0
      })
  })

  const dlqQuery = useInfiniteQuery({
    queryKey: ['ops-dlq', activeModelId, dlqStatus],
    enabled: Boolean(activeModelId),
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listWebhookDlq({
        modelId: activeModelId as string,
        status: dlqStatus,
        limit: pageSize,
        offset: Number(pageParam ?? 0)
      }),
    getNextPageParam: (lastPage, pages) => {
      const typedPages = pages as Array<{ items?: Array<Record<string, unknown>> }>
      const typedLastPage = lastPage as { items?: Array<Record<string, unknown>> }
      const loaded = typedPages.reduce((sum, page) => sum + (page.items?.length ?? 0), 0)
      if ((typedLastPage.items?.length ?? 0) < pageSize) {
        return undefined
      }
      return loaded
    }
  })
  const dlqItems = useMemo(() => (dlqQuery.data?.pages ?? []).flatMap(page => page.items ?? []), [dlqQuery.data?.pages])

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const normalizedRuleCode = `${metricCode || 'metric'}_${Date.now().toString(36)}`.replace(/[^a-zA-Z0-9_]/g, '_')
      return createAlertRule({
        ruleCode: normalizedRuleCode,
        name,
        metricCode,
        threshold: 0.2,
        compareOp: 'gt',
        channel: 'webhook',
        target: 'https://example.com/alert',
        status: 'active'
      })
    },
    onSuccess: async () => {
      setStatusMessage('Alert rule created')
      await rulesQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Alert rule creation failed')
    }
  })

  const ackMutation = useMutation({
    mutationFn: async (eventId: string) => ackAlertEvent(eventId, { traceKey: traceKey.trim() || undefined }),
    onSuccess: async () => {
      setStatusMessage('Alert event acknowledged')
      await eventsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Alert event ack failed')
    }
  })

  const batchAckMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      ackAlertEventsBatch({
        ids,
        traceKey: traceKey.trim() || undefined
      }),
    onSuccess: async payload => {
      const failed = payload.items.filter(item => item.status !== 'acked').map(item => item.id)
      setSelectedEventIds(failed)
      setStatusMessage(`Batch ack completed: acked=${payload.acked}, failed=${payload.failed}`)
      await eventsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Batch ack failed')
    }
  })

  const replayMutation = useMutation({
    mutationFn: async (dlqIds: string[]) =>
      replayWebhookDlqBatch({
        modelId: activeModelId as string,
        replayedBy: process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'chatbi-web',
        limit: pageSize,
        dlqIds: dlqIds.length > 0 ? dlqIds : undefined,
        traceKey: traceKey.trim() || undefined
      }),
    onSuccess: async payload => {
      const failedIds = (payload.items ?? [])
        .filter(item => String(item.status ?? '') !== 'replayed')
        .map(item => String(item.id))
      setRetryDlqIds(failedIds)
      setSelectedDlqIds([])
      setStatusMessage(`DLQ replay completed: replayed=${payload.replayed}, failed=${payload.failed}`)
      await dlqQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'DLQ replay failed')
    }
  })

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Alert Rules</strong>
          <form
            data-testid="ops-alert-create-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createRuleMutation.mutateAsync()
            }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}
          >
            <input
              data-testid="ops-alert-rule-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Rule name"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              data-testid="ops-alert-rule-metric-code"
              value={metricCode}
              onChange={event => setMetricCode(event.target.value)}
              placeholder="Metric code"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="ops-alert-rule-submit"
                  type="submit"
                  disabled={permission.state !== 'enabled'}
                  title={permission.reason}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  Create
                </button>
              )}
            </ActionGuard>
          </form>
          {statusMessage ? (
            <span data-testid="ops-alert-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
          {(rulesQuery.data?.items ?? []).map(rule => (
            <article data-testid={`ops-alert-rule-${String(rule.id)}`} key={String(rule.id)} className="card" style={{ borderRadius: 10, padding: 10 }}>
              <strong>{String(rule.name ?? rule.id)}</strong>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                {String(rule.metricCode ?? '')} {String(rule.compareOp ?? '')} {String(rule.threshold ?? '')}
              </p>
            </article>
          ))}
        </section>

        <section className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Alert Events</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              data-testid="ops-alert-trace-key"
              value={traceKey}
              onChange={event => setTraceKey(event.target.value)}
              placeholder="trace key (optional)"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', maxWidth: 320 }}
            />
            <select
              data-testid="ops-alert-event-code-filter"
              value={eventCodeFilter}
              onChange={event => setEventCodeFilter(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
            >
              <option value="">all event codes</option>
              <option value="ai_crypto.kms_policy_violation">ai_crypto.kms_policy_violation</option>
              <option value="ai_crypto.kms_config_invalid">ai_crypto.kms_config_invalid</option>
              <option value="ai_crypto.kms_validation_stale">ai_crypto.kms_validation_stale</option>
              <option value="ai_crypto.live_validation_failed">ai_crypto.live_validation_failed</option>
              <option value="ai_crypto.rotation_failed_exhausted">ai_crypto.rotation_failed_exhausted</option>
            </select>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="ops-alert-batch-ack"
                  type="button"
                  disabled={permission.state !== 'enabled' || selectedEventIds.length === 0 || batchAckMutation.isPending}
                  title={permission.reason}
                  onClick={() => batchAckMutation.mutate(selectedEventIds)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  Ack Selected ({selectedEventIds.length})
                </button>
              )}
            </ActionGuard>
          </div>
          <LoadablePanel
            loading={eventsQuery.isLoading}
            error={eventsQuery.error}
            empty={eventItems.length === 0}
            loadingLabel="Loading alert events..."
            emptyLabel="No alert events found for the selected filters."
            retry={() => {
              void eventsQuery.refetch()
            }}
          >
            <VirtualizedList
              items={eventItems}
              estimateSize={82}
              hasMore={eventsQuery.hasNextPage ?? false}
              isLoadingMore={eventsQuery.isFetchingNextPage}
              onLoadMore={() => {
                if (eventsQuery.hasNextPage) {
                  eventsQuery.fetchNextPage()
                }
              }}
              getKey={item => String((item as Record<string, unknown>).id)}
              renderItem={item => {
                const eventRecord = item as Record<string, unknown>
                const status = String(eventRecord.status ?? 'open')
                const eventId = String(eventRecord.id ?? '')
                return (
                  <article
                    key={eventId}
                    className="card"
                    style={{ borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}
                  >
                    <div>
                      {status === 'open' ? (
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                          <input
                            data-testid={`ops-alert-select-${eventId}`}
                            type="checkbox"
                            checked={selectedEventIds.includes(eventId)}
                            onChange={event => {
                              setSelectedEventIds(current => {
                                if (event.target.checked) {
                                  return [...new Set([...current, eventId])]
                                }
                                return current.filter(id => id !== eventId)
                              })
                            }}
                          />
                          select
                        </label>
                      ) : null}
                      <strong style={{ fontSize: 13 }}>{String(eventRecord.ruleName ?? eventRecord.metricCode ?? eventRecord.id)}</strong>
                      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                        {status} · {String(eventRecord.createdAt ?? '')}
                      </p>
                      {String(eventRecord.eventCode ?? '').startsWith('ai_crypto.') ? (
                        <Link
                          href="/ai/governance"
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            border: '1px solid var(--line)',
                            borderRadius: 999,
                            background: '#fff',
                            padding: '2px 8px',
                            fontSize: 11
                          }}
                        >
                          Open AI Governance
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        data-testid={`ops-alert-select-event-${eventId}`}
                        onClick={() => setSelectedEventId(eventId)}
                        style={{ marginTop: 4, border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 8px', fontSize: 11 }}
                      >
                        Related traces
                      </button>
                    </div>
                    {status === 'open' ? (
                      <ActionGuard scopes={['allow:write:model:*']}>
                        {permission => (
                          <button
                            data-testid={`ops-alert-ack-${eventId}`}
                            type="button"
                            disabled={permission.state !== 'enabled' || ackMutation.isPending}
                            title={permission.reason}
                            onClick={() => ackMutation.mutate(eventId)}
                            style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                          >
                            Ack
                          </button>
                        )}
                      </ActionGuard>
                    ) : (
                      <span className="badge badge-ok">{status}</span>
                    )}
                  </article>
                )
              }}
            />
          </LoadablePanel>
          <LoadablePanel
            loading={relatedTraceQuery.isLoading}
            error={relatedTraceQuery.error}
            empty={(relatedTraceQuery.data?.items ?? []).length === 0}
            loadingLabel="Loading related traces..."
            emptyLabel={
              activeEventId === ''
                ? 'Select an alert event to load related traces.'
                : 'No related traces found for the selected alert event.'
            }
            retry={() => {
              if (activeEventId) {
                void relatedTraceQuery.refetch()
              }
            }}
          >
            <div data-testid="ops-alert-related-traces" style={{ display: 'grid', gap: 6 }}>
              {(relatedTraceQuery.data?.items ?? []).map(trace => (
                <Link key={trace.traceKey} className="badge badge-ok" href={`/ops/traces/${trace.traceKey}`}>
                  {trace.traceKey} · {trace.status}
                </Link>
              ))}
            </div>
          </LoadablePanel>
        </section>

        <section className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>DLQ Batch Replay</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              data-testid="ops-dlq-model"
              value={activeModelId ?? ''}
              onChange={event => setModelId(event.target.value)}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', minWidth: 280 }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <select
              data-testid="ops-dlq-status"
              value={dlqStatus}
              onChange={event => setDlqStatus(event.target.value as 'open' | 'replayed' | 'discarded')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="open">open</option>
              <option value="replayed">replayed</option>
              <option value="discarded">discarded</option>
            </select>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="ops-dlq-replay-selected"
                  type="button"
                  disabled={permission.state !== 'enabled' || selectedDlqIds.length === 0 || replayMutation.isPending}
                  title={permission.reason}
                  onClick={() => replayMutation.mutate(selectedDlqIds)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  Replay Selected ({selectedDlqIds.length})
                </button>
              )}
            </ActionGuard>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="ops-dlq-retry-failed"
                  type="button"
                  disabled={permission.state !== 'enabled' || retryDlqIds.length === 0 || replayMutation.isPending}
                  title={permission.reason}
                  onClick={() => replayMutation.mutate(retryDlqIds)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  Retry Failed ({retryDlqIds.length})
                </button>
              )}
            </ActionGuard>
          </div>
          <LoadablePanel
            loading={dlqQuery.isLoading}
            error={dlqQuery.error}
            empty={dlqItems.length === 0}
            loadingLabel="Loading DLQ items..."
            emptyLabel={
              activeModelId ? 'No DLQ items found for the selected filters.' : 'Select a semantic model to load DLQ items.'
            }
            retry={() => {
              if (activeModelId) {
                void dlqQuery.refetch()
              }
            }}
          >
            <VirtualizedList
              items={dlqItems}
              estimateSize={92}
              hasMore={dlqQuery.hasNextPage ?? false}
              isLoadingMore={dlqQuery.isFetchingNextPage}
              onLoadMore={() => {
                if (dlqQuery.hasNextPage) {
                  dlqQuery.fetchNextPage()
                }
              }}
              getKey={item => String((item as Record<string, unknown>).id)}
              renderItem={item => {
                const row = item as Record<string, unknown>
                const dlqId = String(row.id ?? '')
                const selected = selectedDlqIds.includes(dlqId)
                return (
                  <article
                    data-testid={`ops-dlq-row-${dlqId}`}
                    className="card"
                    style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 6, marginBottom: 8 }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        data-testid={`ops-dlq-select-${dlqId}`}
                        checked={selected}
                        onChange={event => {
                          setSelectedDlqIds(current => {
                            if (event.target.checked) {
                              return [...new Set([...current, dlqId])]
                            }
                            return current.filter(id => id !== dlqId)
                          })
                        }}
                      />
                      <strong>{dlqId}</strong>
                      <span className="badge badge-warn">{String(row.status ?? 'open')}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      webhook: {String(row.webhookId ?? '-')} · attempts: {String(row.attemptCount ?? 0)}
                    </span>
                    {row.lastError ? (
                      <span style={{ fontSize: 12, color: '#b3342f' }}>{String(row.lastError)}</span>
                    ) : null}
                  </article>
                )
              }}
            />
          </LoadablePanel>
        </section>
      </section>
    </AccessGuard>
  )
}

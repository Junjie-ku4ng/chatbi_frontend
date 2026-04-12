'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { listSemanticModels } from '@/lib/api-client'
import {
  batchReadFeedEvents,
  getFeedUnreadSummary,
  listFeed,
  markFeedEventRead,
  type FeedBatchReadResultItem,
  type FeedResourceType
} from '@/modules/feed/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'
import { PayloadHighlightsPanel } from '@/modules/shared/panels/payload-highlights'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const RESOURCE_TYPES: Array<'all' | FeedResourceType> = ['all', 'insight', 'story', 'trace', 'query_log']
const FEED_PRESETS = ['all', 'my', 'team', 'errors'] as const
type FeedPreset = (typeof FEED_PRESETS)[number]

function resolvePresetLabel(preset: FeedPreset) {
  if (preset === 'all') return '全部'
  if (preset === 'my') return '我的动作'
  if (preset === 'team') return '团队动作'
  if (preset === 'errors') return '异常事件'
  return preset
}

function resolveResourceTypeLabel(type: 'all' | FeedResourceType) {
  if (type === 'all') return '全部资源'
  if (type === 'insight') return '洞察'
  if (type === 'story') return '故事'
  if (type === 'trace') return '追踪'
  if (type === 'query_log') return '查询日志'
  return type
}

function resolveBatchStatusLabel(status: FeedBatchReadResultItem['status']) {
  if (status === 'read') return '已读'
  if (status === 'not_found') return '未找到'
  if (status === 'forbidden') return '无权限'
  if (status === 'invalid') return '参数无效'
  return status
}

export default function FeedPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [eventType, setEventType] = useState('')
  const [resourceType, setResourceType] = useState<'all' | FeedResourceType>('all')
  const [query, setQuery] = useState('')
  const [preset, setPreset] = useState<FeedPreset>('all')
  const [status, setStatus] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchResult, setBatchResult] = useState<FeedBatchReadResultItem[]>([])

  const modelsQuery = useQuery({
    queryKey: ['feed-models'],
    queryFn: listSemanticModels
  })
  const modelOptions = modelsQuery.data ?? []
  const activeModelId = modelId ?? modelOptions[0]?.id

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const modelFromQuery = params.get('modelId')
    const eventTypeFromQuery = params.get('eventType')
    const resourceTypeFromQuery = params.get('resourceType')
    const qFromQuery = params.get('q')
    if (modelFromQuery) setModelId(modelFromQuery)
    if (eventTypeFromQuery) setEventType(eventTypeFromQuery)
    if (resourceTypeFromQuery && RESOURCE_TYPES.includes(resourceTypeFromQuery as any)) {
      setResourceType(resourceTypeFromQuery as 'all' | FeedResourceType)
    }
    if (qFromQuery) setQuery(qFromQuery)
  }, [])

  const feedQuery = useQuery({
    queryKey: ['chatbi-feed', activeModelId, eventType, resourceType, query, preset],
    enabled: Boolean(activeModelId),
    queryFn: () => {
      const presetEventType = preset === 'errors' ? 'failed' : undefined
      const presetQuery = preset === 'my' ? 'actor' : undefined
      return listFeed(activeModelId as string, {
        eventType: eventType.trim() || presetEventType || undefined,
        resourceType: resourceType === 'all' ? undefined : resourceType,
        q: query.trim() || presetQuery || undefined,
        limit: 100,
        offset: 0
      })
    }
  })

  const unreadQuery = useQuery({
    queryKey: ['chatbi-feed-unread', activeModelId],
    enabled: Boolean(activeModelId),
    queryFn: () => getFeedUnreadSummary(activeModelId as string)
  })

  const markReadMutation = useMutation({
    mutationFn: async (eventId: string) =>
      markFeedEventRead(eventId, {
        modelId: activeModelId as string
      }),
    onSuccess: async () => {
      setStatus('Event marked as read')
      await unreadQuery.refetch()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Mark read failed')
    }
  })

  const batchReadMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId) throw new Error('请先选择语义模型')
      if (selectedIds.length === 0) throw new Error('请先选择至少一条事件')
      return batchReadFeedEvents({
        modelId: activeModelId,
        eventIds: selectedIds
      })
    },
    onSuccess: async payload => {
      setStatus(`Batch read: ${payload.summary.succeeded}/${payload.summary.total}`)
      setBatchResult(payload.items.filter(item => item.status !== 'read'))
      setSelectedIds([])
      await Promise.all([feedQuery.refetch(), unreadQuery.refetch()])
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Batch read failed')
    }
  })

  useEffect(() => {
    setSelectedIds([])
    setStatus(null)
    setBatchResult([])
  }, [activeModelId, eventType, resourceType, query, preset])

  const feedItems = feedQuery.data?.items ?? []
  const selectedCount = selectedIds.length
  const allSelected = feedItems.length > 0 && selectedCount === feedItems.length
  const pageError = modelsQuery.error ?? feedQuery.error
  const modelsLoading = modelsQuery.isLoading
  const feedLoading = Boolean(activeModelId) && feedQuery.isLoading
  const feedEmpty = Boolean(activeModelId) && feedItems.length === 0
  const feedEmptyLabel = activeModelId
    ? 'No feed events found for the selected filters.'
    : 'Select a semantic model to load feed events.'
  const feedLoadingLabel = modelsLoading ? 'Loading feed models...' : 'Loading feed events...'
  const unreadCountLabel =
    !activeModelId || modelsLoading || unreadQuery.isLoading
      ? '--'
      : unreadQuery.error
        ? '!'
        : String(unreadQuery.data?.unreadCount ?? 0)
  const modelSelectPlaceholder = modelsLoading ? 'Loading semantic models...' : 'No semantic models available'

  const toggleSelect = (eventId: string, checked: boolean) => {
    setSelectedIds(current => {
      if (checked) {
        if (current.includes(eventId)) return current
        return [...current, eventId]
      }
      return current.filter(id => id !== eventId)
    })
  }

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack" style={{ display: 'grid', gap: 16 }}>
        <header className="card nexus-domain-hero" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>协作动态</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FEED_PRESETS.map(item => (
              <button
                key={item}
                type="button"
                className={item === preset ? 'badge badge-ok' : 'badge badge-warn'}
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={() => setPreset(item)}
              >
                {resolvePresetLabel(item)}
              </button>
            ))}
            <span data-testid="feed-unread-count" className="badge badge-danger">
              未读: {unreadCountLabel}
            </span>
            {status ? (
              <span data-testid="feed-status" className="badge badge-warn">
                {status}
              </span>
            ) : null}
            <span data-testid="feed-selected-count" className="badge badge-ok">
              selected: {selectedCount}
            </span>
            <button
              data-testid="feed-batch-read-submit"
              type="button"
              disabled={selectedCount === 0 || batchReadMutation.isPending}
              onClick={() => batchReadMutation.mutate()}
              style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 10px' }}
            >
              {batchReadMutation.isPending ? '执行中...' : '标记已选为已读'}
            </button>
          </div>
          <div className="nexus-domain-filter-grid" style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(220px,1fr) minmax(160px,1fr) minmax(180px,1fr) 1fr' }}>
            <select
              data-testid="feed-model-select"
              value={activeModelId ?? ''}
              onChange={event => setModelId(event.target.value)}
              disabled={modelsLoading || modelOptions.length === 0}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
            >
              {modelOptions.length === 0 ? (
                <option value="">{modelSelectPlaceholder}</option>
              ) : (
                modelOptions.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.cube ?? 'cube'})
                  </option>
                ))
              )}
            </select>
            <select
              data-testid="feed-resource-filter"
              value={resourceType}
              onChange={event => setResourceType(event.target.value as 'all' | FeedResourceType)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
            >
              {RESOURCE_TYPES.map(type => (
                <option key={type} value={type}>
                  {resolveResourceTypeLabel(type)}
                </option>
              ))}
            </select>
            <input
              data-testid="feed-event-type-filter"
              value={eventType}
              onChange={event => setEventType(event.target.value)}
              placeholder="事件类型"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              data-testid="feed-query-filter"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="检索关键词"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
          </div>
        </header>

        <LoadablePanel
          loading={modelsLoading || feedLoading}
          error={pageError}
          empty={!modelsLoading && !feedLoading && !pageError && (!activeModelId || feedEmpty)}
          loadingLabel={feedLoadingLabel}
          emptyLabel={feedEmptyLabel}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void feedQuery.refetch()
            }
          }}
        >
          <section className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <input
                data-testid="feed-select-all"
                type="checkbox"
                checked={allSelected}
                onChange={event => {
                  if (event.target.checked) {
                    setSelectedIds(feedItems.map(item => item.id))
                    return
                  }
                  setSelectedIds([])
                }}
              />
              全选当前页
            </label>
            <VirtualizedList
              items={feedItems}
              estimateSize={150}
              height={600}
              getKey={event => event.id}
              renderItem={event => (
                <article key={event.id} className="card nexus-domain-card" style={{ padding: 10, borderRadius: 10, marginBottom: 8 }} data-testid={`feed-row-${event.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{event.eventType}</strong>
                    <span className="badge badge-warn">{event.createdAt ?? ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <input
                        data-testid={`feed-select-${event.id}`}
                        type="checkbox"
                        checked={selectedIds.includes(event.id)}
                        onChange={next => toggleSelect(event.id, next.target.checked)}
                      />
                      选择
                    </label>
                    <span className="badge badge-ok">{event.resourceType}</span>
                    <span className="badge badge-ok">资源ID: {event.resourceId}</span>
                    <button
                      data-testid={`feed-mark-read-${event.id}`}
                      type="button"
                      onClick={() => markReadMutation.mutate(event.id)}
                      style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 8px', fontSize: 11 }}
                    >
                      标记已读
                    </button>
                    {event.traceKey ? (
                      <Link href={`/ops/traces/${encodeURIComponent(event.traceKey)}`} className="badge badge-warn">
                        追踪
                      </Link>
                    ) : null}
                    {event.resourceType === 'story' ? (
                      <Link href={`/project/${encodeURIComponent(event.resourceId)}`} className="badge badge-warn">
                        故事
                      </Link>
                    ) : null}
                    {event.resourceType === 'insight' ? (
                      <Link href={`/dashboard/${encodeURIComponent(event.resourceId)}`} className="badge badge-warn">
                        洞察
                      </Link>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                    <PayloadHighlightsPanel
                      testId={`feed-payload-highlights-${event.id}`}
                      highlights={event.presentation?.payloadHighlights}
                      emptyLabel="暂无载荷摘要"
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-ok">{event.presentation?.actorDisplay ?? event.actor ?? '系统'}</span>
                      <span className="badge badge-warn">{event.presentation?.resourceLabel ?? `${event.resourceType}:${event.resourceId}`}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      action: {event.presentation?.actionHint ?? event.eventType ?? 'view_detail'}
                    </span>
                    <details>
                      <summary style={{ fontSize: 12, cursor: 'pointer' }}>Advanced JSON</summary>
                      <pre style={{ margin: '6px 0 0', maxHeight: 140, overflow: 'auto', fontSize: 12 }}>
                        {JSON.stringify(event.payload ?? {}, null, 2)}
                      </pre>
                    </details>
                  </div>
                </article>
              )}
            />
            {batchResult.length > 0 ? (
              <section
                data-testid="feed-batch-failed-items"
                className="card nexus-domain-card"
                style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}
              >
                <strong style={{ fontSize: 13 }}>批量失败项</strong>
                {batchResult.map(item => (
                  <div
                    key={`${item.eventId}-${item.status}`}
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}
                  >
                    <span className="badge badge-danger">{resolveBatchStatusLabel(item.status)}</span>
                    <span>{item.eventId}</span>
                    {item.error ? <span style={{ color: 'var(--muted)' }}>{item.error}</span> : null}
                  </div>
                ))}
              </section>
            ) : null}
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

'use client'

import Link from 'next/link'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listSemanticModels } from '@/lib/api-client'
import { addFavorite, listFavorites, listInsights } from '@/modules/insight/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'

const pageSize = 50
const maxRetainedInsights = 1000

export default function InsightsPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tags, setTags] = useState('')

  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const modelOptions = modelsQuery.data ?? []
  const activeModelId = modelId ?? modelOptions[0]?.id

  const insightsQuery = useInfiniteQuery({
    queryKey: ['insights', activeModelId, query, status, tags],
    enabled: Boolean(activeModelId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listInsights(activeModelId as string, {
        q: query.trim() === '' ? undefined : query.trim(),
        statuses: status === 'all' ? undefined : [status],
        tags: tags
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        limit: pageSize,
        cursor: typeof pageParam === 'number' ? pageParam : undefined
      }),
    getNextPageParam: lastPage => {
      const typedLastPage = lastPage as { nextCursor?: number | null }
      return typeof typedLastPage.nextCursor === 'number' ? typedLastPage.nextCursor : undefined
    }
  })

  const favoritesQuery = useQuery({
    queryKey: ['favorites', activeModelId],
    queryFn: () => listFavorites(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const favoriteIds = useMemo(() => new Set((favoritesQuery.data?.items ?? []).map(item => item.resourceId)), [favoritesQuery.data?.items])

  const favoriteMutation = useMutation({
    mutationFn: async (insightId: string) => {
      if (!activeModelId) return null
      return addFavorite(activeModelId, 'insight', insightId)
    },
    onSuccess: async () => {
      await favoritesQuery.refetch()
    }
  })

  const insightItems = useMemo(() => {
    const flattened = (insightsQuery.data?.pages ?? []).flatMap(page => page.items ?? [])
    if (flattened.length <= maxRetainedInsights) {
      return flattened
    }
    return flattened.slice(flattened.length - maxRetainedInsights)
  }, [insightsQuery.data?.pages])
  const hasMoreInsights = insightsQuery.hasNextPage ?? false
  const modelsLoading = modelsQuery.isLoading
  const insightsLoading = Boolean(activeModelId) && insightsQuery.isLoading
  const pageError = modelsQuery.error ?? insightsQuery.error
  const insightEmptyLabel = activeModelId ? 'No insights match current filter' : 'Select a semantic model to load insights.'
  const insightLoadingLabel = modelsLoading ? 'Loading insight models...' : 'Loading insights...'
  const modelSelectPlaceholder = modelsLoading ? 'Loading semantic models...' : 'No semantic models available'

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section data-testid="insights-page-root" style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Insights</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={activeModelId ?? ''}
              onChange={event => {
                setModelId(event.target.value)
              }}
              disabled={modelsLoading || modelOptions.length === 0}
              style={{
                borderRadius: 10,
                border: '1px solid var(--line)',
                background: '#fff',
                padding: '9px 10px',
                minWidth: 220
              }}
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
              value={query}
              onChange={event => {
                setQuery(event.target.value)
              }}
              placeholder="Search title / summary"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '9px 10px', minWidth: 220 }}
            />
            <select
              value={status}
              onChange={event => {
                setStatus(event.target.value)
              }}
              style={{
                borderRadius: 10,
                border: '1px solid var(--line)',
                background: '#fff',
                padding: '9px 10px'
              }}
            >
              <option value="all">all status</option>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
            <input
              value={tags}
              onChange={event => {
                setTags(event.target.value)
              }}
              placeholder="tags: monthly,sales"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '9px 10px', minWidth: 200 }}
            />
          </div>
        </header>

        <LoadablePanel
          loading={modelsLoading || insightsLoading}
          error={pageError}
          empty={!modelsLoading && !insightsLoading && !pageError && (!activeModelId || insightItems.length === 0)}
          loadingLabel={insightLoadingLabel}
          emptyLabel={insightEmptyLabel}
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
          <VirtualizedList
            items={insightItems}
            estimateSize={140}
            hasMore={hasMoreInsights}
            isLoadingMore={insightsQuery.isFetchingNextPage}
            onLoadMore={() => {
              if (hasMoreInsights) {
                insightsQuery.fetchNextPage()
              }
            }}
            getKey={item => item.id}
            renderItem={insight => (
              <article key={insight.id} className="card" style={{ padding: 14, display: 'grid', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Link href={`/dashboard/${insight.id}`} style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 18 }}>
                    {insight.title}
                  </Link>
                  <button
                    type="button"
                    disabled={favoriteIds.has(insight.id) || favoriteMutation.isPending}
                    onClick={() => favoriteMutation.mutate(insight.id)}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {favoriteIds.has(insight.id) ? 'Favorited' : 'Favorite'}
                  </button>
                </div>
                <p style={{ margin: 0, color: 'var(--muted)' }}>{insight.summary ?? 'No summary'}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(insight.tags ?? []).map(tag => (
                    <span key={tag} className="badge badge-ok">
                      {tag}
                    </span>
                  ))}
                  <span className="badge badge-warn">{insight.status}</span>
                  {insight.latestVersion ? <span className="badge badge-ok">v{insight.latestVersion}</span> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {insight.queryLogId ? <span className="badge badge-warn">queryLog: {insight.queryLogId}</span> : null}
                  {insight.conversationId ? <span className="badge badge-warn">conversation: {insight.conversationId}</span> : null}
                </div>
              </article>
            )}
          />
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import {
  addStoryItem,
  cloneStory,
  getStory,
  listStoryVersions,
  promoteStoryTemplate,
  publishStory,
  updateStory,
  type StoryItemType,
  type StoryStatus,
  updateStoryItem
} from '@/modules/story/api'
import { compareSortOrderThenId } from '@/modules/story/sorting'
import { frontendPlatformAdapter } from '@/modules/shared/contracts/frontend-platform-adapter'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'
import { VersionSummaryPanel } from '@/modules/shared/panels/version-summary'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const ITEM_TYPES: StoryItemType[] = ['insight', 'query_log', 'trace']

function resolveStoryStatusLabel(status: StoryStatus | string | undefined) {
  if (status === 'draft') return '草稿'
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return status ?? '未知'
}

function resolveItemTypeLabel(itemType: StoryItemType | string | undefined) {
  if (itemType === 'insight') return '洞察'
  if (itemType === 'query_log') return '查询日志'
  if (itemType === 'trace') return '追踪'
  return itemType ?? '未知'
}

export default function StoryDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const storyId = params.id
  const prefill = frontendPlatformAdapter.story.resolveItemPrefill(searchParams)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [status, setStatus] = useState<StoryStatus>('draft')
  const [itemType, setItemType] = useState<StoryItemType>(prefill.itemType)
  const [refId, setRefId] = useState(prefill.refId)
  const [caption, setCaption] = useState('')
  const [cloneTitle, setCloneTitle] = useState('')
  const [cloneIncludeItems, setCloneIncludeItems] = useState(true)
  const [leftVersionId, setLeftVersionId] = useState<string>('')
  const [rightVersionId, setRightVersionId] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const storyQuery = useQuery({
    queryKey: ['story-detail', storyId],
    enabled: Boolean(storyId),
    queryFn: () => getStory(storyId, { fallbackToDefault: false })
  })

  const versionsQuery = useQuery({
    queryKey: ['story-versions', storyId],
    enabled: Boolean(storyId),
    queryFn: () => listStoryVersions(storyId, { limit: 20, offset: 0 })
  })

  const story = storyQuery.data ?? null

  useEffect(() => {
    if (!story) return
    setTitle(story.title)
    setSummary(story.summary ?? '')
    setStatus(story.status)
  }, [story])

  const patchMutation = useMutation({
    mutationFn: async () => {
      return updateStory(storyId, {
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        status
      })
    },
    onSuccess: async payload => {
      setStatusMessage(`故事已更新（${payload.story.status}）`)
      await storyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '更新失败')
    }
  })

  const publishMutation = useMutation({
    mutationFn: async () => publishStory(storyId),
    onSuccess: async payload => {
      setStatusMessage(`故事已发布（v${payload.story.latestVersion}）`)
      await Promise.all([storyQuery.refetch(), versionsQuery.refetch()])
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '发布失败')
    }
  })

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!refId.trim()) throw new Error('请填写引用 ID')
      return addStoryItem(storyId, {
        itemType,
        refId: refId.trim(),
        caption: caption.trim() || undefined,
        sortOrder: (story?.items?.length ?? 0) + 1
      })
    },
    onSuccess: async payload => {
      setStatusMessage(`条目已关联（${payload.item.itemType}）`)
      setCaption('')
      await storyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '新增条目失败')
    }
  })

  const moveTopMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return updateStoryItem(storyId, itemId, {
        sortOrder: 0
      })
    },
    onSuccess: async () => {
      setStatusMessage('条目已置顶')
      await storyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '重排失败')
    }
  })

  const cloneMutation = useMutation({
    mutationFn: async () =>
      cloneStory(storyId, {
        title: cloneTitle.trim() || undefined,
        includeItems: cloneIncludeItems
      }),
    onSuccess: async payload => {
      setStatusMessage(`故事已克隆（${payload.story.id}）`)
      setCloneTitle('')
      await storyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '克隆失败')
    }
  })

  const promoteMutation = useMutation({
    mutationFn: async () =>
      promoteStoryTemplate(storyId, {
        reason: '由故事详情提升为模板'
      }),
    onSuccess: async payload => {
      setStatusMessage(`模板提升成功（${payload.template.storyId}）`)
      await storyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '模板提升失败')
    }
  })

  const sortedItems = useMemo(() => {
    return [...(story?.items ?? [])].sort(compareSortOrderThenId)
  }, [story?.items])

  const versions = versionsQuery.data?.items ?? []
  const leftVersion = versions.find(version => version.id === leftVersionId) ?? versions[0]
  const rightVersion =
    versions.find(version => version.id === rightVersionId) ?? versions[Math.min(1, Math.max(versions.length - 1, 0))]

  const versionDiff = useMemo(() => {
    if (!leftVersion || !rightVersion) {
      return null
    }
    const toSnapshotItems = (snapshot: Record<string, unknown>) => {
      const items = Array.isArray(snapshot.items) ? snapshot.items : []
      return items
        .map(item => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const itemType = typeof row.itemType === 'string' ? row.itemType : 'insight'
          const refId = typeof row.refId === 'string' ? row.refId : ''
          return {
            key: `${itemType}:${refId}`,
            itemType,
            refId,
            sortOrder: Number(row.sortOrder ?? 0)
          }
        })
        .filter((item): item is { key: string; itemType: string; refId: string; sortOrder: number } => Boolean(item))
    }
    const leftItems = toSnapshotItems(leftVersion.snapshot ?? {})
    const rightItems = toSnapshotItems(rightVersion.snapshot ?? {})
    const leftMap = new Map(leftItems.map(item => [item.key, item]))
    const rightMap = new Map(rightItems.map(item => [item.key, item]))

    const added = rightItems.filter(item => !leftMap.has(item.key))
    const removed = leftItems.filter(item => !rightMap.has(item.key))
    const reordered = rightItems.filter(item => {
      const prev = leftMap.get(item.key)
      if (!prev) return false
      return prev.sortOrder !== item.sortOrder
    })

    return {
      leftVersion,
      rightVersion,
      added,
      removed,
      reordered
    }
  }, [leftVersion, rightVersion])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <LoadablePanel
        loading={storyQuery.isLoading}
        error={storyQuery.error}
        empty={!story}
        loadingLabel="Loading story detail..."
        emptyLabel="Story not found."
        retry={() => {
          void storyQuery.refetch()
        }}
      >
        <section style={{ display: 'grid', gap: 16 }}>
          <header className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>故事详情</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/project/${storyId}/designer`} className="badge badge-ok">
                  设计器
                </Link>
                <Link href="/project" className="badge badge-warn">
                  返回故事列表
                </Link>
              </div>
            </div>
            {story ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span data-testid="story-detail-id" className="badge badge-ok">故事: {story.id}</span>
                <span className={story.status === 'published' ? 'badge badge-ok' : 'badge badge-warn'}>
                  {resolveStoryStatusLabel(story.status)}
                </span>
                <span className="badge badge-ok">版本: {story.latestVersion}</span>
                {(story.metadata as { template?: { isTemplate?: boolean } } | undefined)?.template?.isTemplate ? (
                  <span data-testid="story-template-status" className="badge badge-ok">
                    模板
                  </span>
                ) : null}
                <Link
                  data-testid="story-detail-feed-link"
                  href={`/feed?modelId=${encodeURIComponent(story.modelId)}&resourceType=story&q=${encodeURIComponent(story.id)}`}
                  className="badge badge-warn"
                >
                  打开动态流
                </Link>
              </div>
            ) : null}
            {statusMessage ? (
              <span data-testid="story-detail-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
                {statusMessage}
              </span>
            ) : null}
          </header>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>故事元信息</strong>
            <form
              data-testid="story-edit-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await patchMutation.mutateAsync()
              }}
              style={{ display: 'grid', gap: 8 }}
            >
              <input
                data-testid="story-edit-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="标题"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <input
                data-testid="story-edit-summary"
                value={summary}
                onChange={event => setSummary(event.target.value)}
                placeholder="摘要"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  data-testid="story-edit-status"
                  value={status}
                  onChange={event => setStatus(event.target.value as StoryStatus)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="archived">已归档</option>
                </select>
                <button
                  data-testid="story-edit-submit"
                  type="submit"
                  disabled={patchMutation.isPending}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
                >
                  {patchMutation.isPending ? '保存中...' : '保存'}
                </button>
                <button
                  data-testid="story-publish-submit"
                  type="button"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
                >
                  {publishMutation.isPending ? '发布中...' : '发布'}
                </button>
                <button
                  data-testid="story-template-promote-submit"
                  type="button"
                  disabled={promoteMutation.isPending}
                  onClick={() => promoteMutation.mutate()}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
                >
                  {promoteMutation.isPending ? '处理中...' : '提升为模板'}
                </button>
              </div>
            </form>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>新增条目</strong>
            <form
              data-testid="story-item-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await addItemMutation.mutateAsync()
              }}
              style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(120px,180px) 1fr 1fr auto' }}
            >
              <select
                data-testid="story-item-type"
                value={itemType}
                onChange={event => setItemType(event.target.value as StoryItemType)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
              >
                {ITEM_TYPES.map(type => (
                  <option key={type} value={type}>
                    {resolveItemTypeLabel(type)}
                  </option>
                ))}
              </select>
              <input
                data-testid="story-item-ref-id"
                value={refId}
                onChange={event => setRefId(event.target.value)}
                placeholder="引用 ID"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <input
                data-testid="story-item-caption"
                value={caption}
                onChange={event => setCaption(event.target.value)}
                placeholder="说明"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <button
                data-testid="story-item-submit"
                type="submit"
                disabled={addItemMutation.isPending}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
              >
                {addItemMutation.isPending ? '关联中...' : '关联'}
              </button>
            </form>

            <div data-testid="story-item-list" style={{ display: 'grid', gap: 8 }}>
              {sortedItems.map(item => (
                <article key={item.id} className="card" style={{ padding: 10, borderRadius: 10, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong>{resolveItemTypeLabel(item.itemType)}</strong>
                    <span className="badge badge-ok">排序: {item.sortOrder}</span>
                  </div>
                  <span style={{ fontSize: 13 }}>{item.refId}</span>
                  {item.caption ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.caption}</span> : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item.itemType === 'insight' ? (
                      <Link href={`/dashboard/${encodeURIComponent(item.refId)}`} className="badge badge-warn">
                        打开洞察
                      </Link>
                    ) : null}
                    {item.itemType === 'trace' ? (
                      <Link href={`/ops/traces/${encodeURIComponent(item.refId)}`} className="badge badge-warn">
                        打开追踪
                      </Link>
                    ) : null}
                    <button
                      data-testid={`story-item-move-top-${item.id}`}
                      type="button"
                      onClick={() => moveTopMutation.mutate(item.id)}
                      style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '4px 10px' }}
                    >
                      置顶
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>模板克隆</strong>
            <form
              data-testid="story-clone-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await cloneMutation.mutateAsync()
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                data-testid="story-clone-title"
                value={cloneTitle}
                onChange={event => setCloneTitle(event.target.value)}
                placeholder="克隆标题（可选）"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 240 }}
              />
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input
                  data-testid="story-clone-include-items"
                  type="checkbox"
                  checked={cloneIncludeItems}
                  onChange={event => setCloneIncludeItems(event.target.checked)}
                />
                包含条目
              </label>
              <button
                data-testid="story-clone-submit"
                type="submit"
                disabled={cloneMutation.isPending}
                style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
              >
                {cloneMutation.isPending ? '克隆中...' : '克隆故事'}
              </button>
            </form>
          </section>

          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Versions</strong>
            <LoadablePanel
              loading={versionsQuery.isLoading}
              error={versionsQuery.error}
              empty={(versionsQuery.data?.items ?? []).length === 0}
              loadingLabel="Loading story versions..."
              emptyLabel="暂无版本"
            >
              <VirtualizedList
                items={versions}
                estimateSize={180}
                height={460}
                getKey={version => version.id}
                renderItem={version => (
                  <article key={version.id} className="card" style={{ borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>v{version.version}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{version.createdAt ?? ''}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <VersionSummaryPanel
                        testIdPrefix={`story-version-${version.id}`}
                        snapshotSummary={(version.presentation?.snapshotSummary ?? undefined) as Record<string, unknown> | undefined}
                        changeSummary={(version.presentation?.changeSummary ?? undefined) as Record<string, unknown> | undefined}
                        extra={(version.presentation?.itemStats ?? undefined) as Record<string, unknown> | undefined}
                      />
                    </div>
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 12, cursor: 'pointer' }}>Advanced JSON</summary>
                      <pre style={{ margin: '6px 0 0', maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
                        {JSON.stringify(version.snapshot, null, 2)}
                      </pre>
                    </details>
                  </article>
                )}
              />
            </LoadablePanel>
            {versions.length >= 2 ? (
              <section
                data-testid="story-version-diff"
                className="card"
                style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 8, marginTop: 8 }}
              >
                <strong>版本对比</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    data-testid="story-version-left"
                    value={leftVersion?.id ?? ''}
                    onChange={event => setLeftVersionId(event.target.value)}
                    style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
                  >
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        v{version.version}
                      </option>
                    ))}
                  </select>
                  <select
                    data-testid="story-version-right"
                    value={rightVersion?.id ?? ''}
                    onChange={event => setRightVersionId(event.target.value)}
                    style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', background: '#fff' }}
                  >
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        v{version.version}
                      </option>
                    ))}
                  </select>
                </div>
                {versionDiff ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span className="badge badge-ok">
                      新增: {versionDiff.added.length} · 删除: {versionDiff.removed.length} · 重排:{' '}
                      {versionDiff.reordered.length}
                    </span>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {versionDiff.added.slice(0, 5).map(item => (
                        <span key={`add-${item.key}`} style={{ fontSize: 12, color: '#0b7285' }}>
                          + {resolveItemTypeLabel(item.itemType)}:{item.refId}
                        </span>
                      ))}
                      {versionDiff.removed.slice(0, 5).map(item => (
                        <span key={`remove-${item.key}`} style={{ fontSize: 12, color: '#b3342f' }}>
                          - {resolveItemTypeLabel(item.itemType)}:{item.refId}
                        </span>
                      ))}
                      {versionDiff.reordered.slice(0, 5).map(item => (
                        <span key={`move-${item.key}`} style={{ fontSize: 12, color: 'var(--muted)' }}>
                          ~ {resolveItemTypeLabel(item.itemType)}:{item.refId}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </section>
        </section>
      </LoadablePanel>
    </AccessGuard>
  )
}

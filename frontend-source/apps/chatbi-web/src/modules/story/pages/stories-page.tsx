'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import {
  cloneStory,
  createStory,
  listStories,
  listStoryTemplates,
  promoteStoryTemplate,
  type StoryStatus
} from '@/modules/story/api'
import { compareRecencyDescThenId } from '@/modules/story/sorting'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function StoriesPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StoryStatus>('all')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['story-models'],
    queryFn: listSemanticModels
  })
  const modelOptions = modelsQuery.data ?? []
  const activeModelId = modelId ?? modelOptions[0]?.id

  const storiesQuery = useQuery({
    queryKey: ['stories', activeModelId, statusFilter],
    enabled: Boolean(activeModelId),
    queryFn: () =>
      listStories(activeModelId as string, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
        offset: 0
      })
  })

  const templatesQuery = useQuery({
    queryKey: ['story-templates', activeModelId, statusFilter],
    enabled: Boolean(activeModelId),
    queryFn: () =>
      listStoryTemplates(activeModelId as string, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
        offset: 0
      })
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId) throw new Error('Select a model first')
      if (!title.trim()) throw new Error('Title is required')
      return createStory({
        modelId: activeModelId,
        title: title.trim(),
        summary: summary.trim() || undefined
      })
    },
    onSuccess: async payload => {
      setStatusMessage(`Story created (${payload.story.status})`)
      setTitle('')
      setSummary('')
      await storiesQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Create story failed')
    }
  })

  const cloneMutation = useMutation({
    mutationFn: async (storyId: string) => cloneStory(storyId, { includeItems: true }),
    onSuccess: async payload => {
      setStatusMessage(`Template reused (${payload.story.id})`)
      await Promise.all([storiesQuery.refetch(), templatesQuery.refetch()])
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Clone failed')
    }
  })

  const promoteMutation = useMutation({
    mutationFn: async (storyId: string) =>
      promoteStoryTemplate(storyId, {
        reason: 'Promoted from stories workspace'
      }),
    onSuccess: async payload => {
      setStatusMessage(`Promoted as template (${payload.template.storyId})`)
      await Promise.all([storiesQuery.refetch(), templatesQuery.refetch()])
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Promote template failed')
    }
  })

  const sortedItems = useMemo(() => {
    return [...(storiesQuery.data?.items ?? [])].sort(compareRecencyDescThenId)
  }, [storiesQuery.data?.items])

  const templateItems = useMemo(() => {
    return [...(templatesQuery.data?.items ?? [])].sort((a, b) =>
      compareRecencyDescThenId(
        { id: a.storyId, createdAt: a.promotedAt, updatedAt: a.promotedAt },
        { id: b.storyId, createdAt: b.promotedAt, updatedAt: b.promotedAt }
      )
    )
  }, [templatesQuery.data?.items])
  const modelsLoading = modelsQuery.isLoading
  const storiesLoading = Boolean(activeModelId) && storiesQuery.isLoading
  const templatesLoading = Boolean(activeModelId) && templatesQuery.isLoading
  const modelSelectPlaceholder = modelsLoading ? 'Loading semantic models...' : 'No semantic models available'
  const storiesEmptyLabel = activeModelId
    ? 'No stories found for the selected filters.'
    : 'Select a semantic model to load stories.'
  const templatesEmptyLabel = activeModelId
    ? 'No story templates found for the selected filters.'
    : 'Select a semantic model to load story templates.'

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack" style={{ display: 'grid', gap: 16 }}>
        <header className="card nexus-domain-hero" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Stories</strong>
          <div className="nexus-domain-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: 6, minWidth: 240 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Semantic model</span>
              <select
                data-testid="stories-model-select"
                value={activeModelId ?? ''}
                onChange={event => setModelId(event.target.value)}
                disabled={modelsLoading || modelOptions.length === 0}
                className="nexus-domain-input"
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
            </label>
            <label style={{ display: 'grid', gap: 6, minWidth: 180 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Status filter</span>
              <select
                data-testid="stories-status-filter"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as 'all' | StoryStatus)}
                className="nexus-domain-input"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <form
            data-testid="stories-create-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            className="nexus-domain-filter-grid"
            style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(220px,1fr) minmax(280px,2fr) auto' }}
          >
            <input
              data-testid="stories-create-title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Story title"
              className="nexus-domain-input"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              data-testid="stories-create-summary"
              value={summary}
              onChange={event => setSummary(event.target.value)}
              placeholder="Summary"
              className="nexus-domain-input"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <button
              data-testid="stories-create-submit"
              type="submit"
              disabled={createMutation.isPending}
              className="nexus-domain-btn"
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 14px' }}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
          {statusMessage ? (
            <span data-testid="stories-status-message" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={modelsLoading || storiesLoading}
          error={modelsQuery.error ?? storiesQuery.error}
          empty={!modelsLoading && !storiesLoading && !modelsQuery.error && !storiesQuery.error && (!activeModelId || sortedItems.length === 0)}
          loadingLabel={modelsLoading ? 'Loading story models...' : 'Loading stories...'}
          emptyLabel={storiesEmptyLabel}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void storiesQuery.refetch()
            }
          }}
        >
          <section className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            {sortedItems.map(story => (
              <article key={story.id} className="card nexus-domain-card" style={{ padding: 10, borderRadius: 10 }} data-testid={`story-row-${story.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{story.title}</strong>
                  <span className={story.status === 'published' ? 'badge badge-ok' : 'badge badge-warn'}>
                    {story.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0 8px', color: 'var(--muted)', fontSize: 13 }}>{story.summary ?? 'No summary'}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(story.metadata as { template?: { isTemplate?: boolean } } | undefined)?.template?.isTemplate ? (
                    <span className="badge badge-ok">template</span>
                  ) : (
                    <button
                      data-testid={`story-template-promote-${story.id}`}
                      type="button"
                      onClick={() => promoteMutation.mutate(story.id)}
                      disabled={promoteMutation.isPending}
                      className="nexus-domain-btn"
                      style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 10px' }}
                    >
                      Promote as template
                    </button>
                  )}
                  <span className="badge badge-ok">items: {story.items?.length ?? 0}</span>
                  <span className="badge badge-ok">version: {story.latestVersion}</span>
                  <button
                    data-testid={`story-clone-inline-${story.id}`}
                    type="button"
                    onClick={() => cloneMutation.mutate(story.id)}
                    disabled={cloneMutation.isPending}
                    className="nexus-domain-btn"
                    style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 10px' }}
                  >
                    Reuse template
                  </button>
                  <Link
                    data-testid={`story-open-${story.id}`}
                    href={`/project/${encodeURIComponent(story.id)}`}
                    className="badge badge-warn"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </LoadablePanel>

        <LoadablePanel
          loading={modelsLoading || templatesLoading}
          error={modelsQuery.error ?? templatesQuery.error}
          empty={
            !modelsLoading &&
            !templatesLoading &&
            !modelsQuery.error &&
            !templatesQuery.error &&
            (!activeModelId || templateItems.length === 0)
          }
          loadingLabel={modelsLoading ? 'Loading story models...' : 'Loading story templates...'}
          emptyLabel={templatesEmptyLabel}
          retry={() => {
            if (modelsQuery.error) {
              void modelsQuery.refetch()
              return
            }
            if (activeModelId) {
              void templatesQuery.refetch()
            }
          }}
        >
          <section className="card nexus-domain-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Template Library</strong>
            {templateItems.map(template => (
              <article
                key={template.storyId}
                className="card nexus-domain-card"
                style={{ padding: 10, borderRadius: 10, display: 'grid', gap: 6 }}
                data-testid={`story-template-row-${template.storyId}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{template.title}</strong>
                  <span className={template.status === 'published' ? 'badge badge-ok' : 'badge badge-warn'}>
                    {template.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-ok">template</span>
                  <span className="badge badge-warn">promoted: {template.promotedAt}</span>
                  <button
                    data-testid={`story-template-clone-${template.storyId}`}
                    type="button"
                    onClick={() => cloneMutation.mutate(template.storyId)}
                    disabled={cloneMutation.isPending}
                    className="nexus-domain-btn"
                    style={{ border: '1px solid var(--line)', borderRadius: 999, background: '#fff', padding: '2px 10px' }}
                  >
                    Reuse template
                  </button>
                  <Link
                    href={`/project/${encodeURIComponent(template.storyId)}`}
                    className="badge badge-warn"
                    data-testid={`story-template-open-${template.storyId}`}
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

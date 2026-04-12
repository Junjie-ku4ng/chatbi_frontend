// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StoriesPage from '../pages/stories-page'
import StoryDetailPage from '../pages/story-detail-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock, useParamsMock, useSearchParamsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSearchParamsMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
  useSearchParams: useSearchParamsMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/states/loadable-state', async () => {
  const ReactModule = await import('react')
  return {
    LoadablePanel: ({
      children,
      loading,
      error,
      empty,
      loadingLabel,
      emptyLabel
    }: MockElementProps & {
      loading?: boolean
      error?: unknown
      empty?: boolean
      loadingLabel?: string
      emptyLabel?: string
    }) => {
      if (loading) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-loading-state' }, loadingLabel ?? 'Loading...')
      }
      if (error) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-error-state' }, String(error))
      }
      if (empty) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-empty-state' }, emptyLabel ?? 'Nothing here')
      }
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    }
  }
})

vi.mock('@/modules/shared/lists/virtualized-list', async () => {
  const ReactModule = await import('react')
  return {
    VirtualizedList: ({
      items,
      renderItem
    }: {
      items: Array<unknown>
      renderItem: (item: any) => React.ReactNode
    }) => ReactModule.createElement(ReactModule.Fragment, null, items.map(item => renderItem(item)))
  }
})

vi.mock('@/modules/shared/panels/version-summary', async () => {
  const ReactModule = await import('react')
  return {
    VersionSummaryPanel: ({ testIdPrefix }: { testIdPrefix?: string }) =>
      ReactModule.createElement('div', { 'data-testid': `${testIdPrefix}-summary` })
  }
})

vi.mock('@/modules/story/api', () => ({
  addStoryItem: vi.fn(),
  cloneStory: vi.fn(),
  createStory: vi.fn(),
  getStory: vi.fn(),
  listStories: vi.fn(),
  listStoryTemplates: vi.fn(),
  listStoryVersions: vi.fn(),
  promoteStoryTemplate: vi.fn(),
  publishStory: vi.fn(),
  updateStory: vi.fn(),
  updateStoryItem: vi.fn()
}))

function createQueryResult<T>(data: T, overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function renderPage(element: React.ReactElement) {
  const html = renderToStaticMarkup(element)
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('story pages shared states', () => {
  it('uses specific loading copy while story models are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'story-models') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'stories') return createQueryResult({ items: [] })
      if (queryKey[0] === 'story-templates') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(StoriesPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading story models...')
  })

  it('uses an explicit empty state when no semantic model is available for stories', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'story-models') return createQueryResult([])
      if (queryKey[0] === 'stories') return createQueryResult({ items: [] })
      if (queryKey[0] === 'story-templates') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(StoriesPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Select a semantic model to load stories.')
  })

  it('uses specific loading copy while stories are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'story-models') return createQueryResult([{ id: 'model-1', name: 'Sales', cube: 'Sales' }])
      if (queryKey[0] === 'stories') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'story-templates') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(StoriesPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading stories...')
  })

  it('uses specific loading copy while story detail is loading', () => {
    useParamsMock.mockReturnValue({ id: 'story-77' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'story-detail') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'story-versions') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(StoryDetailPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading story detail...')
  })

  it('uses an explicit empty state when the story detail is missing', () => {
    useParamsMock.mockReturnValue({ id: 'story-77' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'story-detail') return createQueryResult(null)
      if (queryKey[0] === 'story-versions') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(StoryDetailPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Story not found.')
  })
})

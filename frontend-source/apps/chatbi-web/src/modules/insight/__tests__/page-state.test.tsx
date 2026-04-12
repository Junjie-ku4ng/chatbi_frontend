// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import InsightDetailPage from '../pages/insight-detail-page'
import InsightsPage from '../pages/insights-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useInfiniteQueryMock, useMutationMock, useParamsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useInfiniteQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useParamsMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useInfiniteQuery: useInfiniteQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/navigation', () => ({
  useParams: useParamsMock
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

vi.mock('@/modules/insight/api', () => ({
  addFavorite: vi.fn(),
  addInsightComment: vi.fn(),
  createInsightSubscription: vi.fn(),
  getInsight: vi.fn(),
  listFavorites: vi.fn(),
  listInsightComments: vi.fn(),
  listInsights: vi.fn(),
  listInsightSubscriptions: vi.fn(),
  listInsightVersions: vi.fn(),
  setInsightSubscriptionStatus: vi.fn(),
  submitInsightFeedback: vi.fn()
}))

vi.mock('@/modules/story/api', () => ({
  addStoryItem: vi.fn(),
  createStory: vi.fn(),
  listStories: vi.fn()
}))

vi.mock('@/modules/trace/api', () => ({
  getInsightTrace: vi.fn()
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

function createInfiniteQueryResult<T>(pages: T[], overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data: {
      pages
    },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
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

describe('insight pages shared states', () => {
  it('uses specific loading copy while insight models are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'favorites') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([]))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage(React.createElement(InsightsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading insight models...')
  })

  it('uses an explicit empty state when no semantic model is available for insights', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([])
      if (queryKey[0] === 'favorites') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([]))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage(React.createElement(InsightsPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Select a semantic model to load insights.')
  })

  it('uses specific loading copy while insights are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([{ id: 'model-1', name: 'Sales' }])
      if (queryKey[0] === 'favorites') return createQueryResult({ items: [] })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([], { isLoading: true }))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage(React.createElement(InsightsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading insights...')
  })

  it('uses specific loading copy while insight detail is loading', () => {
    useParamsMock.mockReturnValue({ id: 'insight-7' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'insight') return createQueryResult(undefined, { isLoading: true })
      return createQueryResult([])
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(InsightDetailPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading insight detail...')
  })

  it('uses an explicit empty state when the insight detail is missing', () => {
    useParamsMock.mockReturnValue({ id: 'insight-7' })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'insight') return createQueryResult(null)
      return createQueryResult([])
    })
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() })

    const container = renderPage(React.createElement(InsightDetailPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Insight not found.')
  })
})

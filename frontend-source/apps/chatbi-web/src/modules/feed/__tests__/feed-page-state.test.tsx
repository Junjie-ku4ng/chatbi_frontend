// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FeedPage from '../../../../app/(workspace)/feed/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
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

vi.mock('@/modules/shared/panels/payload-highlights', async () => {
  const ReactModule = await import('react')
  return {
    PayloadHighlightsPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
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

function createQueryResult<T>(data: T, overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(FeedPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('feed page shared states', () => {
  it('uses specific loading copy while feed models are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'feed-models') {
        return createQueryResult(undefined, { isLoading: true })
      }
      if (queryKey[0] === 'chatbi-feed') {
        return createQueryResult(undefined)
      }
      if (queryKey[0] === 'chatbi-feed-unread') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading feed models...')
  })

  it('uses an explicit empty state when no semantic model is available for the feed', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'feed-models') {
        return createQueryResult([])
      }
      if (queryKey[0] === 'chatbi-feed') {
        return createQueryResult(undefined)
      }
      if (queryKey[0] === 'chatbi-feed-unread') {
        return createQueryResult(undefined)
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Select a semantic model to load feed events.')
  })

  it('uses specific loading copy while feed events are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'feed-models') {
        return createQueryResult([{ id: 'model-1', name: 'Sales', cube: 'Sales' }])
      }
      if (queryKey[0] === 'chatbi-feed') {
        return createQueryResult(undefined, { isLoading: true })
      }
      if (queryKey[0] === 'chatbi-feed-unread') {
        return createQueryResult({ unreadCount: 2 })
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading feed events...')
  })

  it('uses an explicit empty state when the selected model has no feed events', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'feed-models') {
        return createQueryResult([{ id: 'model-1', name: 'Sales', cube: 'Sales' }])
      }
      if (queryKey[0] === 'chatbi-feed') {
        return createQueryResult({ items: [], total: 0 })
      }
      if (queryKey[0] === 'chatbi-feed-unread') {
        return createQueryResult({ unreadCount: 0 })
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn()
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('No feed events found for the selected filters.')
  })
})

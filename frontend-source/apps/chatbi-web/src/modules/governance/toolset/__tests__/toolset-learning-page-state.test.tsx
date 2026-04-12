// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ToolsetLearningPage from '../../../../../app/(workspace)/toolset/learning/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useInfiniteQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useInfiniteQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useInfiniteQuery: useInfiniteQueryMock,
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

vi.mock('@/modules/governance/toolset/compat-notice', async () => {
  const ReactModule = await import('react')
  return {
    ToolsetCompatNotice: () => ReactModule.createElement('div', { 'data-testid': 'toolset-compat-notice' })
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

vi.mock('@/modules/governance/toolset/api', () => ({
  getToolsetLearningInsights: vi.fn(),
  getToolsetOpsSummary: vi.fn(),
  listToolsetExecutions: vi.fn(),
  replayToolsetLearning: vi.fn()
}))

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/panels/entity-detail-sections', async () => {
  const ReactModule = await import('react')
  return {
    EntityDetailSections: () => ReactModule.createElement('div')
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/chips/status-chip', async () => {
  const ReactModule = await import('react')
  return {
    StatusChip: ({ value }: { value: string }) => ReactModule.createElement('span', null, value)
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

function createInfiniteQueryResult<T>(pages: T[], overrides?: Partial<{ isLoading: boolean; error: unknown }>) {
  return {
    data: { pages },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides
  }
}

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(ToolsetLearningPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('toolset learning shared states', () => {
  it('uses specific loading copy while toolset learning models are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult(undefined, { isLoading: true })
      if (queryKey[0] === 'toolset-learning-insights') return createQueryResult(undefined)
      if (queryKey[0] === 'toolset-ops-summary') return createQueryResult(undefined)
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([]))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading toolset learning models...'
    )
  })

  it('uses an explicit empty state when no semantic model is available for toolset learning', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([])
      if (queryKey[0] === 'toolset-learning-insights') return createQueryResult(undefined)
      if (queryKey[0] === 'toolset-ops-summary') return createQueryResult(undefined)
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([]))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'Select a semantic model to load learning insights.'
    )
  })

  it('uses specific loading copy while toolset ops summary is loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([{ id: 'model-1', name: 'Sales' }])
      if (queryKey[0] === 'toolset-learning-insights') return createQueryResult({ insights: [] })
      if (queryKey[0] === 'toolset-ops-summary') return createQueryResult(undefined, { isLoading: true })
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([{ items: [] }]))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelectorAll('[data-testid="loadable-loading-state"]')[0]?.textContent).toContain(
      'Loading toolset ops summary...'
    )
  })

  it('uses specific loading copy while toolset executions are loading', () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'semantic-models') return createQueryResult([{ id: 'model-1', name: 'Sales' }])
      if (queryKey[0] === 'toolset-learning-insights') return createQueryResult({ insights: [] })
      if (queryKey[0] === 'toolset-ops-summary') {
        return createQueryResult({
          summary: {
            statusBreakdown: { success: 0, failed: 0 },
            successRate: 0,
            p95LatencyMs: 0,
            p95DurationMs: 0,
            totalOutcomes: 0,
            successCount: 0,
            failureCount: 0,
            avgDurationMs: 0,
            runningSessions: 0
          }
        })
      }
      throw new Error(`unexpected query key: ${String(queryKey[0])}`)
    })
    useInfiniteQueryMock.mockReturnValue(createInfiniteQueryResult([], { isLoading: true }))
    useMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() })

    const container = renderPage()

    expect(container.querySelectorAll('[data-testid="loadable-loading-state"]')[0]?.textContent).toContain(
      'Loading toolset executions...'
    )
  })
})

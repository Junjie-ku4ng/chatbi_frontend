// @vitest-environment jsdom

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/lib/api-client'
import OpsReportsPage from '../../../../app/(workspace)/ops/reports/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useInfiniteQueryMock, useMutationMock, actionPermissionMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useInfiniteQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  actionPermissionMock: vi.fn(() => ({ state: 'enabled', reason: undefined }))
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
    AccessGuard: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/rbac/action-guard', async () => {
  const ReactModule = await import('react')
  return {
    ActionGuard: ({
      children
    }: {
      children?: React.ReactNode | ((permission: { state: string; reason?: string }) => React.ReactNode)
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        typeof children === 'function' ? children(actionPermissionMock()) : children
      )
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) =>
      ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
      open ? ReactModule.createElement('div', { 'data-testid': 'detail-drawer' }, children) : null
  }
})

vi.mock('@/modules/shared/panels/entity-detail-sections', async () => {
  const ReactModule = await import('react')
  return {
    EntityDetailSections: () => ReactModule.createElement('div', { 'data-testid': 'entity-detail-sections' })
  }
})

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) =>
      ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) =>
      ReactModule.createElement('div', { 'data-testid': testId })
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
      renderItem: (item: unknown) => React.ReactNode
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        items.map((item, index) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: String((item as Record<string, unknown>)?.id ?? index) },
            renderItem(item)
          )
        )
      )
  }
})

function createQueryResult<T>(data: T, overrides?: Partial<{ isLoading: boolean; error: unknown; refetch: () => void }>) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function createInfiniteQueryResult<T>(
  pages: T[],
  overrides?: Partial<{ isLoading: boolean; error: unknown; refetch: () => void }>
) {
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

function mockQueries(options?: {
  dispatchLogsError?: unknown
  dispatchLogPages?: Array<{ items?: Array<Record<string, unknown>> }>
  events?: Array<Record<string, unknown>>
}) {
  const events = options?.events ?? [{ id: 'evt-1', metricCode: 'metric-code' }]
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'ops-report-table') {
      return createQueryResult({
        items: [{ groupKey: 'tenant-a', deliveries: 1, success: 1, failed: 0, dlq: 0 }],
        summary: { subscriptionCount: 1, deliveries: 1, failed: 0, dlq: 0, audits: 0 }
      })
    }
    if (key === 'ops-report-legacy') {
      return createQueryResult({ items: [] })
    }
    if (key === 'ask-review-lane-summary') {
      return createQueryResult({ totalCases: 0, pendingDecisionCases: 0, slaBreachedCases: 0 })
    }
    if (key === 'ask-certification-latest') {
      return createQueryResult({
        status: 'active',
        blockers: [],
        metrics: { reviewState: 'clear', certificationBlockerClass: 'automatic_pass' }
      })
    }
    if (key === 'ops-report-events') {
      return createQueryResult({ items: events })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useInfiniteQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'ops-dispatch-logs') {
      return createInfiniteQueryResult(options?.dispatchLogPages ?? [{ items: [] }], {
        error: options?.dispatchLogsError
      })
    }
    throw new Error(`unexpected infinite query key: ${String(key)}`)
  })
}

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(OpsReportsPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

beforeEach(() => {
  vi.clearAllMocks()
  actionPermissionMock.mockReturnValue({ state: 'enabled', reason: undefined })
  useMutationMock.mockReturnValue({
    isPending: false,
    mutate: vi.fn()
  })
})

describe('ops reports shared states', () => {
  it('renders an explicit empty state when no alert event is available for dispatch logs', () => {
    mockQueries({ events: [] })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'Select an alert event to load dispatch logs.'
    )
  })

  it('renders a retryable error state for dispatch logs', () => {
    mockQueries({
      dispatchLogsError: new Error('Dispatch logs failed')
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain(
      'Dispatch logs failed'
    )
    expect(container.querySelector('[data-testid="loadable-retry-action"]')).not.toBeNull()
  })

  it('renders a permission-denied state when dispatch logs return 403', () => {
    mockQueries({
      dispatchLogsError: new ApiRequestError({
        message: 'Dispatch logs are forbidden',
        status: 403
      })
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="loadable-forbidden-state"]')?.textContent).toContain(
      'Dispatch logs are forbidden'
    )
  })

  it('disables CSV export with the RBAC denial reason', () => {
    actionPermissionMock.mockReturnValue({
      state: 'disabled',
      reason: 'Export requires write access'
    })
    mockQueries()

    const container = renderPage()
    const exportButton = container.querySelector('[data-testid="ops-reports-export-csv"]')

    expect(exportButton?.getAttribute('disabled')).not.toBeNull()
    expect(exportButton?.getAttribute('title')).toBe('Export requires write access')
  })
})

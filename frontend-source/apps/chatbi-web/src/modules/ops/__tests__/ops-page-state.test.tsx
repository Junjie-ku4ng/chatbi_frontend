// @vitest-environment jsdom

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OpsAlertsPage from '../../../../app/(workspace)/ops/alerts/page'
import OpsPage from '../../../../app/(workspace)/ops/page'

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

vi.mock('next/dynamic', async () => {
  const ReactModule = await import('react')
  return {
    default: () =>
      function DynamicStub() {
        return ReactModule.createElement('div', { 'data-testid': 'ops-dynamic-chart' })
      }
  }
})

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

function renderPage(element: React.ReactElement) {
  const html = renderToStaticMarkup(element)
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

function mockOpsDashboardQueries(options?: { reportItems?: Array<Record<string, unknown>>; reportError?: unknown }) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'semantic-models') {
      return createQueryResult([{ id: 'model-1', name: 'Model 1' }])
    }
    if (key === 'embedding-trends') {
      return createQueryResult({ items: [] })
    }
    if (key === 'tenant-sla-trends') {
      return createQueryResult({ items: [] })
    }
    if (key === 'consumption-report') {
      if (options?.reportError) {
        return createQueryResult(undefined, { error: options.reportError })
      }
      return createQueryResult({
        items: options?.reportItems ?? [{ tenant: 'tenant-a', delivered: 4, failed: 0, dlq: 0 }]
      })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
  useInfiniteQueryMock.mockReset()
}

function mockOpsAlertsQueries(options?: {
  events?: Array<Record<string, unknown>>
  relatedTraces?: Array<Record<string, unknown>>
  relatedTraceError?: unknown
  dlqItems?: Array<Record<string, unknown>>
}) {
  const events = options?.events ?? [{ id: 'evt-1', ruleName: 'Embedding Drift Alert', status: 'open' }]
  const dlqItems = options?.dlqItems ?? [{ id: 'dlq-1', status: 'open', webhookId: 'wh-1', attemptCount: 1 }]

  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'semantic-models') {
      return createQueryResult([{ id: 'model-1', name: 'Model 1' }])
    }
    if (key === 'ops-alert-rules') {
      return createQueryResult({ items: [{ id: 'rule-1', name: 'Embedding Drift Alert', metricCode: 'embedding_composite_drift', compareOp: 'gt', threshold: 0.2 }] })
    }
    if (key === 'ops-alert-related-traces') {
      if (options?.relatedTraceError) {
        return createQueryResult(undefined, { error: options.relatedTraceError })
      }
      return createQueryResult({ items: options?.relatedTraces ?? [] })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useInfiniteQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'ops-alert-events') {
      return createInfiniteQueryResult([{ items: events, total: events.length }])
    }
    if (key === 'ops-dlq') {
      return createInfiniteQueryResult([{ items: dlqItems, total: dlqItems.length }])
    }
    throw new Error(`unexpected infinite query key: ${String(key)}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  actionPermissionMock.mockReturnValue({ state: 'enabled', reason: undefined })
  useMutationMock.mockReturnValue({
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined)
  })
})

describe('ops dashboard shared states', () => {
  it('renders a retryable error state for the consumption report panel', () => {
    mockOpsDashboardQueries({
      reportError: new Error('Consumption report failed')
    })

    const container = renderPage(React.createElement(OpsPage))

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain(
      'Consumption report failed'
    )
    expect(container.querySelector('[data-testid="loadable-retry-action"]')).not.toBeNull()
  })

  it('renders an explicit empty state when the consumption report has no rows', () => {
    mockOpsDashboardQueries({ reportItems: [] })

    const container = renderPage(React.createElement(OpsPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No consumption report rows found for the selected window.'
    )
  })
})

describe('ops alerts shared states', () => {
  it('prompts the operator to select an alert event before loading related traces', () => {
    mockOpsAlertsQueries({ events: [] })

    const container = renderPage(React.createElement(OpsAlertsPage))

    expect(container.textContent).toContain('Select an alert event to load related traces.')
  })

  it('renders a retryable error state for related traces', () => {
    mockOpsAlertsQueries({
      relatedTraceError: new Error('Related traces lookup failed')
    })

    const container = renderPage(React.createElement(OpsAlertsPage))

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain(
      'Related traces lookup failed'
    )
    expect(container.querySelector('[data-testid="loadable-retry-action"]')).not.toBeNull()
  })
})

// @vitest-environment jsdom

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OpsTracesPage from '../../../../app/(workspace)/ops/traces/page'
import TraceDetailPage from '../../../../app/(workspace)/ops/traces/[traceKey]/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useInfiniteQueryMock, actionPermissionMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useInfiniteQueryMock: vi.fn(),
  actionPermissionMock: vi.fn(() => ({ state: 'enabled', reason: undefined }))
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useInfiniteQuery: useInfiniteQueryMock,
  useMutation: vi.fn(() => ({
    isPending: false,
    mutate: vi.fn()
  }))
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('next/navigation', () => ({
  useParams: () => ({ traceKey: 'trace-1' })
}))

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
      renderItem: (item: any) => React.ReactNode
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

function mockTracesListQueries(options?: {
  models?: Array<Record<string, unknown>>
  traces?: Array<Record<string, unknown>>
  tracesError?: unknown
}) {
  const models = options?.models ?? [{ id: 'model-1', name: 'Model 1' }]
  const traces =
    options?.traces ??
    (models.length === 0
      ? undefined
      : [{ id: 'trace-1', traceKey: 'trace-1', rootType: 'query', status: 'completed', modelId: 'model-1' }])

  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'semantic-models') {
      return createQueryResult(models)
    }
    if (key === 'trace-runs') {
      if (options?.tracesError) {
        return createQueryResult(undefined, { error: options.tracesError })
      }
      if (!traces) {
        return createQueryResult(undefined)
      }
      return createQueryResult({ items: traces, total: traces.length })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
  useInfiniteQueryMock.mockReset()
}

function mockTraceDetailQueries(options?: {
  timelineItems?: Array<Record<string, unknown>>
  actionItems?: Array<Record<string, unknown>>
  actionError?: unknown
}) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'trace-detail') {
      return createQueryResult({
        run: {
          traceKey: 'trace-1',
          rootType: 'query',
          status: 'completed',
          modelId: 'model-1',
          conversationId: 'conv-1',
          queryLogId: 'ql-1',
          startedAt: '2026-04-07T08:00:00.000Z'
        },
        links: []
      })
    }
    if (key === 'trace-timeline') {
      return createQueryResult({ items: options?.timelineItems ?? [] })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useInfiniteQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'trace-action-runs') {
      return createInfiniteQueryResult([{ items: options?.actionItems ?? [{ id: 'action-1', actionType: 'ack_alert', status: 'applied' }] }], {
        error: options?.actionError
      })
    }
    throw new Error(`unexpected infinite query key: ${String(key)}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  actionPermissionMock.mockReturnValue({ state: 'enabled', reason: undefined })
})

describe('ops traces list shared states', () => {
  it('prompts the operator to pick a semantic model before loading traces', () => {
    mockTracesListQueries({
      models: []
    })

    const container = renderPage(React.createElement(OpsTracesPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'Select a semantic model to load traces.'
    )
  })

  it('renders a retryable error state for the trace list', () => {
    mockTracesListQueries({
      tracesError: new Error('Trace list failed')
    })

    const container = renderPage(React.createElement(OpsTracesPage))

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Trace list failed')
    expect(container.querySelector('[data-testid="loadable-retry-action"]')).not.toBeNull()
  })
})

describe('ops trace detail shared states', () => {
  it('renders an explicit empty state when the timeline has no items', () => {
    mockTraceDetailQueries({
      timelineItems: [],
      actionItems: [{ id: 'action-1', actionType: 'ack_alert', status: 'applied' }]
    })

    const container = renderPage(React.createElement(TraceDetailPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('No timeline items')
  })

  it('renders a retryable error state for action history', () => {
    mockTraceDetailQueries({
      timelineItems: [{ kind: 'run', at: '2026-04-07T08:00:00.000Z', data: { status: 'completed' } }],
      actionError: new Error('Action history failed')
    })

    const container = renderPage(React.createElement(TraceDetailPage))

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain(
      'Action history failed'
    )
    expect(container.querySelector('[data-testid="loadable-retry-action"]')).not.toBeNull()
  })

  it('disables trace actions when write permission is denied', () => {
    actionPermissionMock.mockReturnValue({
      state: 'disabled',
      reason: 'Write access required'
    })
    mockTraceDetailQueries({
      timelineItems: [{ kind: 'run', at: '2026-04-07T08:00:00.000Z', data: { status: 'completed' } }]
    })

    const container = renderPage(React.createElement(TraceDetailPage))
    const ackButton = container.querySelector('[data-testid="trace-action-ack-submit"]')
    const replayButton = container.querySelector('[data-testid="trace-action-replay-submit"]')

    expect(ackButton?.getAttribute('disabled')).not.toBeNull()
    expect(ackButton?.getAttribute('title')).toBe('Write access required')
    expect(replayButton?.getAttribute('disabled')).not.toBeNull()
    expect(replayButton?.getAttribute('title')).toBe('Write access required')
  })
})

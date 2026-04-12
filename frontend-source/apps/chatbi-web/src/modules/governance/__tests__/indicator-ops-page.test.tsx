// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import IndicatorOpsPage from '../pages/indicator-ops-page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/lib/api-client', () => ({
  listSemanticModels: vi.fn()
}))

vi.mock('@/modules/governance/indicator/api', () => ({
  cancelIndicatorImportJob: vi.fn(),
  createIndicatorImportJob: vi.fn(),
  executeIndicatorImportJob: vi.fn(),
  getIndicatorGovernanceWorkbench: vi.fn(),
  listIndicatorApprovalHistory: vi.fn(),
  listIndicatorApprovalQueue: vi.fn(),
  listIndicatorImportJobItems: vi.fn(),
  listIndicatorImportJobs: vi.fn(),
  listIndicatorRegistryTemplates: vi.fn(),
  retryFailedIndicatorImportJob: vi.fn(),
  voteIndicatorApprovalsBatch: vi.fn()
}))

vi.mock('@/modules/shared/states/loadable-state', async () => {
  const ReactModule = await import('react')
  return {
    LoadablePanel: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children, testId }: MockElementProps & { testId?: string }) =>
      ReactModule.createElement('section', { 'data-testid': testId }, children)
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId })
  }
})

vi.mock('@/modules/shared/lists/virtualized-list', async () => {
  const ReactModule = await import('react')
  return {
    VirtualizedList: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
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

function mockOpsQueries(options?: {
  modelsLoading?: boolean
  workbenchLoading?: boolean
  importJobsLoading?: boolean
  approvalsLoading?: boolean
  approvalHistoryLoading?: boolean
  templatesLoading?: boolean
}) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'indicator-ops-models') {
      return createQueryResult([{ id: 'model-1', name: 'Model 1', cube: 'Sales' }], { isLoading: options?.modelsLoading })
    }
    if (key === 'indicator-ops-workbench') {
      return createQueryResult({ summary: { importThroughput: {}, approvalBacklog: {} } }, { isLoading: options?.workbenchLoading })
    }
    if (key === 'indicator-ops-import-jobs') {
      return createQueryResult({ items: [], nextCursor: null }, { isLoading: options?.importJobsLoading })
    }
    if (key === 'indicator-ops-approvals') {
      return createQueryResult({ items: [] }, { isLoading: options?.approvalsLoading })
    }
    if (key === 'indicator-ops-approval-history') {
      return createQueryResult({ items: [], nextCursor: null }, { isLoading: options?.approvalHistoryLoading })
    }
    if (key === 'indicator-ops-templates') {
      return createQueryResult([], { isLoading: options?.templatesLoading })
    }
    if (key === 'indicator-ops-job-items') {
      return createQueryResult({ items: [], nextCursor: null })
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useMutationMock.mockReturnValue({
    isPending: false,
    mutate: vi.fn()
  })
}

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(IndicatorOpsPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('indicator ops ready contract', () => {
  it('does not show ready while core queries are still loading', () => {
    mockOpsQueries({
      workbenchLoading: true
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="indicator-ops-ready"]')).toBeNull()
  })

  it('does not show a generic ready badge after all core queries have settled', () => {
    mockOpsQueries()

    const container = renderPage()

    expect(container.querySelector('[data-testid="indicator-ops-ready"]')).toBeNull()
    expect(container.querySelector('[data-testid="indicator-ops-summary-strip"]')).not.toBeNull()
  })
})

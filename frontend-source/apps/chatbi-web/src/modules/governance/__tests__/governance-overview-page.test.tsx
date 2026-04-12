// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GovernanceOverviewPage from '../../../../app/(workspace)/governance/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

const originalGovernanceHub = process.env.NEXT_PUBLIC_GOVERNANCE_HUB
const originalGovernanceHubAllowlist = process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ALLOWLIST

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

vi.mock('@/modules/shared/rbac/action-guard', async () => {
  const ReactModule = await import('react')
  return {
    ActionGuard: ({ children }: { children?: React.ReactNode | ((permission: { state: string; reason?: string }) => React.ReactNode) }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        typeof children === 'function' ? children({ state: 'enabled' }) : children
      )
  }
})

vi.mock('@/lib/api-client', () => ({
  listSemanticModels: vi.fn()
}))

vi.mock('@/modules/governance/overview/api', () => ({
  getGovernanceOverview: vi.fn(),
  listGovernanceRecentActivity: vi.fn(),
  listGovernanceRiskHotspots: vi.fn(),
  listGovernanceWorklist: vi.fn()
}))

vi.mock('@/modules/ops/api', () => ({
  ackAlertEvent: vi.fn()
}))

vi.mock('@/modules/governance/indicator/api', () => ({
  retryFailedIndicatorImportJob: vi.fn()
}))

vi.mock('@/modules/shared/states/loadable-state', async () => {
  const ReactModule = await import('react')
  return {
    LoadablePanel: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
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

function mockGovernanceQueries(options?: {
  overviewLoading?: boolean
  hotspotsLoading?: boolean
  activityLoading?: boolean
  worklistLoading?: boolean
  worklistError?: unknown
}) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'governance-overview-models') {
      return createQueryResult([{ id: 'model-1', name: 'Model 1', cube: 'Sales' }])
    }
    if (key === 'governance-overview') {
      return createQueryResult(
        {
          domains: {
            semantic: { queueItems: 0, blockers: 0, roleGaps: 0 },
            indicator: { contracts: 0, breakingIndicators: 0, incompatibleConsumers: 0 },
            ai: { bindings: 0, unhealthyBindings: 0, rotationFailureRate: 0 },
            toolset: { totalOutcomes: 0, failureCount: 0 },
            ops: { openAlerts: 0 }
          },
          worklistSummary: {
            totalOpen: 0,
            criticalOpen: 0,
            actionableCount: 0
          }
        },
        { isLoading: options?.overviewLoading }
      )
    }
    if (key === 'governance-hotspots') {
      return createQueryResult([], { isLoading: options?.hotspotsLoading })
    }
    if (key === 'governance-activity') {
      return createQueryResult([], { isLoading: options?.activityLoading })
    }
    if (key === 'governance-worklist') {
      return createQueryResult(
        {
          items: [],
          nextCursor: null
        },
        {
          isLoading: options?.worklistLoading,
          error: options?.worklistError ?? null
        }
      )
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })

  useMutationMock.mockReturnValue({
    isPending: false,
    mutate: vi.fn()
  })
}

function renderPage() {
  const html = renderToStaticMarkup(React.createElement(GovernanceOverviewPage))
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

afterEach(() => {
  process.env.NEXT_PUBLIC_GOVERNANCE_HUB = originalGovernanceHub
  process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ALLOWLIST = originalGovernanceHubAllowlist
  vi.clearAllMocks()
})

describe('governance overview ready contract', () => {
  it('does not show ready while overview queries are still loading', () => {
    process.env.NEXT_PUBLIC_GOVERNANCE_HUB = 'true'
    process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ALLOWLIST = ''

    mockGovernanceQueries({
      overviewLoading: true
    })

    const container = renderPage()

    expect(container.querySelector('[data-testid="governance-worklist-ready"]')).toBeNull()
  })

  it('shows ready only after overview and worklist queries have settled', () => {
    process.env.NEXT_PUBLIC_GOVERNANCE_HUB = 'true'
    process.env.NEXT_PUBLIC_GOVERNANCE_HUB_ALLOWLIST = ''

    mockGovernanceQueries()

    const container = renderPage()

    expect(container.querySelector('[data-testid="governance-worklist-ready"]')?.textContent).toContain('ready')
  })
})

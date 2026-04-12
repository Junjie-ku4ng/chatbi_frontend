// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiGovernancePage from '../../../../../app/(workspace)/ai/governance/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { accessAllowedMock, useMutationMock, useQueryMock } = vi.hoisted(() => ({
  accessAllowedMock: vi.fn(() => true),
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: useMutationMock,
  useQuery: useQueryMock
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: MockElementProps & { href?: string }) =>
    React.createElement('a', { href, ...props }, children)
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children, scopes }: { children?: React.ReactNode; scopes?: string[] }) =>
      accessAllowedMock()
        ? ReactModule.createElement(ReactModule.Fragment, null, children)
        : ReactModule.createElement(
            'div',
            { 'data-testid': 'loadable-forbidden-state' },
            `Missing scope: ${scopes?.join(',') ?? 'unknown'}`
          )
  }
})

vi.mock('@/modules/shared/data-grid/operational-table', async () => {
  const ReactModule = await import('react')
  return {
    OperationalTable: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId ?? 'operational-table' })
  }
})

vi.mock('@/modules/shared/panels/advanced-json', async () => {
  const ReactModule = await import('react')
  return {
    AdvancedJsonPanel: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId ?? 'advanced-json-panel' })
  }
})

vi.mock('@/modules/shared/panels/detail-drawer', async () => {
  const ReactModule = await import('react')
  return {
    DetailDrawer: ({ children }: MockElementProps) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId ?? 'metric-strip' })
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
      emptyLabel,
      retry
    }: MockElementProps & {
      loading?: boolean
      error?: unknown
      empty?: boolean
      loadingLabel?: string
      emptyLabel?: string
      retry?: () => void
    }) => {
      if (loading) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-loading-state' }, loadingLabel ?? 'Loading...')
      }
      if (error) {
        return ReactModule.createElement(
          'div',
          { 'data-testid': 'loadable-error-state' },
          String(error),
          retry
            ? ReactModule.createElement(
                'button',
                {
                  'data-testid': 'loadable-retry-action',
                  onClick: retry,
                  type: 'button'
                },
                'Retry'
              )
            : null
        )
      }
      if (empty) {
        return ReactModule.createElement('div', { 'data-testid': 'loadable-empty-state' }, emptyLabel ?? 'Nothing here')
      }
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    }
  }
})

vi.mock('@/modules/governance/ai/api', () => ({
  getAiCryptoPolicy: vi.fn(),
  getAiGovernanceOverview: vi.fn(),
  listAiCryptoProviders: vi.fn(),
  listAiCryptoValidations: vi.fn(),
  listAiPolicyTemplates: vi.fn(),
  listAiProviderRotationEvents: vi.fn(),
  listAiProviderRotationRuns: vi.fn(),
  listAiProviders: vi.fn(),
  listAiQuotaPolicies: vi.fn(),
  listAiQuotaUsage: vi.fn(),
  upsertAiCryptoPolicy: vi.fn(),
  upsertAiProviderRotationPolicy: vi.fn(),
  upsertAiQuotaPolicy: vi.fn(),
  validateAiCryptoProvider: vi.fn()
}))

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
  vi.clearAllMocks()
})

function createQueryResult<T>(
  data: T,
  overrides?: Partial<{ isLoading: boolean; error: unknown; refetch: ReturnType<typeof vi.fn> }>
) {
  return {
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides
  }
}

function mockGovernanceQueries(overrides?: Partial<Record<string, ReturnType<typeof createQueryResult>>>) {
  const defaults = {
    providers: createQueryResult({
      items: [{ id: 'provider-1', name: 'Primary Provider', code: 'primary-provider' }]
    }),
    runs: createQueryResult({
      items: [{ id: 'run-1', status: 'success', createdAt: '2026-04-07T00:00:00.000Z' }]
    }),
    events: createQueryResult({
      items: [{ id: 'event-1', eventType: 'rotation.completed', createdAt: '2026-04-07T00:00:00.000Z' }]
    }),
    quota: createQueryResult({
      items: [{ id: 'quota-1', task: 'nl2plan_llm', dailyLimit: 1000, status: 'active' }]
    }),
    usage: createQueryResult({
      items: [{ id: 'usage-1', task: 'nl2plan_llm', windowHour: 24, used: 24 }]
    }),
    policyTemplates: createQueryResult({
      items: [{ id: 'template-1', name: 'Default Policy', code: 'default-policy' }]
    }),
    overview: createQueryResult({
      providers: { total: 1, active: 1, disabled: 0 },
      models: { total: 1, active: 1, disabled: 0 },
      bindings: { total: 1, healthyCount: 1, unhealthyCount: 0 },
      rotation: { totalRuns: 1, failedRuns: 0, failureRate: 0 },
      quota: { requestCount: 24, successCount: 24, errorCount: 0, errorRate: 0 },
      alerts: { open: 0 }
    }),
    cryptoProviders: createQueryResult([
      { adapterId: 'aws-kms', provider: 'aws-kms', configured: true, liveReady: true, lastValidationAt: null, lastErrorCode: null }
    ]),
    cryptoValidations: createQueryResult({
      items: [{ id: 'validation-1', provider: 'aws-kms', mode: 'dry_run', success: true, createdAt: '2026-04-07T00:00:00.000Z' }]
    }),
    cryptoPolicy: createQueryResult({
      policyMode: 'compat',
      allowMock: true,
      requireProviderValidation: false,
      validationTtlHours: 24
    })
  }
  const queries = { ...defaults, ...overrides }

  useQueryMock
    .mockReturnValueOnce(queries.providers)
    .mockReturnValueOnce(queries.runs)
    .mockReturnValueOnce(queries.events)
    .mockReturnValueOnce(queries.quota)
    .mockReturnValueOnce(queries.usage)
    .mockReturnValueOnce(queries.policyTemplates)
    .mockReturnValueOnce(queries.overview)
    .mockReturnValueOnce(queries.cryptoProviders)
    .mockReturnValueOnce(queries.cryptoValidations)
    .mockReturnValueOnce(queries.cryptoPolicy)
}

async function renderPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(React.createElement(AiGovernancePage))
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('ai governance page shared states', () => {
  beforeEach(() => {
    accessAllowedMock.mockReturnValue(true)
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn()
    })
  })

  it('uses route-specific loading copy for overview, crypto, quota, and policy panels', async () => {
    mockGovernanceQueries({
      overview: createQueryResult(undefined, { isLoading: true }),
      cryptoProviders: createQueryResult(undefined, { isLoading: true }),
      quota: createQueryResult(undefined, { isLoading: true }),
      policyTemplates: createQueryResult(undefined, { isLoading: true })
    })

    const container = await renderPage()
    const loadingLabels = Array.from(container.querySelectorAll('[data-testid="loadable-loading-state"]')).map(node => node.textContent ?? '')

    expect(loadingLabels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Loading AI governance overview...'),
        expect.stringContaining('Loading crypto providers...'),
        expect.stringContaining('Loading quota policies...'),
        expect.stringContaining('Loading AI policy templates...')
      ])
    )
  })

  it('uses explicit empty copy for overview, crypto, quota, and policy panels', async () => {
    mockGovernanceQueries({
      overview: createQueryResult(undefined),
      cryptoProviders: createQueryResult([]),
      quota: createQueryResult({ items: [] }),
      policyTemplates: createQueryResult({ items: [] })
    })

    const container = await renderPage()
    const emptyLabels = Array.from(container.querySelectorAll('[data-testid="loadable-empty-state"]')).map(node => node.textContent ?? '')

    expect(emptyLabels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('No governance overview available.'),
        expect.stringContaining('No crypto providers configured.'),
        expect.stringContaining('No quota policies'),
        expect.stringContaining('No policy templates')
      ])
    )
  })

  it('renders retryable error states for overview, crypto, quota, and policy panels', async () => {
    const overviewRefetch = vi.fn()
    const cryptoRefetch = vi.fn()
    const quotaRefetch = vi.fn()
    const policyRefetch = vi.fn()

    mockGovernanceQueries({
      overview: createQueryResult(undefined, {
        error: new Error('Governance overview failed'),
        refetch: overviewRefetch
      }),
      cryptoValidations: createQueryResult(undefined, {
        error: new Error('Crypto validation history failed'),
        refetch: cryptoRefetch
      }),
      quota: createQueryResult(undefined, {
        error: new Error('Quota policies failed'),
        refetch: quotaRefetch
      }),
      policyTemplates: createQueryResult(undefined, {
        error: new Error('Policy templates failed'),
        refetch: policyRefetch
      })
    })

    const container = await renderPage()
    const errorLabels = Array.from(container.querySelectorAll('[data-testid="loadable-error-state"]')).map(node => node.textContent ?? '')
    const retryButtons = Array.from(container.querySelectorAll('[data-testid="loadable-retry-action"]')) as HTMLButtonElement[]

    expect(errorLabels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Governance overview failed'),
        expect.stringContaining('Crypto validation history failed'),
        expect.stringContaining('Quota policies failed'),
        expect.stringContaining('Policy templates failed')
      ])
    )
    expect(retryButtons).toHaveLength(4)

    await act(async () => {
      retryButtons.forEach(button => button.click())
      await Promise.resolve()
    })

    expect(overviewRefetch).toHaveBeenCalledTimes(1)
    expect(cryptoRefetch).toHaveBeenCalledTimes(1)
    expect(quotaRefetch).toHaveBeenCalledTimes(1)
    expect(policyRefetch).toHaveBeenCalledTimes(1)
  })

  it('surfaces a forbidden state when the governance route is write-gated', async () => {
    accessAllowedMock.mockReturnValue(false)
    mockGovernanceQueries()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="loadable-forbidden-state"]')?.textContent).toContain('allow:write:model:*')
  })
})

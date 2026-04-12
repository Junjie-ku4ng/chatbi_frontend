// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiProvidersPage from '../../../../../app/(workspace)/ai/providers/page'
import AiModelsPage from '../../../../../app/(workspace)/ai/models/page'
import AiBindingsPage from '../../../../../app/(workspace)/ai/bindings/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: MockElementProps & { href?: string }) =>
    React.createElement('a', { href, ...props }, children)
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
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

vi.mock('@/modules/shared/panels/entity-detail-sections', async () => {
  const ReactModule = await import('react')
  return {
    EntityDetailSections: ({ advancedTestId }: { advancedTestId?: string }) => ReactModule.createElement('div', { 'data-testid': advancedTestId ?? 'entity-detail-sections' })
  }
})

vi.mock('@/modules/shared/summary/metric-strip', async () => {
  const ReactModule = await import('react')
  return {
    MetricStrip: ({ testId }: { testId?: string }) => ReactModule.createElement('div', { 'data-testid': testId ?? 'metric-strip' })
  }
})

vi.mock('@/modules/shared/chips/status-chip', async () => {
  const ReactModule = await import('react')
  return {
    StatusChip: ({ value }: { value: string }) => ReactModule.createElement('span', null, value)
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

vi.mock('@/lib/api-client', () => ({
  listSemanticModels: vi.fn()
}))

vi.mock('@/modules/governance/ai/api', () => ({
  listAiProviders: vi.fn(),
  createAiProvider: vi.fn(),
  listAiProviderCredentials: vi.fn(),
  rotateAiProviderCredential: vi.fn(),
  listAiModels: vi.fn(),
  createAiModel: vi.fn(),
  getAiBindingResolutionMatrix: vi.fn(),
  listAiBindingAudits: vi.fn(),
  listAiBindings: vi.fn(),
  resolveAiBinding: vi.fn(),
  upsertAiBinding: vi.fn()
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

async function renderPage(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('ai pages shared state labels', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn()
    })
  })

  it('uses specific loading copy for AI providers inventory', async () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )

    const container = await renderPage(React.createElement(AiProvidersPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading AI providers...')
  })

  it('renders explicit empty copy and retries AI providers inventory loading', async () => {
    const refetch = vi.fn()
    useQueryMock.mockReturnValueOnce(
      createQueryResult(undefined, {
        error: new Error('Provider inventory failed'),
        refetch
      })
    )
    useQueryMock.mockReturnValue(createQueryResult(undefined))

    const errorContainer = await renderPage(React.createElement(AiProvidersPage))
    const retryButton = errorContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(errorContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Provider inventory failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    useQueryMock.mockReset()
    useQueryMock.mockReturnValue(createQueryResult({ items: [] }))

    const emptyContainer = await renderPage(React.createElement(AiProvidersPage))

    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No AI providers configured.'
    )
  })

  it('uses specific loading copy for AI models inventory', async () => {
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        isLoading: true
      })
    )

    const container = await renderPage(React.createElement(AiModelsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading AI models...')
  })

  it('renders explicit empty copy and retries AI models inventory loading', async () => {
    const refetch = vi.fn()
    useQueryMock.mockReturnValue(
      createQueryResult(undefined, {
        error: new Error('Model inventory failed'),
        refetch
      })
    )

    const errorContainer = await renderPage(React.createElement(AiModelsPage))
    const retryButton = errorContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(errorContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Model inventory failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    useQueryMock.mockReset()
    useQueryMock.mockReturnValue(createQueryResult({ items: [] }))

    const emptyContainer = await renderPage(React.createElement(AiModelsPage))

    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('No AI models configured.')
  })

  it('uses specific loading copy for AI binding matrix', async () => {
    useQueryMock
      .mockReturnValueOnce(createQueryResult([{ id: 'model-1', name: 'Revenue' }]))
      .mockReturnValueOnce(createQueryResult(undefined, { isLoading: false }))
      .mockReturnValueOnce(createQueryResult(undefined, { isLoading: false }))
      .mockReturnValueOnce(createQueryResult(undefined, { isLoading: false }))
      .mockReturnValueOnce(createQueryResult(undefined, { isLoading: true }))

    const container = await renderPage(React.createElement(AiBindingsPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading AI binding matrix...')
  })

  it('renders explicit empty copy and retries AI binding matrix loading', async () => {
    const refetch = vi.fn()
    useQueryMock
      .mockReturnValueOnce(createQueryResult([{ id: 'model-1', name: 'Revenue' }]))
      .mockReturnValueOnce(createQueryResult({ items: [{ id: 'binding-1', task: 'nl2plan_llm' }] }))
      .mockReturnValueOnce(createQueryResult({ items: [{ id: 'audit-1', task: 'nl2plan_llm' }] }))
      .mockReturnValueOnce(createQueryResult({ task: 'nl2plan_llm', strict: true }))
      .mockReturnValueOnce(
        createQueryResult(undefined, {
          error: new Error('Binding matrix failed'),
          refetch
        })
      )

    const errorContainer = await renderPage(React.createElement(AiBindingsPage))
    const retryButton = errorContainer.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(errorContainer.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Binding matrix failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)

    useQueryMock.mockReset()
    useQueryMock
      .mockReturnValueOnce(createQueryResult([{ id: 'model-1', name: 'Revenue' }]))
      .mockReturnValueOnce(createQueryResult({ items: [{ id: 'binding-1', task: 'nl2plan_llm' }] }))
      .mockReturnValueOnce(createQueryResult({ items: [{ id: 'audit-1', task: 'nl2plan_llm' }] }))
      .mockReturnValueOnce(createQueryResult({ task: 'nl2plan_llm', strict: true }))
      .mockReturnValueOnce(createQueryResult(undefined))

    const emptyContainer = await renderPage(React.createElement(AiBindingsPage))

    expect(emptyContainer.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No AI binding matrix available for the selected semantic model.'
    )
  })
})

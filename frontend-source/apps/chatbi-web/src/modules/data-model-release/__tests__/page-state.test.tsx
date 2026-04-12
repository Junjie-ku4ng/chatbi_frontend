// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DataModelReleasePage from '../page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock, useQueryClientMock, invalidateQueriesMock, replaceMock, ApiRequestErrorMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  replaceMock: vi.fn(),
  ApiRequestErrorMock: class ApiRequestError extends Error {
    status: number

    constructor(input: { status: number; message: string }) {
      super(input.message)
      this.status = input.status
    }
  }
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn()
  })
}))

vi.mock('@/lib/api-client', () => ({
  ApiRequestError: ApiRequestErrorMock,
  apiRequest: vi.fn()
}))

vi.mock('@/modules/bi/canonical-shell', async () => {
  const ReactModule = await import('react')
  return {
    BiCanonicalShell: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    BiCanonicalPanel: ({ children, testId }: { children?: React.ReactNode; testId?: string }) =>
      ReactModule.createElement('section', { 'data-testid': testId }, children)
  }
})

vi.mock('@/modules/shared/ui/primitives', async () => {
  const ReactModule = await import('react')
  return {
    NexusBadge: ({ children, ...props }: MockElementProps) => ReactModule.createElement('span', props, children),
    NexusButton: ({ children, ...props }: MockElementProps) => ReactModule.createElement('button', props, children),
    NexusCard: ({ children, ...props }: MockElementProps) => ReactModule.createElement('div', props, children)
  }
})

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function createQueryResult(
  data: unknown,
  overrides?: Partial<{
    error: unknown
    isLoading: boolean
    refetch: ReturnType<typeof vi.fn>
  }>
) {
  return {
    data,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides
  }
}

type MutationOptions = {
  mutationFn?: (input?: unknown) => Promise<unknown> | unknown
  onSuccess?: (...args: any[]) => void
  onError?: (...args: any[]) => void
}

const capturedMutations: MutationOptions[] = []

function mockPageQueries(
  overrides?: Partial<{
    draft: ReturnType<typeof createQueryResult>
    semanticModel: ReturnType<typeof createQueryResult>
    deployment: ReturnType<typeof createQueryResult>
  }>
) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'data-model-release-draft') {
      return (
        overrides?.draft ??
        createQueryResult({
          id: 'draft-1',
          name: 'Sales draft',
          draftVersion: 3,
          tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      })
      )
    }
    if (key === 'data-model-release-semantic-model') {
      return (
        overrides?.semanticModel ??
        createQueryResult({
          id: 'model-1',
          name: 'Hydrated semantic model',
          cube: 'Sales'
        })
      )
    }
    if (key === 'data-model-release-deployment') {
      return (
        overrides?.deployment ??
        createQueryResult({
          id: 'deployment-1',
          status: 'released',
          targetCube: 'Sales'
        })
      )
    }
    if (key === 'data-model-release-load-history') {
      return createQueryResult({ items: [], total: 0 })
    }
    if (key === 'data-model-release-refresh-policy') {
      return createQueryResult(undefined)
    }
    if (key === 'data-model-release-refresh-runs') {
      return createQueryResult({ items: [], total: 0 })
    }
    if (key === 'data-model-release-release-decision') {
      return createQueryResult(undefined)
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
}

function mockMutations() {
  capturedMutations.length = 0
  useQueryClientMock.mockReturnValue({
    invalidateQueries: invalidateQueriesMock
  })
  useMutationMock.mockImplementation((options?: MutationOptions) => {
    capturedMutations.push(options ?? {})
    return {
      isPending: false,
      mutate: vi.fn(async (input?: unknown) => {
        try {
          const result = await options?.mutationFn?.(input)
          options?.onSuccess?.(result, input)
        } catch (error) {
          options?.onError?.(error, input)
        }
      })
    }
  })
}

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
  invalidateQueriesMock.mockReset()
  replaceMock.mockReset()
  window.history.replaceState(null, '', '/data-model-release')
  capturedMutations.length = 0
})

async function renderPage(props?: { dataSourceId?: string; draftId?: string; modelId?: string; deploymentId?: string }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })
  const resolvedProps = {
    dataSourceId: 'source-1',
    draftId: 'draft-1',
    modelId: undefined,
    deploymentId: undefined,
    ...props
  }

  await act(async () => {
    root.render(React.createElement(DataModelReleasePage, resolvedProps))
    await Promise.resolve()
    await Promise.resolve()
  })

  return container
}

describe('DataModelReleasePage shared draft states', () => {
  it('hydrates semantic model and deployment records from route state', async () => {
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult({
        id: 'model-1',
        name: 'Hydrated semantic model',
        cube: 'Sales'
      }),
      deployment: createQueryResult({
        id: 'deployment-1',
        status: 'released',
        targetCube: 'Sales'
      })
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: 'draft-1',
      modelId: 'model-1',
      deploymentId: 'deployment-1'
    })

    expect(container.querySelector('[data-testid="data-model-release-semantic-model-id"]')?.textContent).toContain('model-1')
    expect(container.querySelector('[data-testid="data-model-release-semantic-model-record"]')?.textContent).toContain('Hydrated semantic model')
    expect(container.querySelector('[data-testid="data-model-release-deployment-record"]')?.textContent).toContain('deployment-1')
    expect(container.querySelector('[data-testid="data-model-release-deployment-record"]')?.textContent).toContain('released')
  })

  it('renders the release workbench for a model-only deep link without falling back to bootstrap', async () => {
    mockPageQueries({
      draft: createQueryResult(null),
      semanticModel: createQueryResult({
        id: 'model-1',
        name: 'Hydrated semantic model',
        cube: 'Sales'
      })
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: undefined,
      modelId: 'model-1'
    })

    expect(container.querySelector('[data-testid="data-model-release-bootstrap-panel"]')).toBeNull()
    expect(container.querySelector('[data-testid="data-model-release-draft-row-loading"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="data-model-release-semantic-model-id"]')?.textContent).toContain('model-1')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-semantic-draft"]')?.textContent).toContain('ready')
  })

  it('shows a bootstrap panel when only dataSourceId is present', async () => {
    mockPageQueries({
      draft: createQueryResult(null)
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: undefined
    })

    expect(container.querySelector('[data-testid="data-model-release-bootstrap-panel"]')).not.toBeNull()
    expect(container.textContent).toContain('Load source catalog')
    expect(container.textContent).toContain('Create source-model draft')
    expect(container.querySelector('[data-testid="data-model-release-missing-draft"]')).toBeNull()
    expect(container.querySelector('[data-testid="data-model-release-journey-step-data-source"]')?.textContent).toContain('ready')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-source-model"]')?.textContent).toContain('current')
  })

  it('renders canonical journey stages in order with route-derived status', async () => {
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult({
        id: 'model-1',
        name: 'Hydrated semantic model',
        cube: 'Sales'
      }),
      deployment: createQueryResult({
        id: 'deployment-1',
        status: 'released',
        targetCube: 'Sales'
      })
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: 'draft-1',
      modelId: 'model-1',
      deploymentId: 'deployment-1'
    })

    const stepLabels = Array.from(container.querySelectorAll('[data-testid^="data-model-release-journey-step-"] strong')).map(node =>
      node.textContent?.replace(/^\d+\.\s*/, '').trim()
    )

    expect(stepLabels).toEqual([
      'Data Source',
      'Source Model',
      'Semantic Draft',
      'Deployment',
      'Load / Refresh',
      'Ask Readiness'
    ])
    expect(container.querySelector('[data-testid="data-model-release-journey-step-data-source"]')?.textContent).toContain('ready')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-source-model"]')?.textContent).toContain('ready')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-semantic-draft"]')?.textContent).toContain('ready')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-deployment"]')?.textContent).toContain('ready')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-load-refresh"]')?.textContent).toContain('current')
    expect(container.querySelector('[data-testid="data-model-release-journey-step-ask-readiness"]')?.textContent).toContain('current')
  })

  it('persists modelId into the route while preserving existing query params', async () => {
    window.history.replaceState(null, '', '/data-model-release?dataSourceId=source-1&draftId=draft-1&foo=bar')
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      })
    })
    mockMutations()

    await renderPage()

    expect(capturedMutations[2]?.onSuccess).toBeTypeOf('function')

    await act(async () => {
      capturedMutations[2]?.onSuccess?.({ id: 'model-99' })
      await Promise.resolve()
    })

    const replacedUrl = String(replaceMock.mock.calls.at(-1)?.[0] ?? '')
    const params = new URL(replacedUrl, 'http://localhost').searchParams
    expect(params.get('dataSourceId')).toBe('source-1')
    expect(params.get('draftId')).toBe('draft-1')
    expect(params.get('foo')).toBe('bar')
    expect(params.get('modelId')).toBe('model-99')
  })

  it('persists deploymentId into the route while preserving existing query params', async () => {
    window.history.replaceState(null, '', '/data-model-release?dataSourceId=source-1&draftId=draft-1&foo=bar')
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult({
        id: 'model-1',
        name: 'Hydrated semantic model',
        cube: 'Sales'
      })
    })
    mockMutations()

    await renderPage({ modelId: 'model-1' })

    expect(capturedMutations[8]?.onSuccess).toBeTypeOf('function')

    await act(async () => {
      capturedMutations[8]?.onSuccess?.({ id: 'deployment-99' })
      await Promise.resolve()
    })

    const replacedUrl = String(replaceMock.mock.calls.at(-1)?.[0] ?? '')
    const params = new URL(replacedUrl, 'http://localhost').searchParams
    expect(params.get('dataSourceId')).toBe('source-1')
    expect(params.get('draftId')).toBe('draft-1')
    expect(params.get('foo')).toBe('bar')
    expect(params.get('modelId')).toBe('model-1')
    expect(params.get('deploymentId')).toBe('deployment-99')
  })

  it('prefers a newly created semantic model over a stale route modelId before router sync completes', async () => {
    window.history.replaceState(null, '', '/data-model-release?dataSourceId=source-1&draftId=draft-1&modelId=model-old')
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult({
        id: 'model-old',
        name: 'Old semantic model',
        cube: 'Sales'
      })
    })
    mockMutations()

    const container = await renderPage({ modelId: 'model-old' })

    await act(async () => {
      capturedMutations[2]?.onSuccess?.({ id: 'model-new', name: 'New semantic model' })
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="data-model-release-semantic-model-id"]')?.textContent).toContain('model-new')
    expect(String(replaceMock.mock.calls.at(-1)?.[0] ?? '')).toContain('modelId=model-new')
  })

  it('renders shared loading state for the source-model draft', async () => {
    mockPageQueries({
      draft: createQueryResult(undefined, { isLoading: true })
    })
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading draft...')
  })

  it('renders shared retryable error state and retries draft loading', async () => {
    const refetch = vi.fn()
    mockPageQueries({
      draft: createQueryResult(undefined, {
        error: new Error('Draft lookup failed'),
        refetch
      })
    })
    mockMutations()

    const container = await renderPage()
    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Draft lookup failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders shared empty state when the draft query resolves without a draft', async () => {
    mockPageQueries({
      draft: createQueryResult(null)
    })
    mockMutations()

    const container = await renderPage()

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('Draft not found')
  })

  it('surfaces linked semantic/deployment record gaps and blocks downstream actions until route records are restored', async () => {
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult(null),
      deployment: createQueryResult(null)
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: 'draft-1',
      modelId: 'model-404',
      deploymentId: 'deployment-404'
    })

    expect(container.textContent).toContain('Semantic model record not found for this route.')
    expect(container.textContent).toContain('Deployment record not found for this route.')
    expect((container.querySelector('[data-testid="data-model-release-preview-indicator-candidates"]') as HTMLButtonElement | null)?.disabled).toBe(
      true
    )
    expect((container.querySelector('[data-testid="data-model-release-deployment-preview"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="data-model-release-create-deployment"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="data-model-release-create-load-job"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="data-model-release-readiness"]') as HTMLButtonElement | null)?.disabled).toBe(true)
  })

  it('renders retryable semantic model record lookup errors with a retry action and blocks dependent authoring actions', async () => {
    const refetch = vi.fn()
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      }),
      semanticModel: createQueryResult(undefined, {
        error: new Error('Semantic model lookup failed'),
        refetch
      })
    })
    mockMutations()

    const container = await renderPage({
      dataSourceId: 'source-1',
      draftId: 'draft-1',
      modelId: 'model-1'
    })
    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Semantic model lookup failed')
    expect(retryButton).not.toBeNull()
    expect((container.querySelector('[data-testid="data-model-release-deployment-preview"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="data-model-release-create-deployment"]') as HTMLButtonElement | null)?.disabled).toBe(true)
    expect((container.querySelector('[data-testid="data-model-release-readiness"]') as HTMLButtonElement | null)?.disabled).toBe(true)

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('uses authoring-specific permission copy when semantic draft creation is forbidden', async () => {
    mockPageQueries({
      draft: createQueryResult({
        id: 'draft-1',
        name: 'Sales draft',
        draftVersion: 3,
        tables: [{ id: 'table-1', sourcePath: 'Sales' }],
        relations: []
      })
    })
    mockMutations()

    const container = await renderPage()

    await act(async () => {
      capturedMutations[2]?.onError?.(
        new ApiRequestErrorMock({
          status: 403,
          message: 'Semantic draft authoring requires allow:model:write'
        })
      )
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="data-model-release-status"]')?.textContent).toContain(
      'Create semantic draft denied: Semantic draft authoring requires allow:model:write'
    )
  })
})

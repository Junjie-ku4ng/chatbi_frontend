// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SemanticStudioPage from '../../../../app/(workspace)/semantic-studio/page'
import SemanticStudioDetailPage from '../../../../app/(workspace)/semantic-studio/[id]/page'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const {
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  useParamsMock,
  useSearchParamsMock,
  buildDataModelReleaseHrefMock,
  ApiRequestErrorMock
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  buildDataModelReleaseHrefMock: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
  useSearchParams: useSearchParamsMock
}))

vi.mock('next/link', async () => {
  const ReactModule = await import('react')
  return {
    default: ({ href, children, ...props }: MockElementProps & { href?: string }) =>
      ReactModule.createElement('a', { href, ...props }, children)
  }
})

vi.mock('@/lib/api-client', () => ({
  ApiRequestError: ApiRequestErrorMock,
  listSemanticModels: vi.fn()
}))

vi.mock('@/modules/shared/rbac/access-guard', async () => {
  const ReactModule = await import('react')
  return {
    AccessGuard: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children)
  }
})

vi.mock('@/modules/semantic-studio/api', () => ({
  applySemanticEditorOperations: vi.fn(),
  applySemanticRelationTemplate: vi.fn(),
  createSemanticRelationTemplate: vi.fn(),
  createSemanticSyncDeleteConfirmation: vi.fn(),
  createSemanticSyncRun: vi.fn(),
  getDataSourcePACubeMetadata: vi.fn(),
  getSemanticEditorGraphNeighbors: vi.fn(),
  getSemanticEditorGraphPage: vi.fn(),
  getSemanticEditorImpact: vi.fn(),
  getSemanticEditorState: vi.fn(),
  getSemanticSyncProfile: vi.fn(),
  listDataSourcePACubes: vi.fn(),
  listSemanticEditorOperations: vi.fn(),
  listSemanticRelationTemplates: vi.fn(),
  listSemanticRelationTimeline: vi.fn(),
  listSemanticSyncRuns: vi.fn(),
  onboardSemanticModelFromPA: vi.fn(),
  previewSemanticEditorDraft: vi.fn(),
  previewSemanticSync: vi.fn(),
  publishSemanticEditorModel: vi.fn(),
  resolveGateBlockerDetails: vi.fn(),
  resolveGateBlockers: vi.fn(),
  retrySemanticSyncRun: vi.fn(),
  updateSemanticRelationTemplate: vi.fn(),
  updateSemanticSyncProfile: vi.fn(),
  validateSemanticEditorDraft: vi.fn()
}))

vi.mock('@/modules/data-model-release/route-href', () => ({
  buildDataModelReleaseHref: buildDataModelReleaseHrefMock
}))

vi.mock('@/modules/semantic-studio/graph-canvas', async () => {
  const ReactModule = await import('react')
  return {
    GraphCanvas: () => ReactModule.createElement('div', { 'data-testid': 'semantic-graph-canvas' })
  }
})

vi.mock('@/modules/semantic-studio/graph-v2-canvas', async () => {
  const ReactModule = await import('react')
  return {
    GraphV2Canvas: () => ReactModule.createElement('div', { 'data-testid': 'semantic-graph-v2-canvas' })
  }
})

vi.mock('@/modules/semantic-studio/graph-v2-store', () => ({
  applySemanticGraphRelations: vi.fn(),
  createSemanticGraphWindowState: vi.fn((graph: unknown, meta: unknown) => ({ graph, meta })),
  hasSemanticGraphMore: vi.fn(() => false),
  mergeSemanticGraphWindowState: vi.fn((state: unknown) => state),
  upsertSemanticGraphRelation: vi.fn((state: unknown) => state)
}))

vi.mock('@/modules/semantic-studio/impact-gate-panel', async () => {
  const ReactModule = await import('react')
  return {
    ImpactGatePanel: () => ReactModule.createElement('div', { 'data-testid': 'semantic-impact-gate-panel' })
  }
})

vi.mock('@/modules/semantic-studio/relation-panel', async () => {
  const ReactModule = await import('react')
  return {
    RelationPanel: () => ReactModule.createElement('div', { 'data-testid': 'semantic-relation-panel' })
  }
})

vi.mock('@/modules/semantic-studio/relation-template-drawer', async () => {
  const ReactModule = await import('react')
  return {
    RelationTemplateDrawer: () => ReactModule.createElement('div', { 'data-testid': 'semantic-relation-template-drawer' })
  }
})

vi.mock('@/modules/semantic-studio/relation-timeline', async () => {
  const ReactModule = await import('react')
  return {
    RelationTimeline: () => ReactModule.createElement('div', { 'data-testid': 'semantic-relation-timeline' })
  }
})

vi.mock('@/modules/semantic-studio/status-message', () => ({
  formatPublishErrorStatus: vi.fn(() => 'Publish denied')
}))

vi.mock('@/modules/semantic-studio/sync-preview-panel', async () => {
  const ReactModule = await import('react')
  return {
    SyncPreviewPanel: () => ReactModule.createElement('div', { 'data-testid': 'semantic-sync-preview-panel' })
  }
})

vi.mock('@/modules/semantic-studio/sync-run-timeline', async () => {
  const ReactModule = await import('react')
  return {
    SyncRunTimeline: () => ReactModule.createElement('div', { 'data-testid': 'semantic-sync-run-timeline' })
  }
})

vi.mock('@/modules/semantic-studio/sync-delete-confirm-dialog', async () => {
  const ReactModule = await import('react')
  return {
    SyncDeleteConfirmDialog: () => ReactModule.createElement('div', { 'data-testid': 'semantic-sync-delete-confirm-dialog' })
  }
})

type QueryResult<T> = {
  data: T
  error: unknown
  isLoading: boolean
  refetch: ReturnType<typeof vi.fn>
}

type MutationOptions = {
  mutationFn?: (input?: unknown) => Promise<unknown> | unknown
  onSuccess?: (...args: any[]) => void
  onError?: (...args: any[]) => void
}

type MutationStateOverride = Partial<{
  error: unknown
  isPending: boolean
  mutate: ReturnType<typeof vi.fn>
  mutateAsync: ReturnType<typeof vi.fn>
}>

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = []
const capturedMutations: MutationOptions[] = []
const DETAIL_MUTATION_COUNT = 18

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function createQueryResult<T>(data: T, overrides?: Partial<QueryResult<T>>): QueryResult<T> {
  return {
    data,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides
  }
}

function createSemanticStudioState() {
  return {
    draftKey: 'draft-1',
    model: {
      id: 'model-1',
      schemaVersion: 7
    },
    catalog: {
      measures: [],
      dimensions: [],
      hierarchies: [],
      relations: [],
      relationFieldSpecs: [],
      fieldSpecs: {
        relation: []
      }
    },
    graph: {
      nodes: [],
      edges: []
    },
    graphMeta: {
      hasMore: false
    }
  }
}

function mockLandingQueries(result: QueryResult<unknown>) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'semantic-studio-models') {
      return result
    }
    throw new Error(`unexpected query key: ${String(queryKey[0])}`)
  })
}

function mockDetailQueries(
  overrides?: Partial<{
    state: QueryResult<unknown>
    operations: QueryResult<unknown>
    relationTemplates: QueryResult<unknown>
    relationTimeline: QueryResult<unknown>
    syncProfile: QueryResult<unknown>
    syncRuns: QueryResult<unknown>
  }>
) {
  const results = {
    state: overrides?.state ?? createQueryResult(createSemanticStudioState()),
    operations: overrides?.operations ?? createQueryResult({ items: [] }),
    relationTemplates: overrides?.relationTemplates ?? createQueryResult({ items: [] }),
    relationTimeline: overrides?.relationTimeline ?? createQueryResult({ items: [] }),
    syncProfile: overrides?.syncProfile ?? createQueryResult({ paDataSourceId: 'ds-pa' }),
    syncRuns: overrides?.syncRuns ?? createQueryResult({ items: [] })
  }

  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'semantic-studio-state') {
      return results.state
    }
    if (key === 'semantic-studio-operations') {
      return results.operations
    }
    if (key === 'semantic-studio-relation-templates') {
      return results.relationTemplates
    }
    if (key === 'semantic-studio-relation-timeline') {
      return results.relationTimeline
    }
    if (key === 'semantic-sync-profile') {
      return results.syncProfile
    }
    if (key === 'semantic-sync-runs') {
      return results.syncRuns
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
}

function mockDetailMutations(overrides?: Record<number, MutationStateOverride>) {
  capturedMutations.length = 0
  const mutationResults = Array.from({ length: DETAIL_MUTATION_COUNT }, (_, index) => ({
    error: null,
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    ...(overrides?.[index] ?? {})
  }))
  let mutationIndex = 0

  useMutationMock.mockImplementation((options?: MutationOptions) => {
    const currentIndex = mutationIndex % DETAIL_MUTATION_COUNT
    mutationIndex += 1
    if (!capturedMutations[currentIndex]) {
      capturedMutations[currentIndex] = options ?? {}
    }
    return mutationResults[currentIndex]
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
  capturedMutations.length = 0
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_SEMANTIC_SYNC_V1
  delete process.env.NEXT_PUBLIC_SEMANTIC_SYNC_ALLOWLIST
  delete process.env.NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2
  delete process.env.NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2_ALLOWLIST
})

async function renderElement(element: React.ReactElement) {
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

describe('semantic studio shared states', () => {
  it('uses route-specific loading copy while semantic models are loading', async () => {
    mockLandingQueries(createQueryResult(undefined, { isLoading: true }))

    const container = await renderElement(React.createElement(SemanticStudioPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('Loading semantic models...')
  })

  it('renders a retryable model-list error state and retries the listing query', async () => {
    const refetch = vi.fn()
    mockLandingQueries(
      createQueryResult(undefined, {
        error: new Error('Semantic model listing failed'),
        refetch
      })
    )

    const container = await renderElement(React.createElement(SemanticStudioPage))
    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Semantic model listing failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('uses explicit empty-state copy when no semantic models are available for authoring', async () => {
    mockLandingQueries(createQueryResult([]))

    const container = await renderElement(React.createElement(SemanticStudioPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'No semantic models available for Semantic Studio.'
    )
  })

  it('uses route-specific loading copy while semantic editor state is loading', async () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
    buildDataModelReleaseHrefMock.mockImplementation(() => '/data-model-release?modelId=model-1')
    mockDetailQueries({
      state: createQueryResult(undefined, { isLoading: true })
    })
    mockDetailMutations()

    const container = await renderElement(React.createElement(SemanticStudioDetailPage))

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain(
      'Loading semantic editor state...'
    )
  })

  it('renders a retryable editor-state error and retries the detail query', async () => {
    const refetch = vi.fn()
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
    buildDataModelReleaseHrefMock.mockImplementation(() => '/data-model-release?modelId=model-1')
    mockDetailQueries({
      state: createQueryResult(undefined, {
        error: new Error('Semantic editor state failed'),
        refetch
      })
    })
    mockDetailMutations()

    const container = await renderElement(React.createElement(SemanticStudioDetailPage))
    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('Semantic editor state failed')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('uses explicit missing-state copy when the semantic editor route cannot recover model state', async () => {
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
    buildDataModelReleaseHrefMock.mockImplementation(() => '/data-model-release?modelId=model-1')
    mockDetailQueries({
      state: createQueryResult(null)
    })
    mockDetailMutations()

    const container = await renderElement(React.createElement(SemanticStudioDetailPage))

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain(
      'Semantic Studio model state not found.'
    )
  })

  it('passes onboarding drawer loading and error states through the semantic detail route', async () => {
    process.env.NEXT_PUBLIC_SEMANTIC_SYNC_V1 = 'true'
    process.env.NEXT_PUBLIC_SEMANTIC_SYNC_ALLOWLIST = ''
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
    buildDataModelReleaseHrefMock.mockImplementation(() => '/data-model-release?modelId=model-1')
    mockDetailQueries()
    mockDetailMutations({
      15: { isPending: true },
      16: { error: new Error('Metadata lookup failed') }
    })

    const container = await renderElement(React.createElement(SemanticStudioDetailPage))

    await act(async () => {
      ;(container.querySelector('[data-testid="semantic-sync-open-onboard"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Loading cubes...')
    expect(container.textContent).toContain('Metadata lookup failed')
  })

  it('keeps synthesized-level review guidance attached to the Data Model Release route from the detail page', async () => {
    process.env.NEXT_PUBLIC_SEMANTIC_SYNC_V1 = 'true'
    process.env.NEXT_PUBLIC_SEMANTIC_SYNC_ALLOWLIST = ''
    useParamsMock.mockReturnValue({ id: 'model-1' })
    useSearchParamsMock.mockReturnValue({ get: vi.fn(() => null) })
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
    buildDataModelReleaseHrefMock.mockImplementation(
      () => '/data-model-release?dataSourceId=ds-pa&modelId=model-1'
    )
    mockDetailQueries()
    mockDetailMutations()

    const container = await renderElement(React.createElement(SemanticStudioDetailPage))

    await act(async () => {
      ;(container.querySelector('[data-testid="semantic-sync-open-onboard"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      capturedMutations[15]?.onSuccess?.({
        items: [{ name: 'Allocation Calculation', dimensions: ['Version'] }]
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="semantic-sync-onboard-cube-Allocation Calculation"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    await act(async () => {
      capturedMutations[16]?.onSuccess?.({
        cube: 'Allocation Calculation',
        metricDimension: 'Measures',
        dimensions: ['Version'],
        measures: ['Amount'],
        synthesizedLevels: [
          {
            dimension: 'Allocation Calculation',
            hierarchy: 'Allocation Calculation',
            executionLevel: 'level000',
            semanticLevelName: 'Allocation Calculation Level 1'
          }
        ]
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    const reviewLink = Array.from(container.querySelectorAll('a')).find(anchor => anchor.textContent?.includes('Data Model Release'))

    expect(container.textContent).toContain('Allocation Calculation Level 1')
    expect(container.textContent).toContain('Review synthesized level semantics in Data Model Release before publish.')
    expect(reviewLink).not.toBeNull()
    expect(reviewLink?.getAttribute('href')).toBe('/data-model-release?dataSourceId=ds-pa&modelId=model-1')
  })
})

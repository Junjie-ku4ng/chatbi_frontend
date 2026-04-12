// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AskAnalysisPanel } from '../analysis-panel'

type MockElementProps = React.PropsWithChildren<Record<string, unknown>>

const { useQueryMock, useMutationMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn()
}))

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

vi.mock('../filter-builder', async () => {
  const ReactModule = await import('react')
  return {
    AnalysisFilterBuilder: () => ReactModule.createElement('div', { 'data-testid': 'analysis-filter-builder' })
  }
})

vi.mock('../time-controls', async () => {
  const ReactModule = await import('react')
  return {
    AnalysisTimeControls: () => ReactModule.createElement('div', { 'data-testid': 'analysis-time-controls' })
  }
})

vi.mock('../derived-metric-builder', async () => {
  const ReactModule = await import('react')
  return {
    DerivedMetricBuilder: () => ReactModule.createElement('div', { 'data-testid': 'analysis-derived-metrics' })
  }
})

vi.mock('../template-manager', async () => {
  const ReactModule = await import('react')
  return {
    AnalysisTemplateManager: () => ReactModule.createElement('div', { 'data-testid': 'analysis-template-manager' })
  }
})

vi.mock('@/modules/shared/lists/virtualized-list', async () => {
  const ReactModule = await import('react')
  return {
    VirtualizedList: ({ items }: { items: Array<{ id: string; prompt?: string }> }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'analysis-virtualized-list' },
        items.map(item => ReactModule.createElement('div', { key: item.id }, item.prompt ?? item.id))
      )
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

function mockAnalysisQueries(
  overrides?: Partial<{
    context: ReturnType<typeof createQueryResult>
    history: ReturnType<typeof createQueryResult>
    suggestions: ReturnType<typeof createQueryResult>
  }>
) {
  const contextResult =
    overrides?.context ??
    createQueryResult({
      capabilities: {
        sortableMetrics: ['Sales'],
        timePresets: []
      },
      safeRanges: {
        topN: { min: 1, max: 200 }
      },
      presetBundles: []
    })
  const historyResult =
    overrides?.history ??
    createQueryResult({
      items: [],
      nextCursor: null
    })
  const suggestionsResult =
    overrides?.suggestions ??
    createQueryResult({
      items: [{ code: 'Sales' }]
    })

  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0]
    if (key === 'ask-analysis-context') {
      return contextResult
    }
    if (key === 'ask-analysis-history') {
      return historyResult
    }
    if (key === 'ask-analysis-sort-suggestions') {
      return suggestionsResult
    }
    throw new Error(`unexpected query key: ${String(key)}`)
  })
}

function mockMutations() {
  useMutationMock.mockImplementation((options?: {
    mutationFn?: (input?: unknown) => Promise<unknown>
    onSuccess?: (payload: unknown) => void
    onError?: (error: unknown) => void
  }) => ({
    isPending: false,
    data: undefined,
    reset: vi.fn(),
    mutate: vi.fn(async (input?: unknown) => {
      try {
        const result = await options?.mutationFn?.(input)
        options?.onSuccess?.(result)
      } catch (error) {
        options?.onError?.(error)
      }
    })
  }))
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
})

async function renderPanel(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
    await Promise.resolve()
  })

  return { container, root }
}

async function rerenderPanel(root: Root, element: React.ReactElement) {
  await act(async () => {
    root.render(element)
    await Promise.resolve()
    await Promise.resolve()
  })
}

function getByTestId(container: ParentNode, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  expect(element).not.toBeNull()
  return element as HTMLElement
}

describe('AskAnalysisPanel state transitions', () => {
  it('keeps answer-surface draft sort metrics visible even when current suggestions do not list them', async () => {
    mockAnalysisQueries({
      context: createQueryResult({
        capabilities: {
          sortableMetrics: ['Sales'],
          timePresets: []
        },
        explain: {
          dimensions: [{ dimension: 'Region' }]
        },
        safeRanges: {
          topN: { min: 1, max: 200 }
        },
        presetBundles: []
      }),
      suggestions: createQueryResult({
        items: [{ code: 'Sales' }]
      })
    })
    mockMutations()

    const { container } = await renderPanel(
      React.createElement(AskAnalysisPanel, {
        enabled: true,
        queryLogId: 'query-log-1',
        baseQueryLogId: 'query-log-1',
        initialDraft: {
          prompt: '按 Region 继续分析',
          patch: {
            topN: 5,
            sort: {
              by: 'Revenue',
              dir: 'ASC'
            },
            filters: [
              {
                dimension: 'Region',
                op: 'IN',
                members: ['West']
              }
            ]
          },
          analysisAction: 'open_analysis'
        },
        onApplyFollowup: vi.fn(async () => ({})),
        onTemplateApplied: vi.fn()
      })
    )

    expect((getByTestId(container, 'ask-analysis-topn') as HTMLInputElement).value).toBe('5')
    expect((getByTestId(container, 'ask-analysis-sortby') as HTMLSelectElement).value).toBe('Revenue')
    expect((getByTestId(container, 'ask-analysis-sortdir') as HTMLSelectElement).value).toBe('ASC')
  })

  it('resets draft-driven fields when switching to a new query log without a fresh draft', async () => {
    mockAnalysisQueries()
    mockMutations()

    const onApplyFollowup = vi.fn(async () => ({}))
    const onTemplateApplied = vi.fn()

    const initialElement = React.createElement(AskAnalysisPanel, {
      enabled: true,
      queryLogId: 'query-log-1',
      baseQueryLogId: 'query-log-1',
      initialDraft: {
        prompt: '按华东继续分析',
        patch: {
          topN: 5,
          sort: { by: 'Sales', dir: 'ASC' }
        },
        analysisAction: 'analysis_panel_apply'
      },
      onApplyFollowup,
      onTemplateApplied
    })

    const { container, root } = await renderPanel(initialElement)

    expect((getByTestId(container, 'ask-analysis-prompt') as HTMLTextAreaElement).value).toBe('按华东继续分析')
    expect((getByTestId(container, 'ask-analysis-topn') as HTMLInputElement).value).toBe('5')
    expect(getByTestId(container, 'ask-analysis-status').textContent).toContain('Loaded analysis_panel_apply draft')

    const nextElement = React.createElement(AskAnalysisPanel, {
      enabled: true,
      queryLogId: 'query-log-2',
      baseQueryLogId: 'query-log-2',
      onApplyFollowup,
      onTemplateApplied
    })

    await rerenderPanel(root, nextElement)

    expect((getByTestId(container, 'ask-analysis-prompt') as HTMLTextAreaElement).value).toBe('继续分析')
    expect((getByTestId(container, 'ask-analysis-topn') as HTMLInputElement).value).toBe('10')
    expect(container.querySelector('[data-testid="ask-analysis-status"]')).toBeNull()
  })

  it('renders shared loading state for analysis history', async () => {
    mockAnalysisQueries({
      history: createQueryResult(undefined, { isLoading: true })
    })
    mockMutations()

    const { container } = await renderPanel(
      React.createElement(AskAnalysisPanel, {
        enabled: true,
        queryLogId: 'query-log-1',
        baseQueryLogId: 'query-log-1',
        onApplyFollowup: vi.fn(async () => ({})),
        onTemplateApplied: vi.fn()
      })
    )

    expect(container.querySelector('[data-testid="loadable-loading-state"]')?.textContent).toContain('加载分析历史...')
  })

  it('renders shared retryable error state and retries analysis history loading', async () => {
    const refetch = vi.fn()
    mockAnalysisQueries({
      history: createQueryResult(undefined, {
        error: new Error('历史加载失败'),
        refetch
      })
    })
    mockMutations()

    const { container } = await renderPanel(
      React.createElement(AskAnalysisPanel, {
        enabled: true,
        queryLogId: 'query-log-1',
        baseQueryLogId: 'query-log-1',
        onApplyFollowup: vi.fn(async () => ({})),
        onTemplateApplied: vi.fn()
      })
    )

    const retryButton = container.querySelector('[data-testid="loadable-retry-action"]') as HTMLButtonElement | null
    expect(container.querySelector('[data-testid="loadable-error-state"]')?.textContent).toContain('历史加载失败')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders shared empty state when analysis history is empty', async () => {
    mockAnalysisQueries({
      history: createQueryResult({
        items: [],
        nextCursor: null
      })
    })
    mockMutations()

    const { container } = await renderPanel(
      React.createElement(AskAnalysisPanel, {
        enabled: true,
        queryLogId: 'query-log-1',
        baseQueryLogId: 'query-log-1',
        onApplyFollowup: vi.fn(async () => ({})),
        onTemplateApplied: vi.fn()
      })
    )

    expect(container.querySelector('[data-testid="loadable-empty-state"]')?.textContent).toContain('暂无分析历史')
  })

  it('does not show ready while analysis context has failed to load', async () => {
    mockAnalysisQueries({
      context: createQueryResult(undefined, {
        error: new Error('context load failed')
      })
    })
    mockMutations()

    const { container } = await renderPanel(
      React.createElement(AskAnalysisPanel, {
        enabled: true,
        queryLogId: 'query-log-1',
        baseQueryLogId: 'query-log-1',
        onApplyFollowup: vi.fn(async () => ({})),
        onTemplateApplied: vi.fn()
      })
    )

    expect(container.querySelector('[data-testid="ask-analysis-ready"]')).toBeNull()
  })
})

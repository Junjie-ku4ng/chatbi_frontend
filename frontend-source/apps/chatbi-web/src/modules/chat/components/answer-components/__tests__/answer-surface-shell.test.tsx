import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnswerSurfaceShell } from '../answer-surface-shell'

const mountedRoots: Array<{ root: Root; container: HTMLDivElement }> = []

beforeEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
  vi.restoreAllMocks()
})

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
  })

  return container
}

function getButton(container: ParentNode, label: string) {
  const candidates = Array.from(container.querySelectorAll('button, a'))
  const match = candidates.find(button => button.textContent?.trim() === label)
  expect(match).toBeTruthy()
  return match as HTMLButtonElement
}

function getByTestId(container: ParentNode, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  expect(element).toBeTruthy()
  return element as HTMLElement
}

function buildPayload() {
  return {
    columns: ['Month', 'Revenue'],
    rows: [
      { Month: '2026-01', Revenue: 1200 },
      { Month: '2026-02', Revenue: 1285 }
    ],
    option: {
      xAxis: { type: 'category', data: ['2026-01', '2026-02'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [1200, 1285] }]
    },
    queryLogId: 'query-log-parity-1',
    traceKey: 'trace-parity-1',
    analysisHandoff: {
      queryLogId: 'query-log-parity-1',
      traceKey: 'trace-parity-1',
      modelId: 'model-parity-1',
      cube: 'Finance',
      metricCodes: ['Revenue'],
      dimensionCodes: ['Month'],
      analysisShape: 'trend',
      preferredShape: 'chart',
      appliedFilters: [{ dimension: 'Region', members: ['East'] }]
    },
    interaction: {
      availableViews: ['table', 'chart'],
      defaultView: 'table',
      sort: {
        enabled: true,
        metrics: ['Revenue'],
        current: { by: 'Revenue', dir: 'DESC' }
      },
      ranking: {
        enabled: true,
        currentLimit: 10,
        presets: [5, 10, 20]
      },
      slicers: {
        enabled: true,
        dimensions: ['Region', 'Channel'],
        applied: [{ dimension: 'Region', members: ['East'] }]
      },
      explain: {
        enabled: true,
        warnings: ['latest year incomplete'],
        queryLogId: 'query-log-parity-1',
        traceKey: 'trace-parity-1',
        refs: [
          {
            kind: 'query_reference',
            label: 'Revenue result set',
            queryLogId: 'query-log-parity-1',
            traceKey: 'trace-parity-1',
            warningCount: 1
          }
        ]
      },
      story: {
        enabled: true,
        widgetType: 'table',
        title: 'Revenue trend'
      },
      fullscreen: {
        enabled: true,
        title: 'Revenue trend'
      }
    }
  }
}

describe('answer surface shell', () => {
  it('renders parity-grade actions and switches view mode without regenerating the answer payload', async () => {
    const payload = buildPayload()
    const onOpenAnalysis = vi.fn()
    const onExplore = vi.fn()
    const onAddToStory = vi.fn()

    const container = await renderIntoDom(
      <AnswerSurfaceShell
        type="table"
        payload={payload}
        renderBody={viewMode => <div data-testid={`answer-surface-body-${viewMode}`}>body:{viewMode}</div>}
        onOpenAnalysis={onOpenAnalysis}
        onExplore={onExplore}
        onAddToStory={onAddToStory}
      />
    )

    expect(container.querySelector('[data-testid="answer-surface-body-table"]')?.textContent).toContain('body:table')
    expect(container.querySelector('[data-testid="answer-surface-query-log-id"]')?.textContent).toContain('query-log-parity-1')
    expect(container.querySelector('[data-testid="answer-surface-trace-key"]')?.textContent).toContain('trace-parity-1')

    expect(getButton(container, 'Table')).toBeTruthy()
    expect(getButton(container, 'Chart')).toBeTruthy()
    expect(getButton(container, 'Sort')).toBeTruthy()
    expect(getButton(container, 'Top')).toBeTruthy()
    expect(getButton(container, 'Slicer')).toBeTruthy()
    expect(getButton(container, 'Explain')).toBeTruthy()
    expect(getButton(container, 'Open Analysis')).toBeTruthy()
    expect(getButton(container, 'Explore')).toBeTruthy()
    expect(getButton(container, 'Add to Story')).toBeTruthy()
    expect(getButton(container, 'Fullscreen')).toBeTruthy()

    await act(async () => {
      getButton(container, 'Explain').click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-evidence-drawer').textContent).toContain('Revenue result set')
    expect(getByTestId(container, 'answer-evidence-query-log-id').textContent).toContain('query-log-parity-1')
    expect(getByTestId(container, 'answer-evidence-trace-key').textContent).toContain('trace-parity-1')
    expect(getByTestId(container, 'answer-evidence-warning-0').textContent).toContain('latest year incomplete')
    expect(getByTestId(container, 'answer-evidence-ref-0').textContent).toContain('query_reference')
    expect(getByTestId(container, 'answer-evidence-ref-0').textContent).toContain('warningCount')

    const evidenceAnalysisLink = getByTestId(container, 'answer-evidence-open-analysis') as HTMLAnchorElement
    const evidenceAnalysisUrl = new URL(String(evidenceAnalysisLink.getAttribute('href')), 'https://chatbi.local')
    expect(evidenceAnalysisUrl.pathname).toBe('/chat')
    expect(evidenceAnalysisUrl.hash).toBe('#analysis')
    expect(evidenceAnalysisUrl.searchParams.get('queryLogId')).toBe('query-log-parity-1')
    expect(evidenceAnalysisUrl.searchParams.get('traceKey')).toBe('trace-parity-1')

    const evidenceTraceLink = getByTestId(container, 'answer-evidence-open-trace') as HTMLAnchorElement
    expect(evidenceTraceLink.getAttribute('href')).toBe('/ops/traces/trace-parity-1')

    await act(async () => {
      getButton(container, 'Sort').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')

    await act(async () => {
      getButton(container, 'Chart').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-surface-body-chart"]')?.textContent).toContain('body:chart')
    expect(container.querySelector('[data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')

    await act(async () => {
      getButton(container, 'Fullscreen').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"] [data-testid="answer-surface-body-chart"]')?.textContent).toContain('body:chart')
    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"] [data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')

    await act(async () => {
      getButton(container, 'Close').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')

    await act(async () => {
      getButton(container, 'Open Analysis').click()
      getButton(container, 'Explore').click()
      getButton(container, 'Add to Story').click()
      await Promise.resolve()
    })

    expect(onOpenAnalysis).toHaveBeenCalledTimes(1)
    expect(onExplore).toHaveBeenCalledTimes(1)
    expect(onAddToStory).toHaveBeenCalledTimes(1)
  })
})

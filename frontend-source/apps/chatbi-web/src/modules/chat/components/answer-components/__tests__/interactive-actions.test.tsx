import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addStoryWidget, createStory } from '@/modules/story/api'
import { AnswerSurfaceShell } from '../answer-surface-shell'
import { ChartAnswerComponent } from '../chart-component'
import { KpiAnswerComponent } from '../kpi-component'
import { StorySaveDialog } from '../story-save-dialog'
import { TableAnswerComponent } from '../table-component'

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockChart() {
      return <div data-testid="mock-chart" />
    }
}))

vi.mock('@/modules/story/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/story/api')>()
  return {
    ...actual,
    createStory: vi.fn(),
    addStoryWidget: vi.fn()
  }
})

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
  vi.mocked(createStory).mockReset()
  vi.mocked(addStoryWidget).mockReset()
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
  const candidates = Array.from(container.querySelectorAll('button'))
  const match = candidates.find(button => button.textContent?.trim() === label)
  expect(match).toBeTruthy()
  return match as HTMLButtonElement
}

function buildStructuredPayload() {
  return {
    columns: ['Month', 'Revenue'],
    rows: [
      { Month: '2026-01', Revenue: 1200 },
      { Month: '2026-02', Revenue: 1325 }
    ],
    option: {
      xAxis: { type: 'category', data: ['2026-01', '2026-02'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [1200, 1325] }]
    },
    queryLogId: 'query-log-1',
    traceKey: 'trace-1',
    analysisHandoff: {
      queryLogId: 'query-log-1',
      traceKey: 'trace-1',
      modelId: 'model-1',
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
        dimensions: ['Region'],
        applied: [{ dimension: 'Region', members: ['East'] }]
      },
      explain: {
        enabled: true,
        warnings: ['latest year incomplete'],
        queryLogId: 'query-log-1',
        traceKey: 'trace-1',
        refs: [
          {
            kind: 'query_reference',
            label: 'Revenue trend result',
            queryLogId: 'query-log-1',
            traceKey: 'trace-1',
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

function parseOpenAnalysisHref(container: ParentNode) {
  const link = container.querySelector('[data-testid="answer-surface-open-analysis"]') as HTMLAnchorElement | null
  expect(link).toBeTruthy()
  const href = String(link?.getAttribute('href') ?? '')
  const url = new URL(href, 'https://chatbi.local')
  const draft = JSON.parse(url.searchParams.get('analysisDraft') ?? '{}')
  return { href, url, draft }
}

function getByTestId(container: ParentNode, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  expect(element).toBeTruthy()
  return element as HTMLElement
}

function renderInteractiveSurface(input: {
  type: 'table' | 'chart' | 'kpi'
  payload: ReturnType<typeof buildStructuredPayload> | Record<string, unknown>
  onExplore?: () => void
  onAddToStory?: () => void
}) {
  return (
    <AnswerSurfaceShell
      type={input.type}
      payload={input.payload as any}
      onExplore={input.onExplore}
      onAddToStory={input.onAddToStory}
      renderBody={viewMode => {
        if (viewMode === 'chart') {
          return <ChartAnswerComponent payload={input.payload as Record<string, unknown>} />
        }
        if (viewMode === 'kpi') {
          return <KpiAnswerComponent payload={input.payload as Record<string, unknown>} />
        }
        return <TableAnswerComponent payload={input.payload as Record<string, unknown>} />
      }}
    />
  )
}

function renderStorySaveHarness(input: {
  type: 'table' | 'chart' | 'kpi'
  payload: ReturnType<typeof buildStructuredPayload> | Record<string, unknown>
}) {
  function Harness() {
    const [isOpen, setIsOpen] = React.useState(false)
    return (
      <>
        <AnswerSurfaceShell
          type={input.type}
          payload={input.payload as any}
          onAddToStory={() => setIsOpen(true)}
          renderBody={viewMode => {
            if (viewMode === 'chart') {
              return <ChartAnswerComponent payload={input.payload as Record<string, unknown>} />
            }
            if (viewMode === 'kpi') {
              return <KpiAnswerComponent payload={input.payload as Record<string, unknown>} />
            }
            return <TableAnswerComponent payload={input.payload as Record<string, unknown>} />
          }}
        />
        <StorySaveDialog
          isOpen={isOpen}
          type={input.type}
          payload={input.payload as any}
          onClose={() => setIsOpen(false)}
        />
      </>
    )
  }

  return <Harness />
}

describe('interactive answer component actions', () => {
  it('updates the open-analysis draft with canonical sort top and slicer overrides from the answer surface', async () => {
    const container = await renderIntoDom(
      renderInteractiveSurface({
        type: 'table',
        payload: buildStructuredPayload()
      })
    )

    await act(async () => {
      getButton(container, 'Sort').click()
      await Promise.resolve()
    })

    const sortMetric = container.querySelector('[data-testid="answer-sort-top-metric"]') as HTMLSelectElement | null
    const sortDir = container.querySelector('[data-testid="answer-sort-top-dir"]') as HTMLSelectElement | null
    const topLimit = container.querySelector('[data-testid="answer-sort-top-limit"]') as HTMLInputElement | null
    expect(sortMetric).not.toBeNull()
    expect(sortDir).not.toBeNull()
    expect(topLimit).not.toBeNull()

    await act(async () => {
      if (sortMetric) sortMetric.value = 'Revenue'
      sortMetric?.dispatchEvent(new Event('change', { bubbles: true }))
      if (sortDir) sortDir.value = 'ASC'
      sortDir?.dispatchEvent(new Event('change', { bubbles: true }))
      if (topLimit) topLimit.value = '5'
      topLimit?.dispatchEvent(new Event('input', { bubbles: true }))
      topLimit?.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })

    await act(async () => {
      getButton(container, 'Slicer').click()
      await Promise.resolve()
    })

    const slicerDimension = container.querySelector('[data-testid="answer-slicer-dimension"]') as HTMLSelectElement | null
    const slicerMember = container.querySelector('[data-testid="answer-slicer-member"]') as HTMLInputElement | null
    expect(slicerDimension).not.toBeNull()
    expect(slicerMember).not.toBeNull()

    await act(async () => {
      if (slicerDimension) slicerDimension.value = 'Region'
      slicerDimension?.dispatchEvent(new Event('change', { bubbles: true }))
      if (slicerMember) slicerMember.value = 'West'
      slicerMember?.dispatchEvent(new Event('input', { bubbles: true }))
      slicerMember?.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })

    const opened = parseOpenAnalysisHref(container)
    expect(opened.draft).toEqual({
      prompt: '继续分析当前结果',
      patch: {
        focusDimension: 'Region',
        filters: [
          {
            dimension: 'Region',
            op: 'IN',
            members: ['West']
          }
        ],
        metricCodes: ['Revenue'],
        dimensionCodes: ['Month'],
        analysisShape: 'trend',
        preferredShape: 'chart',
        sort: {
          by: 'Revenue',
          dir: 'ASC'
        },
        topN: 5
      },
      analysisAction: 'open_analysis',
      baseQueryLogId: 'query-log-1'
    })
  })

  it('table answers render through the shared surface shell and preserve stateful controls', async () => {
    const onExplore = vi.fn()
    const onAddToStory = vi.fn()

    const container = await renderIntoDom(
      renderInteractiveSurface({
        type: 'table',
        payload: buildStructuredPayload(),
        onExplore,
        onAddToStory
      })
    )

    expect(container.querySelector('[data-testid="answer-surface-body-table"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-query-log-id"]')?.textContent).toContain('query-log-1')
    expect(container.querySelector('[data-testid="answer-surface-trace-key"]')?.textContent).toContain('trace-1')

    const opened = parseOpenAnalysisHref(container)
    expect(opened.url.searchParams.get('queryLogId')).toBe('query-log-1')
    expect(opened.url.searchParams.get('traceKey')).toBe('trace-1')
    expect(opened.draft).toEqual({
      prompt: '继续分析当前结果',
      patch: {
        focusDimension: 'Month',
        filters: [{ dimension: 'Region', members: ['East'] }],
        metricCodes: ['Revenue'],
        dimensionCodes: ['Month'],
        analysisShape: 'trend',
        preferredShape: 'chart'
      },
      analysisAction: 'open_analysis',
      baseQueryLogId: 'query-log-1'
    })

    await act(async () => {
      getButton(container, 'Sort').click()
      getButton(container, 'Chart').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')
    expect(container.querySelector('[data-testid="answer-surface-body-chart"]')).toBeTruthy()

    await act(async () => {
      getButton(container, 'Explore').click()
      getButton(container, 'Add to Story').click()
      getButton(container, 'Fullscreen').click()
      await Promise.resolve()
    })

    expect(onExplore).toHaveBeenCalledTimes(1)
    expect(onAddToStory).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"]')).toBeTruthy()

    await act(async () => {
      getButton(container, 'Close').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-surface-fullscreen-dialog"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="answer-sort-top-panel"]')?.textContent).toContain('Revenue')
  })

  it('renders evidence and provenance deep links inside the explain drawer', async () => {
    const container = await renderIntoDom(
      renderInteractiveSurface({
        type: 'table',
        payload: buildStructuredPayload()
      })
    )

    await act(async () => {
      getButton(container, 'Explain').click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-evidence-drawer').textContent).toContain('Revenue trend result')
    expect(getByTestId(container, 'answer-evidence-query-log-id').textContent).toContain('query-log-1')
    expect(getByTestId(container, 'answer-evidence-trace-key').textContent).toContain('trace-1')
    expect(getByTestId(container, 'answer-evidence-warning-0').textContent).toContain('latest year incomplete')
    expect(getByTestId(container, 'answer-evidence-ref-0').textContent).toContain('query_reference')
    expect(getByTestId(container, 'answer-evidence-ref-0').textContent).toContain('warningCount')

    const analysisLink = getByTestId(container, 'answer-evidence-open-analysis') as HTMLAnchorElement
    const analysisUrl = new URL(String(analysisLink.getAttribute('href')), 'https://chatbi.local')
    expect(analysisUrl.pathname).toBe('/chat')
    expect(analysisUrl.hash).toBe('#analysis')
    expect(analysisUrl.searchParams.get('queryLogId')).toBe('query-log-1')
    expect(analysisUrl.searchParams.get('traceKey')).toBe('trace-1')

    const traceLink = getByTestId(container, 'answer-evidence-open-trace') as HTMLAnchorElement
    expect(traceLink.getAttribute('href')).toBe('/ops/traces/trace-1')
  })

  it('opens an Add to Story dialog and persists the current answer payload through story APIs', async () => {
    vi.mocked(createStory).mockResolvedValue({
      story: {
        id: 'story-1',
        modelId: 'model-1',
        title: 'Revenue trend',
        status: 'draft',
        latestVersion: 1,
        items: []
      },
      feedEventId: 'feed-1'
    })
    vi.mocked(addStoryWidget).mockResolvedValue({
      id: 'widget-1',
      storyId: 'story-1',
      widgetKey: 'chat-answer-table',
      widgetType: 'table',
      title: 'Revenue trend',
      payload: buildStructuredPayload(),
      layout: { x: 0, y: 0, w: 6, h: 4 },
      sortOrder: 0,
      status: 'active'
    })

    const container = await renderIntoDom(
      renderStorySaveHarness({
        type: 'table',
        payload: buildStructuredPayload()
      })
    )

    await act(async () => {
      getButton(container, 'Add to Story').click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-story-save-dialog')).toBeTruthy()
    expect((getByTestId(container, 'answer-story-save-title') as HTMLInputElement).value).toBe('Revenue trend')
    expect((getByTestId(container, 'answer-story-save-widget-title') as HTMLInputElement).value).toBe('Revenue trend')

    await act(async () => {
      ;(getByTestId(container, 'answer-story-save-summary') as HTMLInputElement).value = 'saved from chat'
      getByTestId(container, 'answer-story-save-summary').dispatchEvent(new Event('input', { bubbles: true }))
      getByTestId(container, 'answer-story-save-summary').dispatchEvent(new Event('change', { bubbles: true }))
      getButton(container, 'Save to Story').click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(createStory).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'model-1',
        title: 'Revenue trend',
        metadata: {
          source: 'chat_answer_surface',
          queryLogId: 'query-log-1',
          traceKey: 'trace-1'
        },
        traceKey: 'trace-1'
      })
    )
    expect(addStoryWidget).toHaveBeenCalledWith(
      'story-1',
      expect.objectContaining({
        widgetType: 'table',
        title: 'Revenue trend',
        widgetKey: 'chat-answer-table',
        payload: expect.objectContaining({
          queryLogId: 'query-log-1',
          traceKey: 'trace-1',
          interaction: expect.objectContaining({
            story: expect.objectContaining({
              enabled: true,
              widgetType: 'table'
            })
          })
        })
      })
    )
    expect(getByTestId(container, 'answer-story-save-status').textContent).toContain('Story saved')
    expect((getByTestId(container, 'answer-story-save-open-story') as HTMLAnchorElement).getAttribute('href')).toBe(
      '/project/story-1/designer'
    )
  })

  it('chart answers reuse the same shell and can switch back to the table body', async () => {
    const payload = buildStructuredPayload()
    const container = await renderIntoDom(
      renderInteractiveSurface({
        type: 'chart',
        payload: {
          ...payload,
          interaction: {
            ...payload.interaction,
            defaultView: 'chart',
            story: {
              ...payload.interaction.story,
              widgetType: 'chart'
            }
          }
        }
      })
    )

    expect(container.querySelector('[data-testid="answer-surface-body-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-view-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-view-table"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="mock-chart"]')).toBeTruthy()

    await act(async () => {
      getButton(container, 'Table').click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="answer-surface-body-table"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-open-analysis"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-explain"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-fullscreen"]')).toBeTruthy()
  })

  it('kpi answers keep the shared toolbar while staying on a single kpi view', async () => {
    const container = await renderIntoDom(
      renderInteractiveSurface({
        type: 'kpi',
        payload: {
          queryLogId: 'query-log-kpi-1',
          traceKey: 'trace-kpi-1',
          value: 18.6,
          formatted: '18.6%',
          label: 'Profit Rate',
          analysisHandoff: {
            queryLogId: 'query-log-kpi-1',
            traceKey: 'trace-kpi-1',
            metricCodes: ['ProfitRate'],
            dimensionCodes: ['Month'],
            appliedFilters: []
          },
          interaction: {
            availableViews: ['kpi'],
            defaultView: 'kpi',
            explain: {
              enabled: true,
              queryLogId: 'query-log-kpi-1',
              traceKey: 'trace-kpi-1',
              warnings: []
            },
            fullscreen: {
              enabled: true,
              title: 'Profit Rate'
            }
          }
        }
      })
    )

    expect(container.querySelector('[data-testid="answer-surface-body-kpi"]')?.textContent).toContain('18.6%')
    expect(container.querySelector('[data-testid="answer-surface-view-kpi"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-view-table"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="answer-surface-open-analysis"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-explain"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="answer-surface-fullscreen"]')).toBeTruthy()
  })
})

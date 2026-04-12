// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AnswerComponentPayload } from '@/modules/chat/components/answer-components/types'

const { createStoryMock, addStoryWidgetMock } = vi.hoisted(() => ({
  createStoryMock: vi.fn(),
  addStoryWidgetMock: vi.fn()
}))

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
    createStory: createStoryMock,
    addStoryWidget: addStoryWidgetMock
  }
})

vi.mock('@/modules/chat/components/answer-components/chart-component', async importOriginal => {
  const actual = await importOriginal<typeof import('@/modules/chat/components/answer-components/chart-component')>()
  return {
    ...actual,
    ChartAnswerComponent: function MockChartAnswerComponent(props: {
      slicersChange?: (slicers: Array<Record<string, unknown>>) => void
      slicersChanging?: (slicers: Array<Record<string, unknown>>) => void
    }) {
      return (
        <div data-testid="mock-chart-answer-component">
          <button
            type="button"
            onClick={() => {
              const slicers = [
                {
                  dimension: {
                    dimension: 'Region'
                  },
                  members: [
                    {
                      value: 'West',
                      label: 'West',
                      caption: 'West'
                    }
                  ]
                }
              ]
              props.slicersChange?.(slicers)
              props.slicersChanging?.(slicers)
            }}
          >
            Emit linked analysis
          </button>
        </div>
      )
    }
  }
})

import { AnalysisComponentCardV2 } from '../analysis-component-card-v2'

type MountedRoot = {
  container: HTMLDivElement
  root: Root
}

const mountedRoots: MountedRoot[] = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }
  vi.restoreAllMocks()
  createStoryMock.mockReset()
  addStoryWidgetMock.mockReset()
})

async function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(element)
    await Promise.resolve()
  })

  return container
}

function getByTestId(container: ParentNode, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  expect(element).toBeTruthy()
  return element as HTMLElement
}

function getButton(container: ParentNode, label: string) {
  const candidates = Array.from(container.querySelectorAll('button, a'))
  const match = candidates.find(button => button.textContent?.trim() === label)
  expect(match).toBeTruthy()
  return match as HTMLButtonElement | HTMLAnchorElement
}

function getButtonWithin(container: ParentNode, label: string) {
  return getButton(container, label)
}

function buildPayload(): AnswerComponentPayload {
  return {
    label: 'Revenue trend',
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
            traceKey: 'trace-1'
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

describe('AnalysisComponentCardV2', () => {
  it('renders xpert-style analysis actions and opens evidence and story flows', async () => {
    createStoryMock.mockResolvedValue({
      story: {
        id: 'story-1',
        modelId: 'model-1',
        title: 'Revenue trend',
        status: 'draft',
        latestVersion: 1,
        items: []
      }
    })
    addStoryWidgetMock.mockResolvedValue({
      id: 'widget-1',
      storyId: 'story-1',
      widgetKey: 'chat-answer-table',
      widgetType: 'table',
      payload: {},
      layout: {},
      sortOrder: 0,
      status: 'active'
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const onApplyPrompt = vi.fn()
    const container = await renderIntoDom(
      <AnalysisComponentCardV2 type="table" payload={buildPayload()} onApplyPrompt={onApplyPrompt} />
    )

    expect(getByTestId(container, 'answer-surface-toolbar')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-toolbar').className).toContain('onyx-donor-answer-surface-toolbar')
    expect(getByTestId(container, 'answer-surface-toolbar-shell')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-toolbar-shell').className).toContain('onyx-donor-answer-surface-toolbar-shell')
    expect(getByTestId(container, 'answer-surface-toolbar-row')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-toolbar-row').className).toContain('onyx-donor-answer-surface-toolbar-row')
    expect(getByTestId(container, 'answer-surface-view-table').className).toContain('onyx-donor-answer-surface-action-chip')
    expect(getByTestId(container, 'answer-surface-view-table').className).toContain('onyx-donor-answer-surface-action-chip-view')
    expect(getByTestId(container, 'answer-surface-sort').className).toContain('onyx-donor-answer-surface-action-chip')
    expect(getByTestId(container, 'answer-surface-sort').className).toContain('onyx-donor-answer-surface-action-chip-panel')
    expect(getByTestId(container, 'answer-surface-open-explorer').className).toContain('onyx-donor-answer-surface-action-chip-link')
    expect(getByTestId(container, 'answer-surface-explore').className).toContain('onyx-donor-answer-surface-action-chip-utility')
    expect(getByTestId(container, 'answer-surface-body-table')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-body-table').className).toContain('onyx-donor-answer-surface-body')
    expect(getByTestId(container, 'answer-surface-body-table').className).toContain('onyx-donor-answer-surface-body-table')
    expect(getByTestId(container, 'answer-surface-body-shell')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-body-shell').className).toContain('onyx-donor-answer-surface-body-shell')
    expect(getByTestId(container, 'analysis-component-card-v2-shell')).toBeTruthy()
    expect(getByTestId(container, 'analysis-component-card-v2-shell').className).toContain('onyx-native-donor-analysis-card-shell')
    expect(getByTestId(container, 'answer-surface-shell-card')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-shell-card').className).toContain('onyx-native-donor-answer-surface-card')
    expect(getByTestId(container, 'answer-surface-shell-stack')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-shell-stack').className).toContain('onyx-native-donor-answer-surface-stack')
    expect(getByTestId(container, 'answer-surface-meta')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-meta').className).toContain('onyx-donor-answer-surface-meta')
    expect(getByTestId(container, 'answer-surface-meta-shell')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-meta-shell').className).toContain('onyx-donor-answer-surface-meta-shell')
    expect(getByTestId(container, 'answer-surface-query-log-id').className).toContain('onyx-donor-answer-surface-meta-chip')
    expect(getByTestId(container, 'answer-surface-trace-key').className).toContain('onyx-donor-answer-surface-meta-chip')
    expect(getByTestId(container, 'answer-surface-query-log-id-label').className).toContain('onyx-donor-answer-surface-meta-label')
    expect(getByTestId(container, 'answer-surface-query-log-id-value').className).toContain('onyx-donor-answer-surface-meta-value')
    expect(getByTestId(container, 'answer-surface-trace-key-label').className).toContain('onyx-donor-answer-surface-meta-label')
    expect(getByTestId(container, 'answer-surface-trace-key-value').className).toContain('onyx-donor-answer-surface-meta-value')
    expect(getByTestId(container, 'answer-surface-query-log-id').textContent).toContain('query-log-1')
    expect(getByTestId(container, 'answer-surface-trace-key').textContent).toContain('trace-1')
    expect(getByTestId(container, 'analysis-component-card-v2-header')).toBeTruthy()
    expect(getByTestId(container, 'analysis-component-card-v2-header').className).toContain('onyx-donor-analysis-card-shell')
    expect(container.querySelector('.onyx-donor-answer-surface')).toBeTruthy()
    expect(getByTestId(container, 'analysis-component-card-v2-title').textContent).toBe('Revenue trend')
    expect(getByTestId(container, 'analysis-component-card-v2-surface-kind').textContent).toContain('表格分析')
    expect(getByTestId(container, 'analysis-component-card-v2-context').textContent).toContain('Finance')
    expect(getByTestId(container, 'analysis-component-card-v2-context').textContent).toContain('Revenue')
    expect(getByTestId(container, 'analysis-component-card-v2-context').textContent).toContain('Month')

    expect(getButton(container, '表格')).toBeTruthy()
    expect(getButton(container, '图表')).toBeTruthy()
    expect(getButton(container, '排序')).toBeTruthy()
    expect(getButton(container, '前 N')).toBeTruthy()
    expect(getButton(container, '筛选')).toBeTruthy()
    expect(getButton(container, '解释')).toBeTruthy()
    expect(getButton(container, '打开探索器')).toBeTruthy()
    expect(getButton(container, '打开分析')).toBeTruthy()
    expect(getButton(container, '探索')).toBeTruthy()
    expect(getButton(container, '打开画布')).toBeTruthy()
    expect(getButton(container, '加入故事')).toBeTruthy()
    expect(getButton(container, '全屏')).toBeTruthy()

    await act(async () => {
      ;(getButton(container, '打开探索器') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'analysis-explorer-dialog-v2')).toBeTruthy()
    const explorerShell = getByTestId(container, 'analysis-explorer-shell-v2')
    const explorerDialog = getByTestId(container, 'analysis-explorer-dialog-v2')
    expect(explorerDialog.className).toContain('onyx-donor-answer-surface-dialog')
    expect(explorerShell.textContent).toContain('打开分析')
    expect(explorerShell.textContent).toContain('打开画布')
    expect(explorerShell.textContent).toContain('加入故事')
    expect(explorerDialog.textContent).toContain('应用到卡片')
    expect(explorerDialog.textContent).toContain('重置更改')

    await act(async () => {
      ;(getButtonWithin(explorerShell, '解释') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(explorerShell, 'answer-evidence-drawer').className).toContain('onyx-donor-answer-panel')
    expect(getByTestId(explorerShell, 'answer-evidence-drawer').textContent).toContain('Revenue trend result')

    await act(async () => {
      ;(getButton(container, '关闭探索器') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="analysis-explorer-dialog-v2"]')).toBeNull()

    await act(async () => {
      ;(getButton(container, '打开探索器') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    const explorerApplyShell = getByTestId(container, 'analysis-explorer-shell-v2')

    await act(async () => {
      ;(getButtonWithin(explorerApplyShell, '前 N') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(explorerApplyShell, 'answer-sort-top-panel').className).toContain('onyx-donor-answer-panel')
    expect((getByTestId(explorerApplyShell, 'answer-sort-top-metric') as HTMLSelectElement).className).toContain('onyx-donor-answer-panel-control')
    expect((getByTestId(explorerApplyShell, 'answer-sort-top-dir') as HTMLSelectElement).className).toContain('onyx-donor-answer-panel-control')
    expect((getByTestId(explorerApplyShell, 'answer-sort-top-limit') as HTMLInputElement).className).toContain('onyx-donor-answer-panel-control')

    await act(async () => {
      ;(getButtonWithin(explorerApplyShell, '前 5') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(getButton(container, '应用到卡片') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'analysis-component-card-v2-draft-summary').textContent).toContain('前 5')
    expect(container.querySelector('[data-testid="analysis-explorer-dialog-v2"]')).toBeNull()

    await act(async () => {
      ;(getButton(container, '打开探索器') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    const reopenedExplorerShell = getByTestId(container, 'analysis-explorer-shell-v2')

    await act(async () => {
      ;(getButtonWithin(reopenedExplorerShell, '前 N') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(getButtonWithin(reopenedExplorerShell, '前 20') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(getButton(container, '重置更改') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(getButton(container, '应用到卡片') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'analysis-component-card-v2-draft-summary').textContent).toContain('前 5')
    expect(getByTestId(container, 'analysis-component-card-v2-draft-summary').textContent).not.toContain('前 20')

    await act(async () => {
      ;(getButton(container, '筛选') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-slicer-panel').className).toContain('onyx-donor-answer-panel')
    expect((getByTestId(container, 'answer-slicer-dimension') as HTMLSelectElement).className).toContain('onyx-donor-answer-panel-control')
    expect((getByTestId(container, 'answer-slicer-member') as HTMLInputElement).className).toContain('onyx-donor-answer-panel-control')

    await act(async () => {
      ;(getButton(container, '解释') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-evidence-drawer').className).toContain('onyx-donor-answer-panel')
    expect(getByTestId(container, 'answer-evidence-drawer').textContent).toContain('Revenue trend result')
    expect(getByTestId(container, 'answer-evidence-open-trace').getAttribute('href')).toBe('/ops/traces/trace-1')

    await act(async () => {
      ;(getButton(container, '图表') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-surface-body-chart')).toBeTruthy()
    expect(getByTestId(container, 'answer-surface-body-chart').className).toContain('onyx-donor-answer-surface-body-chart')

    await act(async () => {
      ;(getButton(container, '探索') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(onApplyPrompt).toHaveBeenCalledWith('请继续探索当前结果，并优先从新的维度、异常点或趋势变化展开。')

    await act(async () => {
      ;(getButton(container, '打开画布') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(createStoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'model-1',
        title: 'Revenue trend 画布'
      })
    )
    expect(addStoryWidgetMock).toHaveBeenCalledWith(
      'story-1',
      expect.objectContaining({
        widgetType: 'table'
      })
    )
    expect(openSpy).toHaveBeenCalledWith('/project/story-1/designer', '_blank', 'noopener,noreferrer')

    await act(async () => {
      ;(getButton(container, '加入故事') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-story-save-dialog')).toBeTruthy()
    expect(getByTestId(container, 'answer-story-save-dialog').className).toContain('onyx-donor-answer-surface-dialog')
    expect(container.querySelector('.onyx-donor-story-save-form')).toBeTruthy()
    expect(container.querySelectorAll('.onyx-donor-story-save-label').length).toBe(3)
    expect(container.querySelector('.onyx-donor-story-save-actions')).toBeTruthy()
    expect((getByTestId(container, 'answer-story-save-title') as HTMLInputElement).className).toContain('onyx-donor-story-save-input')
    expect((getByTestId(container, 'answer-story-save-summary') as HTMLInputElement).className).toContain('onyx-donor-story-save-input')
    expect((getByTestId(container, 'answer-story-save-widget-title') as HTMLInputElement).className).toContain('onyx-donor-story-save-input')
    expect((getByTestId(container, 'answer-story-save-title') as HTMLInputElement).value).toBe('Revenue trend')

    await act(async () => {
      ;(getByTestId(container, 'answer-story-save-submit') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'answer-story-save-status').className).toContain('onyx-donor-story-save-status')
    expect(getByTestId(container, 'answer-story-save-open-story').className).toContain('onyx-donor-answer-surface-action')
  })

  it('projects chart linked-analysis slicers into the card draft patch and open-analysis href', async () => {
    const payload = buildPayload()
    payload.analysisHandoff = {
      ...(payload.analysisHandoff ?? {}),
      appliedFilters: []
    }
    payload.interaction = {
      ...(payload.interaction ?? {}),
      availableViews: ['chart'],
      defaultView: 'chart',
      slicers: {
        enabled: true,
        dimensions: ['Region'],
        applied: []
      }
    }

    const container = await renderIntoDom(<AnalysisComponentCardV2 type="chart" payload={payload} />)

    expect(container.querySelector('[data-testid="analysis-component-card-v2-draft-summary"]')).toBeNull()
    expect(getByTestId(container, 'mock-chart-answer-component')).toBeTruthy()

    await act(async () => {
      ;(getButton(container, 'Emit linked analysis') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(getByTestId(container, 'analysis-component-card-v2-draft-summary').textContent).toContain('Region: West')

    const openAnalysis = getByTestId(container, 'answer-surface-open-analysis') as HTMLAnchorElement
    const href = openAnalysis.getAttribute('href')
    expect(href).toBeTruthy()

    const url = new URL(href ?? '', 'http://localhost')
    const draft = JSON.parse(url.searchParams.get('analysisDraft') ?? '{}') as {
      patch?: {
        focusDimension?: string
        filters?: Array<Record<string, unknown>>
      }
    }

    expect(draft.patch).toMatchObject({
      focusDimension: 'Region',
      filters: [
        {
          dimension: 'Region',
          op: 'IN',
          members: ['West']
        }
      ]
    })
  })
})

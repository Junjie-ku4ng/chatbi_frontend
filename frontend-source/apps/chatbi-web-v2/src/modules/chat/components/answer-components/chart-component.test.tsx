// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { renderOptionSpy, renderAnalyticalCardSpy } = vi.hoisted(() => ({
  renderOptionSpy: vi.fn(),
  renderAnalyticalCardSpy: vi.fn()
}))

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockECharts(props: { option: Record<string, unknown> }) {
      renderOptionSpy(props.option)
      return <div data-testid="mock-echarts" />
    }
}))

vi.mock('./react-analytical-card', () => ({
  ReactAnalyticalCard: function MockReactAnalyticalCard(props: Record<string, unknown>) {
    renderAnalyticalCardSpy(props)
    return <div data-testid="mock-react-analytical-card" />
  }
}))

import { ChartAnswerComponent } from './chart-component'
import {
  clearDefaultAnalyticalCardServiceFactory,
  registerDefaultAnalyticalCardServiceFactory,
  type AnalyticalCardServiceLike
} from './create-analytical-card-service'

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
  renderOptionSpy.mockReset()
  renderAnalyticalCardSpy.mockReset()
  clearDefaultAnalyticalCardServiceFactory()
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

describe('ChartAnswerComponent', () => {
  it('uses the nested echarts option when the payload option contains an analytical card envelope', async () => {
    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          option: {
            kind: 'line',
            title: '按月份看收入趋势',
            rows: [{ member_0: '2025-01', SoldUnits: 198761 }],
            series: [{ x: '2025-01', y: 198761 }],
            option: {
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: ['2025-01'] },
              yAxis: { type: 'value' },
              series: [{ type: 'line', data: [198761] }]
            }
          }
        }}
      />
    )

    expect(renderOptionSpy).toHaveBeenCalledTimes(1)
    expect(renderOptionSpy.mock.calls[0]?.[0]).toMatchObject({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['2025-01'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [198761] }]
    })
  })

  it('normalizes string title fields in echarts options into object form', async () => {
    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          option: {
            title: '按月份看收入趋势',
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: ['2025-01'] },
            yAxis: { type: 'value' },
            series: [{ type: 'line', data: [198761] }]
          }
        }}
      />
    )

    expect(renderOptionSpy).toHaveBeenCalledTimes(1)
    expect(renderOptionSpy.mock.calls[0]?.[0]).toMatchObject({
      title: {
        text: '按月份看收入趋势'
      },
      xAxis: { type: 'category', data: ['2025-01'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [198761] }]
    })
  })

  it('delegates xpert-style analytical card payloads to the transplanted ReactAnalyticalCard host', async () => {
    const container = await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          }
        }}
      />
    )

    expect(container.querySelector('[data-testid="mock-react-analytical-card"]')).not.toBeNull()
    expect(renderAnalyticalCardSpy).toHaveBeenCalledTimes(1)
    expect(renderOptionSpy).not.toHaveBeenCalled()
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      title: '按月份看收入趋势',
      chartSettings: expect.objectContaining({
        locale: 'zh-Hans'
      }),
      dataSettings: expect.objectContaining({
        dataSource: 'model-1'
      }),
      rows: [
        expect.objectContaining({
          Sales: 198761
        })
      ]
    })
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).not.toHaveProperty('payload')
  })

  it('adapts payload slicer interaction into options.showSlicers for the transplanted ReactAnalyticalCard host', async () => {
    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Region]']
            }
          }
        }}
      />
    )

    expect(renderAnalyticalCardSpy).toHaveBeenCalledTimes(1)
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      options: {
        showSlicers: true
      }
    })
  })

  it('forwards analytical card interaction callbacks to the transplanted ReactAnalyticalCard host', async () => {
    const slicersChange = vi.fn()
    const slicersChanging = vi.fn()
    const chartClick = vi.fn()
    const chartHighlight = vi.fn()
    const chartContextMenu = vi.fn()
    const explain = vi.fn()

    await renderIntoDom(
      <ChartAnswerComponent
        chartClick={chartClick}
        chartContextMenu={chartContextMenu}
        chartHighlight={chartHighlight}
        explain={explain}
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          }
        }}
        slicersChange={slicersChange}
        slicersChanging={slicersChanging}
      />
    )

    expect(renderAnalyticalCardSpy).toHaveBeenCalledTimes(1)
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      chartClick,
      chartContextMenu,
      chartHighlight,
      explain,
      slicersChange,
      slicersChanging
    })
  })

  it('uses a registered default analytical-card service factory when rich payload omits explicit service', async () => {
    const defaultService = {
      dataSettings: undefined,
      getEntityType: vi.fn(),
      onAfterServiceInit: vi.fn(),
      refresh: vi.fn(),
      selectResult: vi.fn()
    } satisfies AnalyticalCardServiceLike
    const factory = vi.fn(() => defaultService)
    registerDefaultAnalyticalCardServiceFactory(factory)

    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          }
        }}
      />
    )

    expect(factory).toHaveBeenCalledTimes(1)
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      service: defaultService
    })
  })

  it('re-resolves the default analytical-card service when the runtime factory registers after mount', async () => {
    const defaultService = {
      dataSettings: undefined,
      getEntityType: vi.fn(),
      onAfterServiceInit: vi.fn(),
      refresh: vi.fn(),
      selectResult: vi.fn()
    } satisfies AnalyticalCardServiceLike
    const factory = vi.fn(() => defaultService)

    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          }
        }}
      />
    )

    expect(renderAnalyticalCardSpy).toHaveBeenCalledTimes(1)
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      service: undefined
    })

    await act(async () => {
      registerDefaultAnalyticalCardServiceFactory(factory)
      await Promise.resolve()
    })

    expect(factory).toHaveBeenCalledTimes(1)
    expect(renderAnalyticalCardSpy).toHaveBeenCalledTimes(2)
    expect(renderAnalyticalCardSpy.mock.calls[1]?.[0]).toMatchObject({
      service: defaultService
    })
  })

  it('prefers an explicit analytical-card service over the registered default factory', async () => {
    const defaultService = {
      dataSettings: undefined,
      getEntityType: vi.fn(),
      onAfterServiceInit: vi.fn(),
      refresh: vi.fn(),
      selectResult: vi.fn()
    } satisfies AnalyticalCardServiceLike
    const explicitService = {
      dataSettings: undefined,
      getEntityType: vi.fn(),
      onAfterServiceInit: vi.fn(),
      refresh: vi.fn(),
      selectResult: vi.fn()
    } satisfies AnalyticalCardServiceLike
    const factory = vi.fn(() => defaultService)
    registerDefaultAnalyticalCardServiceFactory(factory)

    await renderIntoDom(
      <ChartAnswerComponent
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-01]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
              Sales: 198761
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            chartAnnotation: {
              chartType: { type: 'Line', name: 'Line' },
              dimensions: [
                {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            chartTypes: [{ type: 'Line', name: 'Line' }],
            locale: 'zh-Hans'
          }
        }}
        service={explicitService}
      />
    )

    expect(factory).not.toHaveBeenCalled()
    expect(renderAnalyticalCardSpy.mock.calls[0]?.[0]).toMatchObject({
      service: explicitService
    })
  })
})

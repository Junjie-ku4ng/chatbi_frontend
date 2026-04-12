// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BehaviorSubject, Subject, of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AgentType,
  AggregationRole,
  C_MEASURES,
  ChartBusinessService,
  CubeParameterEnum,
  DSCoreService,
  MockAgent,
  MockDataSource,
  Syntax,
  VariableSelectionType
} from '@metad/ocap-core'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'

const {
  chartOptions$,
  chartContextMenu$,
  dispatchActionSpy,
  emitChartOptions,
  engineInstances,
  fakeEchartsInstance,
  renderOptionSpy,
  resetChartOptions,
  selectChanged$
} = vi.hoisted(() => {
  const chartOptions$ = (() => {
    const observers = new Set<(value: Record<string, unknown>) => void>()
    let currentValue: Record<string, unknown> = {
      options: {
        tooltip: { trigger: 'axis' },
        series: [{ type: 'line', data: [198761] }]
      }
    }

    return {
      asObservable() {
        return {
          subscribe(observer: (value: Record<string, unknown>) => void) {
            observers.add(observer)
            observer(currentValue)
            return {
              unsubscribe() {
                observers.delete(observer)
              }
            }
          }
        }
      },
      next(value: Record<string, unknown>) {
        currentValue = value
        observers.forEach(observer => observer(currentValue))
      }
    }
  })()

  return {
    chartOptions$,
  chartContextMenu$: (() => {
    const observers = new Set<(value: Record<string, unknown>) => void>()
    return {
      next(value: Record<string, unknown>) {
        observers.forEach(observer => observer(value))
      },
      subscribe(observer: (value: Record<string, unknown>) => void) {
        observers.add(observer)
        return {
          unsubscribe() {
            observers.delete(observer)
          }
        }
      }
    }
  })(),
  dispatchActionSpy: vi.fn(),
  emitChartOptions(value: Record<string, unknown>) {
    chartOptions$.next(value)
  },
  engineInstances: [] as Array<Record<string, unknown>>,
  fakeEchartsInstance: {
    dispose: vi.fn(),
    getDataURL: vi.fn(() => 'data:image/png;base64,mock')
  },
  renderOptionSpy: vi.fn(),
  resetChartOptions() {
    chartOptions$.next({
      options: {
        tooltip: { trigger: 'axis' },
        series: [{ type: 'line', data: [198761] }]
      }
    })
  },
  selectChanged$: (() => {
    const observers = new Set<(value: Record<string, unknown>) => void>()
    return {
      next(value: Record<string, unknown>) {
        observers.forEach(observer => observer(value))
      },
      subscribe(observer: (value: Record<string, unknown>) => void) {
        observers.add(observer)
        return {
          unsubscribe() {
            observers.delete(observer)
          }
        }
      }
    }
  })()
}
})

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockECharts(props: {
      option: Record<string, unknown>
      onChartReady?: (instance: unknown) => void
    }) {
      renderOptionSpy(props.option)
      props.onChartReady?.(fakeEchartsInstance)
      return <div data-testid="mock-echarts-runtime" />
    }
}))

vi.mock('@metad/ocap-echarts', async () => {
  class MockSmartEChartEngine {
    chartContextMenu$ = chartContextMenu$
    data: unknown = null
    chartAnnotation: unknown = null
    chartClick$ = new Subject().asObservable()
    chartHighlight$ = new Subject().asObservable()
    dispatchAction = dispatchActionSpy
    settings: unknown = null
    selectChanged$ = selectChanged$
    options: unknown = null
    entityType: unknown = null
    echarts: unknown = null

    constructor() {
      engineInstances.push(this as unknown as Record<string, unknown>)
    }

    selectChartOptions() {
      return chartOptions$.asObservable()
    }

    onDestroy() {}
  }

  return {
    SmartEChartEngine: MockSmartEChartEngine
  }
})

import { ReactAnalyticalCard } from './react-analytical-card'

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
  engineInstances.length = 0
  resetChartOptions()
  renderOptionSpy.mockReset()
  fakeEchartsInstance.dispose.mockReset()
  fakeEchartsInstance.getDataURL.mockReset()
  dispatchActionSpy.mockReset()
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

async function waitForAsyncWork(time = 250) {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, time))
  })
}

describe('ReactAnalyticalCard', () => {
  it('hydrates the transplanted SmartEChartEngine from xpert-native props without a payload envelope', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        chartOptions={{
          tooltip: { trigger: 'axis' }
        }}
        chartSettings={{
          chartTypes: [{ type: 'Line', name: 'Line' }],
          locale: 'zh-Hans'
        }}
        dataSettings={{
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
        }}
        interaction={{
          slicers: {
            enabled: true,
            dimensions: ['[Region]']
          }
        }}
        rows={[
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-01]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
            Sales: 198761
          }
        ]}
        title="按月份看收入趋势"
      />
    )

    expect(container.querySelector('[data-testid="mock-echarts-runtime"]')).not.toBeNull()
    expect(engineInstances).toHaveLength(1)
    expect(engineInstances[0]).toMatchObject({
      chartAnnotation: expect.objectContaining({
        chartType: expect.objectContaining({
          type: 'Line'
        })
      }),
      data: expect.objectContaining({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-01]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
            Sales: 198761
          }
        ]
      }),
      options: expect.objectContaining({
        tooltip: { trigger: 'axis' }
      }),
      settings: expect.objectContaining({
        locale: 'zh-Hans'
      })
    })
    expect(container.querySelector('[data-testid="react-analytical-card-title"]')?.textContent).toContain(
      '按月份看收入趋势'
    )
  })

  it('hydrates the transplanted SmartEChartEngine with xpert-style payload inputs', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        initialState={{
          slicers: [
            {
              dimension: {
                dimension: '[Region]',
                hierarchy: '[Region]'
              },
              members: [
                {
                  key: 'East',
                  value: 'East',
                  label: 'East'
                }
              ]
            }
          ],
          drilledDimensions: [
            {
              parent: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[month]'
              },
              dimension: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[day]'
              },
              slicer: {
                dimension: {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                },
                members: [
                  {
                    key: '[2025].[1].[2025-01]',
                    value: '[2025].[1].[2025-01]',
                    label: '2025-01'
                  }
                ]
              },
              active: true
            }
          ],
          selectedDrilledDimensions: [
            {
              parent: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[month]'
              },
              dimension: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[day]'
              },
              slicer: {
                dimension: {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                },
                members: [
                  {
                    key: '[2025].[1].[2025-01]',
                    value: '[2025].[1].[2025-01]',
                    label: '2025-01'
                  }
                ]
              },
              active: true
            }
          ]
        }}
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
            locale: 'zh-Hans',
            chartTypes: [
              { type: 'Line', name: 'Line' },
              { type: 'Bar', name: 'Bar' }
            ]
          },
          option: {
            backgroundColor: 'transparent'
          }
        }}
      />
    )

    expect(container.textContent).toContain('按月份看收入趋势')
    expect(container.textContent).toContain('Line')
    expect(container.querySelector('[data-testid="mock-echarts-runtime"]')).not.toBeNull()
    expect(renderOptionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: { trigger: 'axis' },
        series: [{ type: 'line', data: [198761] }]
      })
    )

    expect(engineInstances).toHaveLength(1)
    expect(engineInstances[0]).toMatchObject({
      data: {
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-01]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
            Sales: 198761
          }
        ]
      },
      chartAnnotation: {
        chartType: { type: 'Line', name: 'Line' }
      },
      settings: {
        locale: 'zh-Hans'
      },
      options: {
        backgroundColor: 'transparent'
      },
      echarts: fakeEchartsInstance
    })
  })

  it('renders slicer affordance and breadcrumb region when drilled state exists', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        initialState={{
          slicers: [
            {
              dimension: {
                dimension: '[Region]',
                hierarchy: '[Region]'
              },
              members: [
                {
                  key: 'East',
                  value: 'East',
                  label: 'East'
                }
              ]
            }
          ],
          drilledDimensions: [
            {
              parent: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[month]'
              },
              dimension: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[day]'
              },
              slicer: {
                dimension: {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                },
                members: [
                  {
                    key: '[2025].[1].[2025-01]',
                    value: '[2025].[1].[2025-01]',
                    label: '2025-01'
                  }
                ]
              },
              active: true
            }
          ],
          selectedDrilledDimensions: [
            {
              parent: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[month]'
              },
              dimension: {
                dimension: '[Time Calendar]',
                hierarchy: '[Time Calendar]',
                level: '[Time Calendar].[day]'
              },
              slicer: {
                dimension: {
                  dimension: '[Time Calendar]',
                  hierarchy: '[Time Calendar]',
                  level: '[Time Calendar].[month]'
                },
                members: [
                  {
                    key: '[2025].[1].[2025-01]',
                    value: '[2025].[1].[2025-01]',
                    label: '2025-01'
                  }
                ]
              },
              active: true
            }
          ]
        }}
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Time Calendar]']
            }
          }
        }}
        options={{
          showSlicers: true
        }}
      />
    )

    const slicerAction = container.querySelector('[data-testid="react-analytical-card-slicer-action"]')
    expect(slicerAction).not.toBeNull()

    const breadcrumbs = container.querySelector('[data-testid="react-analytical-card-breadcrumbs"]')
    expect(breadcrumbs).not.toBeNull()
    expect(breadcrumbs?.textContent).toContain('2025-01')

    const closeButton = container.querySelector('[data-testid="react-breadcrumb-close"]') as HTMLButtonElement | null
    expect(closeButton).not.toBeNull()

    await act(async () => {
      closeButton?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-analytical-card-breadcrumbs"]')).toBeNull()
  })

  it('hides the transplanted analytical card header when options.hideHeader is enabled', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        options={{
          hideHeader: true,
          showSlicers: true
        }}
      />
    )

    expect(container.textContent).not.toContain('按月份看收入趋势')
    expect(container.textContent).not.toContain('Refresh')
    expect(container.textContent).not.toContain('Download')
    expect(container.textContent).not.toContain('Screenshot')
    expect(container.querySelector('[data-testid="react-analytical-card-slicer-action"]')).toBeNull()
    expect(container.querySelector('[data-testid="mock-echarts-runtime"]')).not.toBeNull()
  })

  it('hides download and screenshot actions when the transplanted analytical card options disable them', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        options={{
          hideDataDownload: true,
          hideScreenshot: true
        }}
      />
    )

    expect(container.textContent).toContain('按月份看收入趋势')
    expect(container.textContent).toContain('Refresh')
    expect(container.textContent).not.toContain('Download')
    expect(container.textContent).not.toContain('Screenshot')
  })

  it('opens the transplanted slicers panel from the slicer action', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Time Calendar]', '[Region]']
            }
          }
        }}
        options={{
          showSlicers: true
        }}
      />
    )

    const slicerAction = container.querySelector('[data-testid="react-analytical-card-slicer-action"]') as HTMLButtonElement | null
    expect(slicerAction).not.toBeNull()

    await act(async () => {
      slicerAction?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-slicers"]')).not.toBeNull()
  })

  it('keeps the transplanted slicer action hidden when only payload interaction enables slicers without options.showSlicers', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Region]'],
              applied: [
                {
                  dimension: {
                    dimension: '[Region]',
                    hierarchy: '[Region]'
                  },
                  members: [
                    {
                      key: 'East',
                      value: 'East',
                      label: 'East'
                    }
                  ]
                }
              ]
            }
          }
        }}
      />
    )

    expect(container.querySelector('[data-testid="react-analytical-card-slicer-action"]')).toBeNull()
  })

  it('passes xpert-style variable slicer affordances into the slicer host when entity metadata exposes variables', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        syntax: Syntax.MDX,
        properties: {
          '[Region]': {
            name: '[Region]',
            caption: 'Region',
            role: AggregationRole.dimension,
            visible: true
          }
        },
        parameters: {
          PromptRegion: {
            name: 'PromptRegion',
            caption: 'Prompt Region',
            paramType: CubeParameterEnum.Select,
            role: AggregationRole.variable,
            visible: true,
            referenceDimension: '[Region]',
            referenceHierarchy: '[Region]',
            variableSelectionType: VariableSelectionType.Value
          }
        }
      })),
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        initialState={{
          slicers: [
            {
              dimension: {
                dimension: '[Region]',
                hierarchy: '[Region]'
              },
              members: [
                {
                  key: 'East',
                  value: 'East',
                  label: 'East'
                }
              ]
            }
          ]
        }}
        payload={{
          title: '按月份看收入趋势',
          rows: [],
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Region]'],
              applied: [
                {
                  dimension: {
                    dimension: '[Region]',
                    hierarchy: '[Region]'
                  },
                  members: [
                    {
                      key: 'East',
                      value: 'East',
                      label: 'East'
                    }
                  ]
                }
              ]
            }
          }
        }}
        options={{
          showSlicers: true
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      init$.complete()
      await Promise.resolve()
    })

    const slicerAction = container.querySelector(
      '[data-testid="react-analytical-card-slicer-action"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      slicerAction?.click()
      await Promise.resolve()
    })

    const slicersTrigger = container.querySelector(
      '[data-testid="react-slicers-trigger"]'
    ) as HTMLButtonElement | null

    expect(slicersTrigger).not.toBeNull()
    expect(container.querySelector('[data-testid="react-slicers-property-PromptRegion"]')).toBeNull()

    await act(async () => {
      slicersTrigger?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-slicers-property-PromptRegion"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="react-slicers-capacity-AdvancedSlicer"]')).not.toBeNull()
  })

  it('refreshes through the analytical card service and hydrates engine state from service results', async () => {
    const init$ = new Subject<void>()
    const loading$ = new BehaviorSubject(false)
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const refresh = vi.fn()
    const service: AnalyticalCardServiceLike & {
      entityService: {
        selectMembers: ReturnType<typeof vi.fn>
      }
    } = {
      entityService: {
        selectMembers: vi.fn(() =>
          of([
            {
              memberKey: 'East',
              memberCaption: 'East',
              dimension: '[Region]',
              hierarchy: '[Region]'
            }
          ])
        )
      },
      loading$,
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {}
      })),
      refresh
    }

    let assignedDataSettings: unknown = null
    Object.defineProperty(service, 'dataSettings', {
      configurable: true,
      enumerable: true,
      get() {
        return assignedDataSettings as never
      },
      set(value: unknown) {
        assignedDataSettings = value
      }
    })

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [],
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      await Promise.resolve()
    })

    expect(refresh).toHaveBeenCalledTimes(1)

    await act(async () => {
      result$.next({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ]
      })
      await Promise.resolve()
    })

    expect(engineInstances).toHaveLength(1)
    expect(engineInstances[0]).toMatchObject({
      entityType: {
        name: 'Supermart Grocery Sales'
      },
      data: {
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ]
      }
    })
  })

  it('renders the transplanted error state with xpert-style bug icon when the service returns an error', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ error: string }>()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {}
      })),
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        error: 'Cube query failed'
      })
      await Promise.resolve()
    })

    expect(container.textContent).toContain('🐞')
    expect(container.textContent).toContain('Cube query failed')
    expect(container.querySelector('[data-testid="mock-echarts-runtime"]')).toBeNull()
  })

  it('renders the transplanted empty state with xpert-style cart icon when the service returns no rows', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {}
      })),
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        initialState={{
          slicers: [
            {
              dimension: {
                dimension: '[Region]',
                hierarchy: '[Region]'
              },
              members: [
                {
                  key: 'East',
                  value: 'East',
                  label: 'East'
                }
              ]
            }
          ]
        }}
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: []
      })
      await Promise.resolve()
    })

    expect(container.textContent).toContain('🛒')
    expect(container.textContent).toContain('Data Empty')
    expect(container.querySelector('[data-testid="mock-echarts-runtime"]')).toBeNull()
  })

  it('projects editable slicers into service dataSettings selectionVariant like xpert dataSettings$', async () => {
    const init$ = new Subject<void>()
    const loading$ = new BehaviorSubject(false)
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const refresh = vi.fn()
    const service: AnalyticalCardServiceLike = {
      loading$,
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {}
      })),
      refresh
    }

    const assignedDataSettingsHistory: unknown[] = []
    Object.defineProperty(service, 'dataSettings', {
      configurable: true,
      enumerable: true,
      get() {
        return assignedDataSettingsHistory.at(-1) as never
      },
      set(value: unknown) {
        assignedDataSettingsHistory.push(value)
      }
    })

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            selectionVariant: {
              selectOptions: [
                {
                  dimension: {
                    dimension: '[Department]',
                    hierarchy: '[Department]',
                    level: '[Department].[Department]'
                  },
                  members: [
                    {
                      key: 'Produce',
                      value: 'Produce',
                      label: 'Produce'
                    }
                  ]
                }
              ]
            },
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Region]'],
              applied: [
                {
                  dimension: {
                    dimension: '[Region]',
                    hierarchy: '[Region]'
                  },
                  members: [
                    {
                      key: 'East',
                      value: 'East',
                      label: 'East'
                    }
                  ]
                }
              ]
            }
          }
        }}
        options={{
          showSlicers: true
        }}
        service={service}
      />
    )

    await waitForAsyncWork()

    const latest = assignedDataSettingsHistory.at(-1) as Record<string, unknown> | undefined
    expect(latest).toBeDefined()
    expect((latest?.selectionVariant as Record<string, unknown>)?.selectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimension: expect.objectContaining({
            dimension: '[Department]'
          })
        }),
        expect.objectContaining({
          dimension: expect.objectContaining({
            dimension: '[Region]',
            hierarchy: '[Region]'
          }),
          members: expect.arrayContaining([
            expect.objectContaining({
              key: 'East',
              value: 'East',
              label: 'East'
            })
          ])
        })
      ])
    )

    expect(container.querySelector('[data-testid="react-analytical-card"]')).not.toBeNull()
  })

  it('projects drill state into service dataSettings chartAnnotation and selectionVariant like xpert dataSettings$', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const service: AnalyticalCardServiceLike & {
      entityService: {
        selectMembers: ReturnType<typeof vi.fn>
      }
    } = {
      entityService: {
        selectMembers: vi.fn(() =>
          of([
            {
              memberKey: 'East',
              memberCaption: 'East',
              dimension: '[Region]',
              hierarchy: '[Region]'
            }
          ])
        )
      },
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {
          '[Time Calendar]': {
            name: '[Time Calendar]',
            caption: 'Time Calendar',
            role: 'Dimension',
            hierarchies: [
              {
                name: '[Time Calendar]',
                caption: 'Time Calendar',
                role: 'Hierarchy',
                levels: [
                  { name: '[Time Calendar].[year]', caption: 'Year', levelNumber: 1, role: 'Level' },
                  { name: '[Time Calendar].[month]', caption: 'Month', levelNumber: 2, role: 'Level' },
                  { name: '[Time Calendar].[day]', caption: 'Day', levelNumber: 3, role: 'Level' }
                ]
              }
            ]
          }
        }
      })) as never,
      refresh: vi.fn()
    }

    const assignedDataSettingsHistory: unknown[] = []
    Object.defineProperty(service, 'dataSettings', {
      configurable: true,
      enumerable: true,
      get() {
        return assignedDataSettingsHistory.at(-1) as never
      },
      set(value: unknown) {
        assignedDataSettingsHistory.push(value)
      }
    })

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ]
      })
      await Promise.resolve()
    })

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Time Calendar]',
              hierarchy: '[Time Calendar]',
              level: '[Time Calendar].[month]'
            },
            members: [
              {
                key: '[2025].[1].[2025-02]',
                value: '[2025].[1].[2025-02]',
                label: '2025-02'
              }
            ]
          }
        ]
      })
      await Promise.resolve()
    })

    const drillLevelGroup = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-group-0"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      drillLevelGroup?.click()
      await Promise.resolve()
    })

    const enabledDayLevel = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-option-2"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      enabledDayLevel?.click()
      await Promise.resolve()
    })

    const latest = assignedDataSettingsHistory.at(-1) as Record<string, unknown> | undefined
    const chartAnnotation = latest?.chartAnnotation as Record<string, unknown> | undefined
    const dimensions = chartAnnotation?.dimensions as Array<Record<string, unknown>> | undefined
    const selectionVariant = latest?.selectionVariant as Record<string, unknown> | undefined
    const selectOptions = selectionVariant?.selectOptions as Array<Record<string, unknown>> | undefined

    expect(dimensions?.[0]).toEqual(
      expect.objectContaining({
        dimension: '[Time Calendar]',
        hierarchy: '[Time Calendar]',
        level: '[Time Calendar].[day]'
      })
    )
    expect(selectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimension: expect.objectContaining({
            dimension: '[Time Calendar]',
            level: '[Time Calendar].[month]'
          }),
          drill: 0,
          members: [
            expect.objectContaining({
              key: '[2025].[1].[2025-02]',
              value: '[2025].[1].[2025-02]',
              label: '2025-02'
            })
          ]
        })
      ])
    )
  })

  it('emits explain payloads with projected slicer dataSettings and actual service query results', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>>; traceKey: string }>()
    const explain = vi.fn()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {}
      })),
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [],
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          },
          interaction: {
            slicers: {
              enabled: true,
              dimensions: ['[Region]']
            }
          }
        }}
        explain={explain}
        options={{
          showSlicers: true
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ],
        traceKey: 'query-1'
      })
      await Promise.resolve()
    })

    const slicerAction = container.querySelector(
      '[data-testid="react-analytical-card-slicer-action"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      slicerAction?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicers-property-[Region]"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-simple-slicer-open-value-help"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-member-value-help-option-East"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-member-value-help-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="react-simple-slicer-apply"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    const lastExplain = explain.mock.lastCall as [Array<unknown>] | undefined
    expect(lastExplain).toBeDefined()
    expect(lastExplain?.[0][0]).toEqual(
      expect.objectContaining({
        selectionVariant: expect.objectContaining({
          selectOptions: expect.arrayContaining([
            expect.objectContaining({
              dimension: expect.objectContaining({
                dimension: '[Region]'
              })
            })
          ])
        })
      })
    )
    expect(lastExplain?.[0][1]).toEqual(
      expect.objectContaining({
        traceKey: 'query-1',
        data: [
          expect.objectContaining({
            Sales: 166267
          })
        ]
      })
    )
  })

  it('emits explain payloads with projected drill chartAnnotation after drill-level selection', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>>; traceKey: string }>()
    const explain = vi.fn()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {
          '[Time Calendar]': {
            name: '[Time Calendar]',
            caption: 'Time Calendar',
            role: 'Dimension',
            hierarchies: [
              {
                name: '[Time Calendar]',
                caption: 'Time Calendar',
                role: 'Hierarchy',
                levels: [
                  { name: '[Time Calendar].[year]', caption: 'Year', levelNumber: 1, role: 'Level' },
                  { name: '[Time Calendar].[month]', caption: 'Month', levelNumber: 2, role: 'Level' },
                  { name: '[Time Calendar].[day]', caption: 'Day', levelNumber: 3, role: 'Level' }
                ]
              }
            ]
          }
        }
      })) as never,
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [],
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        explain={explain}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ],
        traceKey: 'query-2'
      })
      await Promise.resolve()
    })

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Time Calendar]',
              hierarchy: '[Time Calendar]',
              level: '[Time Calendar].[month]'
            },
            members: [
              {
                key: '[2025].[1].[2025-02]',
                value: '[2025].[1].[2025-02]',
                label: '2025-02'
              }
            ]
          }
        ]
      })
      await Promise.resolve()
    })

    const drillLevelGroup = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-group-0"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      drillLevelGroup?.click()
      await Promise.resolve()
    })

    const enabledDayLevel = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-option-2"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      enabledDayLevel?.click()
      await Promise.resolve()
    })

    const lastExplain = explain.mock.lastCall as [Array<unknown>] | undefined
    expect(lastExplain).toBeDefined()
    expect(lastExplain?.[0][0]).toEqual(
      expect.objectContaining({
        chartAnnotation: expect.objectContaining({
          dimensions: [
            expect.objectContaining({
              level: '[Time Calendar].[day]'
            })
          ]
        }),
        selectionVariant: expect.objectContaining({
          selectOptions: expect.arrayContaining([
            expect.objectContaining({
              dimension: expect.objectContaining({
                level: '[Time Calendar].[month]'
              }),
              drill: 0
            })
          ])
        })
      })
    )
    expect(lastExplain?.[0][1]).toEqual(
      expect.objectContaining({
        traceKey: 'query-2'
      })
    )
  })

  it('auto-refreshes a real ChartBusinessService when editable slicers change', async () => {
    const service = new ChartBusinessService<Record<string, unknown>>(
      new DSCoreService(
        [new MockAgent()],
        [
          {
            key: 'Mock',
            type: 'SQL',
            name: 'Mock',
            agentType: AgentType.Browser
          }
        ],
        [
          {
            type: 'SQL',
            factory: async () => MockDataSource as never
          }
        ]
      )
    )
    const resultHistory: Array<Record<string, unknown>> = []
    const subscription = service.selectResult().subscribe(result => {
      resultHistory.push(result as unknown as Record<string, unknown>)
    })

    try {
      const container = await renderIntoDom(
        <ReactAnalyticalCard
          payload={{
            title: '按部门看销售',
            rows: [],
            dataSettings: {
              dataSource: 'Mock',
              entitySet: 'SalesOrder',
              chartAnnotation: {
                chartType: { type: 'Bar', name: 'Bar' },
                dimensions: [{ dimension: 'Department' }],
                measures: [{ dimension: C_MEASURES, measure: 'sales', role: 'Axis1' }]
              }
            },
            chartSettings: {
              chartTypes: [{ type: 'Bar', name: 'Bar' }]
            },
            interaction: {
              slicers: {
                enabled: true,
                dimensions: ['Department']
              }
            }
          }}
          options={{ showSlicers: true }}
          service={service}
        />
      )

      await waitForAsyncWork()

      const slicerAction = container.querySelector(
        '[data-testid="react-analytical-card-slicer-action"]'
      ) as HTMLButtonElement | null

      await act(async () => {
        slicerAction?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null)?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(container.querySelector('[data-testid="react-slicers-property-Department"]') as HTMLButtonElement | null)?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(
          container.querySelector('[data-testid="react-simple-slicer-open-value-help"]') as HTMLButtonElement | null
        )?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(
          container.querySelector('[data-testid="react-member-value-help-option-[A]"]') as HTMLButtonElement | null
        )?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(
          container.querySelector('[data-testid="react-member-value-help-apply"]') as HTMLButtonElement | null
        )?.click()
        await Promise.resolve()
      })

      await act(async () => {
        ;(container.querySelector('[data-testid="react-simple-slicer-apply"]') as HTMLButtonElement | null)?.click()
        await Promise.resolve()
      })

      await waitForAsyncWork()

      const latest = resultHistory.at(-1) as Record<string, unknown> | undefined
      const options = latest?.options as Record<string, unknown> | undefined
      const filters = options?.filters as Array<Record<string, unknown>> | undefined
      expect(resultHistory.length).toBeGreaterThanOrEqual(2)
      expect(filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dimension: expect.objectContaining({
              dimension: 'Department',
              hierarchy: 'Department'
            }),
            members: expect.arrayContaining([
              expect.objectContaining({
                key: '[A]',
                value: '[A]',
                label: 'A'
              })
            ])
          })
        ])
      )
    } finally {
      subscription.unsubscribe()
      service.onDestroy()
    }
  })

  it('auto-refreshes a real ChartBusinessService with drilled chart rows after drill-level selection', async () => {
    const service = new ChartBusinessService<Record<string, unknown>>(
      new DSCoreService(
        [new MockAgent()],
        [
          {
            key: 'Mock',
            type: 'SQL',
            name: 'Mock',
            agentType: AgentType.Browser
          }
        ],
        [
          {
            type: 'SQL',
            factory: async () => MockDataSource as never
          }
        ]
      )
    )
    const resultHistory: Array<Record<string, unknown>> = []
    const subscription = service.selectResult().subscribe(result => {
      resultHistory.push(result as unknown as Record<string, unknown>)
    })

    try {
      const container = await renderIntoDom(
        <ReactAnalyticalCard
          payload={{
            title: '按时间看销售',
            rows: [],
            dataSettings: {
              dataSource: 'Mock',
              entitySet: 'SalesOrder',
              chartAnnotation: {
                chartType: { type: 'Bar', name: 'Bar' },
                dimensions: [
                  {
                    dimension: '[Time]',
                    hierarchy: '[Time]',
                    level: '[Time].[Year]'
                  }
                ],
                measures: [{ dimension: C_MEASURES, measure: 'sales', role: 'Axis1' }]
              }
            },
            chartSettings: {
              chartTypes: [{ type: 'Bar', name: 'Bar' }]
            }
          }}
          service={service}
        />
      )

      await waitForAsyncWork()

      await act(async () => {
        selectChanged$.next({
          event: new MouseEvent('click'),
          slicers: [
            {
              dimension: {
                dimension: '[Time]',
                hierarchy: '[Time]',
                level: '[Time].[Year]'
              },
              members: [
                {
                  key: '[2025]',
                  value: '[2025]',
                  label: '2025'
                }
              ]
            }
          ]
        })
        await Promise.resolve()
      })

      const drillLevelGroup = container.querySelector(
        '[data-testid="react-analytical-card-drill-level-group-0"]'
      ) as HTMLButtonElement | null

      await act(async () => {
        drillLevelGroup?.click()
        await Promise.resolve()
      })

      const monthLevel = container.querySelector(
        '[data-testid="react-analytical-card-drill-level-option-1"]'
      ) as HTMLButtonElement | null

      await act(async () => {
        monthLevel?.click()
        await Promise.resolve()
      })

      await waitForAsyncWork()

      const latest = resultHistory.at(-1) as Record<string, unknown> | undefined
      const options = latest?.options as Record<string, unknown> | undefined
      const rows = options?.rows as Array<Record<string, unknown>> | undefined
      const filters = options?.filters as Array<Record<string, unknown>> | undefined

      expect(resultHistory.length).toBeGreaterThanOrEqual(2)
      expect(rows?.[0]).toEqual(
        expect.objectContaining({
          dimension: '[Time]',
          hierarchy: '[Time]',
          level: '[Time].[Month]'
        })
      )
      expect(filters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dimension: expect.objectContaining({
              level: '[Time].[Year]'
            }),
            drill: 0
          })
        ])
      )
    } finally {
      subscription.unsubscribe()
      service.onDestroy()
    }
  })

  it('clears the transplanted context menu selection when echarts options refresh like xpert', async () => {
    const slicersChange = vi.fn()
    const slicersChanging = vi.fn()
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        slicersChange={slicersChange}
        slicersChanging={slicersChanging}
      />
    )

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Time Calendar]',
              hierarchy: '[Time Calendar]',
              level: '[Time Calendar].[month]'
            },
            members: [
              {
                key: '[2025].[1].[2025-02]',
                value: '[2025].[1].[2025-02]',
                label: '2025-02'
              }
            ]
          }
        ]
      })
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-analytical-card-context-menu"]')).not.toBeNull()

    await act(async () => {
      emitChartOptions({
        options: {
          tooltip: { trigger: 'item' },
          series: [{ type: 'bar', data: [166267] }]
        }
      })
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-analytical-card-context-menu"]')).toBeNull()
    expect(slicersChange).toHaveBeenLastCalledWith([])
    expect(slicersChanging).toHaveBeenLastCalledWith([])
  })

  it('opens the transplanted context menu from chart selection and emits link analysis with current slicers', async () => {
    const slicers = [
      {
        dimension: {
          dimension: '[Time Calendar]',
          hierarchy: '[Time Calendar]',
          level: '[Time Calendar].[month]'
        },
        members: [
          {
            value: '[2025].[1].[2025-02]',
            label: '2025-02'
          }
        ],
        op: 'IN'
      }
    ]
    const slicersChange = vi.fn()
    const slicersChanging = vi.fn()
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        slicersChange={slicersChange}
        slicersChanging={slicersChanging}
      />
    )

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers
      })
      await Promise.resolve()
    })

    const contextMenu = container.querySelector('[data-testid="react-analytical-card-context-menu"]')
    expect(contextMenu).not.toBeNull()
    expect(contextMenu?.textContent).toContain('Link Analysis')
    expect(contextMenu?.textContent).toContain('Drill Down')

    const linkAnalysis = container.querySelector(
      '[data-testid="react-analytical-card-link-analysis"]'
    ) as HTMLButtonElement | null
    expect(linkAnalysis).not.toBeNull()

    await act(async () => {
      linkAnalysis?.click()
      await Promise.resolve()
    })

    expect(slicersChange).toHaveBeenCalledWith(slicers)
    expect(slicersChanging).toHaveBeenCalledWith(slicers)
  })

  it('drills down from the transplanted context menu into breadcrumb state', async () => {
    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
      />
    )

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Time Calendar]',
              hierarchy: '[Time Calendar]',
              level: '[Time Calendar].[month]'
            },
            members: [
              {
                value: '[2025].[1].[2025-02]',
                label: '2025-02'
              }
            ],
            op: 'IN'
          }
        ]
      })
      await Promise.resolve()
    })

    const drillDown = container.querySelector(
      '[data-testid="react-analytical-card-drill-down"]'
    ) as HTMLButtonElement | null
    expect(drillDown).not.toBeNull()

    await act(async () => {
      drillDown?.click()
      await Promise.resolve()
    })

    const breadcrumbs = container.querySelector('[data-testid="react-analytical-card-breadcrumbs"]')
    expect(breadcrumbs).not.toBeNull()
    expect(breadcrumbs?.textContent).toContain('2025-02')
    expect(container.querySelector('[data-testid="react-analytical-card-context-menu"]')).toBeNull()
  })

  it('offers drill level submenu choices and drills to the selected hierarchy level', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {
          '[Time Calendar]': {
            name: '[Time Calendar]',
            caption: 'Time Calendar',
            role: 'Dimension',
            hierarchies: [
              {
                name: '[Time Calendar]',
                caption: 'Time Calendar',
                role: 'Hierarchy',
                levels: [
                  { name: '[Time Calendar].[year]', caption: 'Year', levelNumber: 1, role: 'Level' },
                  { name: '[Time Calendar].[month]', caption: 'Month', levelNumber: 2, role: 'Level' },
                  { name: '[Time Calendar].[day]', caption: 'Day', levelNumber: 3, role: 'Level' }
                ]
              }
            ]
          }
        }
      })) as never,
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: [
          {
            '[Time Calendar].[month]': '[2025].[1].[2025-02]',
            '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
            Sales: 166267
          }
        ]
      })
      await Promise.resolve()
    })

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Time Calendar]',
              hierarchy: '[Time Calendar]',
              level: '[Time Calendar].[month]'
            },
            members: [
              {
                key: '[2025].[1].[2025-02]',
                value: '[2025].[1].[2025-02]',
                label: '2025-02'
              }
            ]
          }
        ]
      })
      await Promise.resolve()
    })

    const drillLevelGroup = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-group-0"]'
    ) as HTMLButtonElement | null
    expect(drillLevelGroup).not.toBeNull()
    expect(drillLevelGroup?.textContent).toContain('2025-02')

    await act(async () => {
      drillLevelGroup?.click()
      await Promise.resolve()
    })

    const disabledMonthLevel = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-option-1"]'
    ) as HTMLButtonElement | null
    const enabledDayLevel = container.querySelector(
      '[data-testid="react-analytical-card-drill-level-option-2"]'
    ) as HTMLButtonElement | null

    expect(disabledMonthLevel).not.toBeNull()
    expect(disabledMonthLevel?.disabled).toBe(true)
    expect(enabledDayLevel).not.toBeNull()
    expect(enabledDayLevel?.textContent).toContain('Day')
    expect(enabledDayLevel?.disabled).toBe(false)

    await act(async () => {
      enabledDayLevel?.click()
      await Promise.resolve()
    })

    const breadcrumbs = container.querySelector('[data-testid="react-analytical-card-breadcrumbs"]')
    expect(breadcrumbs).not.toBeNull()
    expect(breadcrumbs?.textContent).toContain('2025-02')
    expect(container.querySelector('[data-testid="react-analytical-card-context-menu"]')).toBeNull()
  })

  it('offers drill dimension submenu choices from presentation variant groupBy dimensions', async () => {
    const init$ = new Subject<void>()
    const result$ = new Subject<{ data: Array<Record<string, unknown>> }>()
    const service: AnalyticalCardServiceLike = {
      onAfterServiceInit: () => init$.asObservable(),
      selectResult: () => result$.asObservable(),
      getEntityType: vi.fn(async () => ({
        name: 'Supermart Grocery Sales',
        properties: {
          '[Region]': {
            name: '[Region]',
            caption: 'Region',
            role: 'Dimension',
            hierarchies: [{ name: '[Region]', caption: 'Region', role: 'Hierarchy', levels: [] }]
          },
          '[Store]': {
            name: '[Store]',
            caption: 'Store',
            role: 'Dimension',
            hierarchies: [{ name: '[Store]', caption: 'Store', role: 'Hierarchy', levels: [] }]
          }
        }
      })) as never,
      refresh: vi.fn()
    }

    const container = await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按区域看销售',
          rows: [
            {
              '[Region]': 'East',
              Sales: 166267
            }
          ],
          dataSettings: {
            dataSource: 'model-1',
            entitySet: 'Supermart Grocery Sales',
            presentationVariant: {
              groupBy: [
                {
                  dimension: '[Store]',
                  hierarchy: '[Store]',
                  level: '[Store].[Store]'
                }
              ]
            },
            chartAnnotation: {
              chartType: { type: 'Bar', name: 'Bar' },
              dimensions: [
                {
                  dimension: '[Region]',
                  hierarchy: '[Region]',
                  level: '[Region].[Region]'
                }
              ],
              measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
            }
          },
          chartSettings: {
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Bar', name: 'Bar' }]
          }
        }}
        service={service}
      />
    )

    await act(async () => {
      init$.next()
      result$.next({
        data: [
          {
            '[Region]': 'East',
            Sales: 166267
          }
        ]
      })
      await Promise.resolve()
    })

    await act(async () => {
      selectChanged$.next({
        event: new MouseEvent('click'),
        slicers: [
          {
            dimension: {
              dimension: '[Region]',
              hierarchy: '[Region]',
              level: '[Region].[Region]'
            },
            members: [
              {
                key: 'East',
                value: 'East',
                label: 'East'
              }
            ]
          }
        ]
      })
      await Promise.resolve()
    })

    const drillDimensionGroup = container.querySelector(
      '[data-testid="react-analytical-card-drill-dimension-group-0"]'
    ) as HTMLButtonElement | null
    expect(drillDimensionGroup).not.toBeNull()
    expect(drillDimensionGroup?.textContent).toContain("Region:'East'")

    await act(async () => {
      drillDimensionGroup?.click()
      await Promise.resolve()
    })

    const storeOption = container.querySelector(
      '[data-testid="react-analytical-card-drill-dimension-option-0"]'
    ) as HTMLButtonElement | null
    expect(storeOption).not.toBeNull()
    expect(storeOption?.textContent).toContain('Store')

    await act(async () => {
      storeOption?.click()
      await Promise.resolve()
    })

    const breadcrumbs = container.querySelector('[data-testid="react-analytical-card-breadcrumbs"]')
    expect(breadcrumbs).not.toBeNull()
    expect(breadcrumbs?.textContent).toContain('East')
    expect(container.querySelector('[data-testid="react-analytical-card-context-menu"]')).toBeNull()
  })

  it('unselects the current chart item on chart context menu events', async () => {
    await renderIntoDom(
      <ReactAnalyticalCard
        payload={{
          title: '按月份看收入趋势',
          rows: [
            {
              '[Time Calendar].[month]': '[2025].[1].[2025-02]',
              '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
              Sales: 166267
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
            locale: 'zh-Hans',
            chartTypes: [{ type: 'Line', name: 'Line' }]
          }
        }}
      />
    )

    const stopPropagation = vi.fn()
    const preventDefault = vi.fn()

    await act(async () => {
      chartContextMenu$.next({
        dataIndex: [0],
        event: {
          preventDefault,
          stopPropagation
        },
        name: '2025-02',
        seriesId: 'series-0',
        seriesIndex: 0,
        seriesName: 'Sales'
      })
      await Promise.resolve()
    })

    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(dispatchActionSpy).toHaveBeenCalledWith({
      dataIndex: [0],
      name: '2025-02',
      seriesId: 'series-0',
      seriesIndex: 0,
      seriesName: 'Sales',
      type: 'unselect'
    })
  })
})

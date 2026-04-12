// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { renderBootstrapSpy, renderChartAnswerSpy } = vi.hoisted(() => ({
  renderBootstrapSpy: vi.fn(),
  renderChartAnswerSpy: vi.fn()
}))

vi.mock('./analytical-card-runtime-bootstrap', () => ({
  AnalyticalCardRuntimeBootstrap: function MockAnalyticalCardRuntimeBootstrap(props: Record<string, unknown>) {
    renderBootstrapSpy(props)
    return <div data-testid="mock-analytical-card-runtime-bootstrap" />
  }
}))

vi.mock('./chart-component', () => ({
  ChartAnswerComponent: function MockChartAnswerComponent(props: Record<string, unknown>) {
    renderChartAnswerSpy(props)
    return <div data-testid="mock-runtime-chart-answer" />
  }
}))

import { RuntimeAnalyticalCardPreview } from './runtime-analytical-card-preview'

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
  renderBootstrapSpy.mockReset()
  renderChartAnswerSpy.mockReset()
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

describe('RuntimeAnalyticalCardPreview', () => {
  it('mounts the runtime bootstrap seam and delegates a native xpert payload to ChartAnswerComponent', async () => {
    const container = await renderIntoDom(
      <RuntimeAnalyticalCardPreview
        cube="Supermart Grocery Sales"
        modelId="0d505022-33d9-43e1-8bc3-2e3b9e396587"
        title="按月份看销售趋势"
      />
    )

    expect(container.querySelector('[data-testid="mock-analytical-card-runtime-bootstrap"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="mock-runtime-chart-answer"]')).not.toBeNull()
    expect(renderBootstrapSpy).toHaveBeenCalledWith({
      activeXpertId: '0d505022-33d9-43e1-8bc3-2e3b9e396587',
      modelId: '0d505022-33d9-43e1-8bc3-2e3b9e396587'
    })
    expect(renderChartAnswerSpy).toHaveBeenCalledTimes(1)
    expect(renderChartAnswerSpy.mock.calls[0]?.[0]).toMatchObject({
      payload: {
        title: '按月份看销售趋势',
        dataSettings: {
          dataSource: '0d505022-33d9-43e1-8bc3-2e3b9e396587',
          entitySet: 'Supermart Grocery Sales',
          chartAnnotation: {
            chartType: { type: 'Line', name: 'Line' },
            dimensions: [
              {
                dimension: 'Time Calendar',
                hierarchy: 'Time Calendar',
                level: 'Month'
              }
            ],
            measures: [{ dimension: 'Measures', measure: 'Sales', role: 'Axis1' }]
          }
        },
        interaction: {
          slicers: {
            dimensions: ['Region'],
            enabled: true
          }
        }
      }
    })
  })
})

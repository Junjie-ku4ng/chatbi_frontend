// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AdvancedSlicerOperator,
  AggregationRole,
  FilterSelectionType,
  FilteringLogic,
  FilterOperator,
  Semantics,
  Syntax,
  TimeGranularity,
  TimeRangeType,
  VariableSelectionType
} from '@metad/ocap-core'
import { ReactSlicers } from './react-slicers'

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

describe('ReactSlicers', () => {
  it('opens a transplanted member value-help and emits xpert-style slicer changes when applying members', async () => {
    const valueChange = vi.fn()
    const selectMembers = vi.fn(() =>
      of([
        {
          memberKey: 'East',
          memberCaption: 'East',
          dimension: '[Region]',
          hierarchy: '[Region]'
        }
      ])
    )
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['CombinationSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={['[Time Calendar]', '[Region]']}
        editable
        service={
          {
            entityService: {
              selectMembers
            }
          } as never
        }
        slicers={[]}
        valueChange={valueChange}
      />
    )

    const trigger = container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicers-property-[Region]"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-simple-slicer-editor"]')).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-simple-slicer-open-value-help"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(selectMembers).toHaveBeenCalledWith(
      expect.objectContaining({
        dimension: '[Region]'
      })
    )
    expect(container.querySelector('[data-testid="react-member-value-help"]')).not.toBeNull()

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

    expect(valueChange).toHaveBeenCalledWith([
      expect.objectContaining({
        dimension: expect.objectContaining({
          dimension: '[Region]',
          hierarchy: '[Region]'
        }),
        members: [
          expect.objectContaining({
            caption: 'East',
            key: 'East',
            label: 'East',
            value: 'East'
          })
        ],
        selectionType: FilterSelectionType.Multiple
      })
    ])
  })

  it('surfaces xpert-style variable entries from entity metadata and preserves variable slicer semantics', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['Variable', 'AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'SalesOrder' }}
        dimensions={[]}
        editable
        entityType={{
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
              role: AggregationRole.variable,
              visible: true,
              referenceDimension: '[Region]',
              referenceHierarchy: '[Region]',
              variableSelectionType: VariableSelectionType.Value
            }
          }
        } as never}
        service={
          {
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
            }
          } as never
        }
        slicers={[]}
        valueChange={valueChange}
      />
    )

    const trigger = container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null
    const search = () => container.querySelector('[data-testid="react-slicers-search"]') as HTMLInputElement | null
    const variableButton = () =>
      container.querySelector('[data-testid="react-slicers-property-PromptRegion"]') as HTMLButtonElement | null

    expect(trigger).not.toBeNull()
    expect(search()).toBeNull()
    expect(variableButton()).toBeNull()
    expect(container.querySelector('[data-testid="react-slicers-capacity-AdvancedSlicer"]')).toBeNull()

    await act(async () => {
      trigger?.click()
      await Promise.resolve()
    })

    expect(search()).not.toBeNull()
    expect(variableButton()).not.toBeNull()
    expect(container.querySelector('[data-testid="react-slicers-capacity-AdvancedSlicer"]')).not.toBeNull()

    await act(async () => {
      if (search()) {
        search()!.value = 'Prompt'
        search()!.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
    })

    expect(variableButton()).not.toBeNull()

    await act(async () => {
      variableButton()?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-simple-slicer-editor"]')).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-simple-slicer-open-value-help"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-member-value-help"]')).not.toBeNull()

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

    expect(valueChange).toHaveBeenCalledWith([
      expect.objectContaining({
        dimension: expect.objectContaining({
          dimension: '[Region]',
          hierarchy: '[Region]',
          parameter: 'PromptRegion'
        }),
        members: [
          expect.objectContaining({
            caption: 'East',
            key: 'East',
            label: 'East',
            value: 'East'
          })
        ],
        selectionType: FilterSelectionType.Single
      })
    ])
  })

  it('opens a calendar submenu and emits xpert-style time range slicers for semantic calendars', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.MDX,
          properties: {
            '[Time Calendar]': {
              name: '[Time Calendar]',
              caption: 'Time Calendar',
              role: AggregationRole.dimension,
              visible: true,
              semantics: {
                semantic: Semantics.Calendar
              }
            }
          },
          parameters: {}
        } as never}
        slicers={[]}
        valueChange={valueChange}
      />
    )

    const trigger = container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.click()
      await Promise.resolve()
    })

    const calendarProperty = container.querySelector(
      '[data-testid="react-slicers-property-[Time Calendar]"]'
    ) as HTMLButtonElement | null

    expect(calendarProperty).not.toBeNull()

    await act(async () => {
      calendarProperty?.click()
      await Promise.resolve()
    })

    expect(
      container.querySelector('[data-testid="react-slicers-calendar-members-[Time Calendar]"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="react-slicers-calendar-date-TODAY"]')
    ).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-slicers-calendar-date-TODAY"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="react-time-filter-editor"]')).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-time-filter-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        currentDate: 'TODAY',
        dimension: {
          dimension: '[Time Calendar]'
        },
        ranges: [
          {
            granularity: TimeGranularity.Day,
            lookAhead: 0,
            lookBack: 0,
            type: TimeRangeType.Standard
          }
        ]
      }
    ])
  })

  it('opens a time filter editor when editing a time range slicer and writes the updated slicer back', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.MDX,
          properties: {
            '[Time Calendar]': {
              name: '[Time Calendar]',
              caption: 'Time Calendar',
              role: AggregationRole.dimension,
              visible: true,
              hierarchies: [{ name: '[Time Calendar].[Calendar]', caption: 'Calendar' }],
              semantics: {
                semantic: Semantics.Calendar
              }
            }
          },
          parameters: {}
        } as never}
        slicers={[
          {
            currentDate: 'TODAY',
            dimension: {
              dimension: '[Time Calendar]'
            },
            ranges: [
              {
                type: TimeRangeType.Standard,
                granularity: TimeGranularity.Month,
                lookBack: 1,
                lookAhead: 0
              }
            ]
          } as never
        ]}
        valueChange={valueChange}
      />
    )

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicer-edit-0"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-time-filter-editor"]')).not.toBeNull()

    await act(async () => {
      const currentDate = container.querySelector(
        '[data-testid="react-time-filter-current-date"]'
      ) as HTMLSelectElement | null
      if (currentDate) {
        currentDate.value = 'SYSTEMTIME'
        currentDate.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const lookBack = container.querySelector(
        '[data-testid="react-time-filter-look-back-0"]'
      ) as HTMLInputElement | null
      if (lookBack) {
        lookBack.value = '3'
        lookBack.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="react-time-filter-apply"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        currentDate: 'SYSTEMTIME',
        dimension: {
          dimension: '[Time Calendar]'
        },
        ranges: [
          {
            type: TimeRangeType.Standard,
            granularity: TimeGranularity.Month,
            lookBack: 3,
            lookAhead: 0
          }
        ]
      }
    ])
  })

  it('opens an advanced slicer editor and emits xpert-style advanced slicer payloads', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.MDX,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            },
            Sales: {
              name: 'Sales',
              caption: 'Sales',
              role: AggregationRole.measure,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[]}
        valueChange={valueChange}
      />
    )

    const trigger = container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.click()
      await Promise.resolve()
    })

    const advancedEntry = container.querySelector(
      '[data-testid="react-slicers-capacity-AdvancedSlicer"]'
    ) as HTMLButtonElement | null

    expect(advancedEntry).not.toBeNull()

    await act(async () => {
      advancedEntry?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-advanced-slicer-editor"]')).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-advanced-slicer-context-[Region]"]') as HTMLButtonElement | null
      )?.click()
      const operator = container.querySelector(
        '[data-testid="react-advanced-slicer-operator"]'
      ) as HTMLSelectElement | null
      if (operator) {
        operator.value = AdvancedSlicerOperator.TopCount
        operator.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const value0 = container.querySelector(
        '[data-testid="react-advanced-slicer-value-0"]'
      ) as HTMLInputElement | null
      if (value0) {
        value0.value = '10'
        value0.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const other = container.querySelector(
        '[data-testid="react-advanced-slicer-other"]'
      ) as HTMLInputElement | null
      if (other) {
        other.click()
      }
      const measure = container.querySelector(
        '[data-testid="react-advanced-slicer-measure"]'
      ) as HTMLSelectElement | null
      if (measure) {
        measure.value = 'Sales'
        measure.dispatchEvent(new Event('change', { bubbles: true }))
      }
      ;(
        container.querySelector('[data-testid="react-advanced-slicer-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        context: [{ dimension: '[Region]' }],
        measure: 'Sales',
        operator: AdvancedSlicerOperator.TopCount,
        other: true,
        value: ['10', null]
      }
    ])
  })

  it('renders xpert-style advanced slicer title and detail in the slicer list', async () => {
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.MDX,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            },
            Sales: {
              name: 'Sales',
              caption: 'Sales',
              role: AggregationRole.measure,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[
          {
            context: [{ dimension: '[Region]' }],
            measure: 'Sales',
            operator: AdvancedSlicerOperator.TopCount,
            value: ['10', null]
          } as never
        ]}
        valueChange={vi.fn()}
      />
    )

    expect(container.textContent).toContain('Advanced Slicer')
    expect(container.textContent).toContain('TopCount(10,Sales) on context:([Region])')
  })

  it('opens a combination slicer editor and emits xpert-style advanced filter payloads', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['CombinationSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.SQL,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[]}
        valueChange={valueChange}
      />
    )

    const trigger = container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.click()
      await Promise.resolve()
    })

    const combinationEntry = container.querySelector(
      '[data-testid="react-slicers-capacity-CombinationSlicer"]'
    ) as HTMLButtonElement | null

    expect(combinationEntry).not.toBeNull()

    await act(async () => {
      combinationEntry?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-combination-slicer-editor"]')).not.toBeNull()

    await act(async () => {
      const dimension = container.querySelector(
        '[data-testid="react-combination-slicer-dimension-root-0"]'
      ) as HTMLSelectElement | null
      if (dimension) {
        dimension.value = '[Region]'
        dimension.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const operator = container.querySelector(
        '[data-testid="react-combination-slicer-operator-root-0"]'
      ) as HTMLSelectElement | null
      if (operator) {
        operator.value = FilterOperator.EQ
        operator.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const value0 = container.querySelector(
        '[data-testid="react-combination-slicer-value-0-root-0"]'
      ) as HTMLInputElement | null
      if (value0) {
        value0.value = 'East'
        value0.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-combination-slicer-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        filteringLogic: FilteringLogic.And,
        children: [
          {
            dimension: { dimension: '[Region]' },
            operator: FilterOperator.EQ,
            members: [
              {
                key: 'East',
                value: 'East',
                caption: 'East',
                label: 'East'
              }
            ]
          }
        ]
      }
    ])
  })

  it('supports nested groups in the combination slicer editor and emits recursive advanced filters', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['CombinationSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.SQL,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            },
            '[Channel]': {
              name: '[Channel]',
              caption: 'Channel',
              role: AggregationRole.dimension,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[]}
        valueChange={valueChange}
      />
    )

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicers-trigger"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-slicers-capacity-CombinationSlicer"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    await act(async () => {
      const rootDimension = container.querySelector(
        '[data-testid="react-combination-slicer-dimension-root-0"]'
      ) as HTMLSelectElement | null
      if (rootDimension) {
        rootDimension.value = '[Region]'
        rootDimension.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const rootValue = container.querySelector(
        '[data-testid="react-combination-slicer-value-0-root-0"]'
      ) as HTMLInputElement | null
      if (rootValue) {
        rootValue.value = 'East'
        rootValue.dispatchEvent(new Event('input', { bubbles: true }))
      }

      ;(
        container.querySelector('[data-testid="react-combination-slicer-add-or-group-root"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    await act(async () => {
      const nestedDimension = container.querySelector(
        '[data-testid="react-combination-slicer-dimension-root-group-1-0"]'
      ) as HTMLSelectElement | null
      if (nestedDimension) {
        nestedDimension.value = '[Channel]'
        nestedDimension.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const nestedOperator = container.querySelector(
        '[data-testid="react-combination-slicer-operator-root-group-1-0"]'
      ) as HTMLSelectElement | null
      if (nestedOperator) {
        nestedOperator.value = FilterOperator.BT
        nestedOperator.dispatchEvent(new Event('change', { bubbles: true }))
      }

      const nestedValue0 = container.querySelector(
        '[data-testid="react-combination-slicer-value-0-root-group-1-0"]'
      ) as HTMLInputElement | null
      if (nestedValue0) {
        nestedValue0.value = 'Online'
        nestedValue0.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const nestedValue1 = container.querySelector(
        '[data-testid="react-combination-slicer-value-1-root-group-1-0"]'
      ) as HTMLInputElement | null
      if (nestedValue1) {
        nestedValue1.value = 'Retail'
        nestedValue1.dispatchEvent(new Event('input', { bubbles: true }))
      }

      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="react-combination-slicer-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        filteringLogic: FilteringLogic.And,
        children: [
          {
            dimension: { dimension: '[Region]' },
            operator: FilterOperator.EQ,
            members: [{ key: 'East', value: 'East', caption: 'East', label: 'East' }]
          },
          {
            filteringLogic: FilteringLogic.Or,
            children: [
              {
                dimension: { dimension: '[Channel]' },
                operator: FilterOperator.BT,
                members: [
                  { key: 'Online', value: 'Online', caption: 'Online', label: 'Online' },
                  { key: 'Retail', value: 'Retail', caption: 'Retail', label: 'Retail' }
                ]
              }
            ]
          }
        ]
      }
    ])
  })

  it('renders xpert-style combination slicer title and detail in the slicer list', async () => {
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['CombinationSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.SQL,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[
          {
            filteringLogic: FilteringLogic.And,
            children: [
              {
                dimension: { dimension: '[Region]' },
                operator: FilterOperator.EQ,
                members: [{ key: 'East', value: 'East', caption: 'East' }]
              }
            ]
          } as never
        ]}
        valueChange={vi.fn()}
      />
    )

    expect(container.textContent).toContain('Combination Slicer')
    expect(container.textContent).toContain('[East]')
  })

  it('opens an editor from the slicer item and updates advanced slicers in place', async () => {
    const valueChange = vi.fn()
    const container = await renderIntoDom(
      <ReactSlicers
        capacities={['AdvancedSlicer']}
        dataSettings={{ dataSource: 'model-1', entitySet: 'Supermart Grocery Sales' }}
        dimensions={[]}
        editable
        entityType={{
          syntax: Syntax.MDX,
          properties: {
            '[Region]': {
              name: '[Region]',
              caption: 'Region',
              role: AggregationRole.dimension,
              visible: true
            },
            Sales: {
              name: 'Sales',
              caption: 'Sales',
              role: AggregationRole.measure,
              visible: true
            }
          },
          parameters: {}
        } as never}
        slicers={[
          {
            context: [{ dimension: '[Region]' }],
            measure: 'Sales',
            operator: AdvancedSlicerOperator.TopCount,
            other: false,
            value: ['10', null]
          } as never
        ]}
        valueChange={valueChange}
      />
    )

    await act(async () => {
      ;(container.querySelector('[data-testid="react-slicer-edit-0"]') as HTMLButtonElement | null)?.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="react-advanced-slicer-editor"]')).not.toBeNull()

    await act(async () => {
      const value0 = container.querySelector(
        '[data-testid="react-advanced-slicer-value-0"]'
      ) as HTMLInputElement | null
      if (value0) {
        value0.value = '25'
        value0.dispatchEvent(new Event('input', { bubbles: true }))
      }

      const other = container.querySelector(
        '[data-testid="react-advanced-slicer-other"]'
      ) as HTMLInputElement | null
      if (other) {
        other.click()
      }

      ;(
        container.querySelector('[data-testid="react-advanced-slicer-apply"]') as HTMLButtonElement | null
      )?.click()
      await Promise.resolve()
    })

    expect(valueChange).toHaveBeenCalledWith([
      {
        context: [{ dimension: '[Region]' }],
        measure: 'Sales',
        operator: AdvancedSlicerOperator.TopCount,
        other: true,
        value: ['25', null]
      }
    ])
  })
})

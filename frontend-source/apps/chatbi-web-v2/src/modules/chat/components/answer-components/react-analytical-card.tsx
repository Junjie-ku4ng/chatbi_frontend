'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Drill,
  getEntityHierarchy,
  getEntityLevel,
  getEntityProperty,
  getPropertyHierarchy,
  getPropertyName,
  isAdvancedFilter,
  parseDimension,
  putFilter,
  slicerAsString,
  type ChartAnnotation,
  type ChartSettings,
  type ChartType,
  type EntityType,
  type ISlicer,
  type Property,
  type QueryReturn
} from '@metad/ocap-core'
import { cloneDeep } from 'lodash-es'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'
import { ReactBreadcrumbBar } from './react-breadcrumb-bar'
import { ReactEntityProperty } from './react-entity-property'
import { ReactSlicers } from './react-slicers'
import type { AnswerComponentPayload, AnswerSurfaceInteraction } from './types'
import { useAnalyticalCardState, type AnalyticalCardOptions, type AnalyticalCardState } from './use-analytical-card-state'
import { useSmartEChartEngine } from './use-smart-echart-engine'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

function asChartAnnotation(value: unknown): ChartAnnotation | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  return record as unknown as ChartAnnotation
}

function asChartSettings(value: unknown): ChartSettings | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  return record as ChartSettings
}

function resolveChartAnnotation(payload: AnswerComponentPayload) {
  return asChartAnnotation(asRecord(payload.dataSettings)?.chartAnnotation)
}

function resolveChartSettings(payload: AnswerComponentPayload) {
  return asChartSettings(payload.chartSettings)
}

function resolveRows(payload: AnswerComponentPayload) {
  return Array.isArray(payload.rows) ? payload.rows : []
}

function resolveChartOptions(payload: AnswerComponentPayload) {
  return asRecord(payload.option) ?? {}
}

function resolvePresentationGroupBy(dataSettings: unknown) {
  const presentationVariant = asRecord(asRecord(dataSettings)?.presentationVariant)
  return Array.isArray(presentationVariant?.groupBy) ? presentationVariant.groupBy : []
}

function buildProjectedDataSettings(input: {
  chartAnnotation: ChartAnnotation | null
  dataSettings: unknown
  selectedDrilledDimensions: AnalyticalCardState['selectedDrilledDimensions']
  slicers: ISlicer[]
}) {
  const baseDataSettings = asRecord(input.dataSettings)
  if (!baseDataSettings) {
    return undefined
  }

  const nextDataSettings = cloneDeep(baseDataSettings)
  const currentSelectionVariant = asRecord(nextDataSettings.selectionVariant)
  const selectOptions = Array.isArray(currentSelectionVariant?.selectOptions)
    ? [...(currentSelectionVariant.selectOptions as ISlicer[])]
    : []

  const projectedSelection = input.slicers.reduce((slicers, item) => putFilter(slicers, item), selectOptions)

  const nextChartAnnotation = cloneDeep((input.chartAnnotation ?? nextDataSettings.chartAnnotation) as ChartAnnotation | undefined)
  if (nextChartAnnotation) {
    nextDataSettings.chartAnnotation = nextChartAnnotation as unknown as Record<string, unknown>
  }

  if (input.selectedDrilledDimensions.length === 0 || !nextChartAnnotation?.dimensions) {
    nextDataSettings.selectionVariant = {
      ...(currentSelectionVariant ?? {}),
      selectOptions: projectedSelection
    }
    return nextDataSettings
  }

  const dimensions = [...nextChartAnnotation.dimensions]
  const drillSelection = input.selectedDrilledDimensions.reduce((slicers, item) => {
    const index = dimensions.findIndex(dimension => getPropertyName(dimension) === getPropertyName(item.parent as never))
    if (index >= 0) {
      dimensions.splice(index, 1, {
        ...dimensions[index],
        ...item.dimension
      })
    }
    return putFilter(slicers, item.slicer)
  }, projectedSelection)

  nextDataSettings.chartAnnotation = {
    ...nextChartAnnotation,
    dimensions
  } as unknown as Record<string, unknown>
  nextDataSettings.selectionVariant = {
    ...(currentSelectionVariant ?? {}),
    selectOptions: drillSelection
  }

  return nextDataSettings
}

function chartTypeKey(chartType: ChartType | null | undefined) {
  if (!chartType) {
    return ''
  }

  return `${chartType.type}:${chartType.variant ?? ''}:${chartType.name ?? ''}`
}

function uniqueChartTypes(current: ChartType | null, candidates: ChartType[] | undefined) {
  const deduped = new Map<string, ChartType>()
  for (const item of [current, ...(candidates ?? [])]) {
    if (!item) {
      continue
    }
    deduped.set(chartTypeKey(item), item)
  }

  return Array.from(deduped.values())
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return ''
  }

  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const escapeCell = (value: unknown) => {
    const text = value == null ? '' : String(value)
    return `"${text.replaceAll('"', '""')}"`
  }

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => headers.map(header => escapeCell(row[header])).join(','))
  ]

  return lines.join('\n')
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  document.body.appendChild(link)
  link.href = url
  link.download = filename
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

type ReactAnalyticalCardProps = {
  payload?: AnswerComponentPayload
  title?: string
  rows?: Array<Record<string, unknown>>
  dataSettings?: AnswerComponentPayload['dataSettings']
  chartSettings?: AnswerComponentPayload['chartSettings']
  chartOptions?: Record<string, unknown>
  interaction?: AnswerSurfaceInteraction
  modelId?: string
  queryLogId?: string
  traceKey?: string
  slicers?: ISlicer[]
  initialState?: Partial<AnalyticalCardState>
  options?: AnalyticalCardOptions
  service?: AnalyticalCardServiceLike
  slicersChange?: (slicers: ISlicer[]) => void
  slicersChanging?: (slicers: ISlicer[]) => void
  chartClick?: (event: unknown) => void
  chartHighlight?: (event: unknown) => void
  chartContextMenu?: (event: unknown) => void
  explain?: (payload: unknown[]) => void
}

type MouseLikeEvent = {
  offsetX?: number
  offsetY?: number
  preventDefault?: () => void
  stopPropagation?: () => void
  type?: string
  zrX?: number
  zrY?: number
}

type Subscription = {
  unsubscribe(): void
}

type Subscribable<T> = {
  subscribe(observer: (value: T) => void): Subscription
}

function subscribeIfPossible<T>(source: unknown, observer: (value: T) => void) {
  if (!source || typeof source !== 'object' || !('subscribe' in source) || typeof source.subscribe !== 'function') {
    return null
  }

  return (source as Subscribable<T>).subscribe(observer)
}

function asSlicers(value: unknown): ISlicer[] {
  return Array.isArray(value) ? (value as ISlicer[]) : []
}

function asMouseLikeEvent(value: unknown): MouseLikeEvent | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as MouseLikeEvent
}

function resolveContextMenuPosition(event: MouseLikeEvent | null) {
  if (!event) {
    return { x: 0, y: 0 }
  }

  if (event.type === 'touchend') {
    return {
      x: (event.zrX ?? 0) + 50,
      y: event.zrY ?? 0
    }
  }

  return {
    x: (event.offsetX ?? 0) + 50,
    y: event.offsetY ?? 0
  }
}

function normalizeAnalyticalCardPayload(input: ReactAnalyticalCardProps): AnswerComponentPayload {
  const payload = cloneDeep(input.payload ?? {})
  const interaction = cloneDeep(
    input.interaction ?? payload.interaction ?? {}
  ) as AnswerSurfaceInteraction

  if (input.slicers) {
    interaction.slicers = {
      ...(interaction.slicers ?? {}),
      enabled: interaction.slicers?.enabled ?? true,
      applied: input.slicers as Array<Record<string, unknown>>
    }
  }

  if (input.title !== undefined) {
    payload.title = input.title
  }
  if (input.rows !== undefined) {
    payload.rows = input.rows
  }
  if (input.dataSettings !== undefined) {
    payload.dataSettings = input.dataSettings
  }
  if (input.chartSettings !== undefined) {
    payload.chartSettings = input.chartSettings
  }
  if (input.chartOptions !== undefined) {
    payload.option = input.chartOptions
  }
  if (input.modelId !== undefined) {
    payload.modelId = input.modelId
  }
  if (input.queryLogId !== undefined) {
    payload.queryLogId = input.queryLogId
  }
  if (input.traceKey !== undefined) {
    payload.traceKey = input.traceKey
  }
  if (Object.keys(interaction).length > 0) {
    payload.interaction = interaction
  }

  return payload as AnswerComponentPayload
}

export function ReactAnalyticalCard({
  payload,
  title,
  rows,
  dataSettings,
  chartSettings: chartSettingsInput,
  chartOptions,
  interaction,
  modelId,
  queryLogId,
  traceKey,
  slicers,
  initialState,
  options,
  service,
  slicersChange,
  slicersChanging,
  chartClick,
  chartHighlight,
  chartContextMenu,
  explain
}: ReactAnalyticalCardProps) {
  const normalizedPayload = useMemo(
    () =>
      normalizeAnalyticalCardPayload({
        payload,
        title,
        rows,
        dataSettings,
        chartSettings: chartSettingsInput,
        chartOptions,
        interaction,
        modelId,
        queryLogId,
        traceKey,
        slicers
      }),
    [chartOptions, chartSettingsInput, dataSettings, interaction, modelId, payload, queryLogId, rows, slicers, title, traceKey]
  )
  const payloadModel = normalizedPayload
  const payloadRows = resolveRows(payloadModel)
  const chartSettings = resolveChartSettings(payloadModel)
  const [chartAnnotation, setChartAnnotation] = useState<ChartAnnotation | null>(() => resolveChartAnnotation(payloadModel))
  const [resolvedRows, setResolvedRows] = useState(payloadRows)
  const [latestQueryResult, setLatestQueryResult] = useState<QueryReturn<Record<string, unknown>>>({
    data: payloadRows
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSlicersOpen, setIsSlicersOpen] = useState(false)
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [entityType, setEntityType] = useState<EntityType | null>(null)
  const [activeDrillLevelGroupIndex, setActiveDrillLevelGroupIndex] = useState<number | null>(null)
  const [activeDrillDimensionGroupIndex, setActiveDrillDimensionGroupIndex] = useState<number | null>(null)
  const hasObservedChartOptionsRef = useRef(false)
  const isServiceReadyRef = useRef(false)
  const analyticalState = useAnalyticalCardState({ payload: payloadModel, initialState })
  const { echartsOption, engine, error, setError } = useSmartEChartEngine()
  const effectiveEntityType = entityType ?? ((engine.entityType as EntityType | null | undefined) ?? null)
  const projectedDataSettings = useMemo(
    () =>
      buildProjectedDataSettings({
        chartAnnotation,
        dataSettings: payloadModel.dataSettings,
        selectedDrilledDimensions: analyticalState.state.selectedDrilledDimensions,
        slicers: analyticalState.state.slicers
      }),
    [analyticalState.state.selectedDrilledDimensions, analyticalState.state.slicers, chartAnnotation, payloadModel.dataSettings]
  )
  const previousProjectedDataSettingsRef = useRef(projectedDataSettings)
  const effectiveChartAnnotation = asChartAnnotation(asRecord(projectedDataSettings)?.chartAnnotation) ?? chartAnnotation

  const emitLinkedAnalysis = (slicers: ISlicer[]) => {
    slicersChange?.(slicers)
    slicersChanging?.(slicers)
  }

  const closeContextMenu = () => {
    setIsContextMenuOpen(false)
    setActiveDrillLevelGroupIndex(null)
    setActiveDrillDimensionGroupIndex(null)
  }

  const openContextMenu = (slicers: ISlicer[], rawEvent?: unknown) => {
    const nextSlicers = asSlicers(slicers)
    analyticalState.setSelectedSlicers(nextSlicers)

    if (nextSlicers.length === 0) {
      closeContextMenu()
      emitLinkedAnalysis([])
      return
    }

    const event = asMouseLikeEvent(rawEvent)
    setContextMenuPosition(resolveContextMenuPosition(event))
    setActiveDrillLevelGroupIndex(null)
    setActiveDrillDimensionGroupIndex(null)

    if (options?.disableContextMenu) {
      closeContextMenu()
    } else {
      setIsContextMenuOpen(true)
    }

    if (options?.realtimeLinked) {
      emitLinkedAnalysis(nextSlicers)
    }
  }

  useEffect(() => {
    setChartAnnotation(resolveChartAnnotation(payloadModel))
  }, [payloadModel])

  useEffect(() => {
    if (service) {
      return
    }

    setResolvedRows(payloadRows)
    setLatestQueryResult({
      data: payloadRows
    })
  }, [payloadRows, service])

  useEffect(() => {
    if (chartSettings) {
      engine.settings = chartSettings
    }
  }, [engine, chartSettings])

  useEffect(() => {
    engine.options = resolveChartOptions(payloadModel)
  }, [engine, payloadModel])

  useEffect(() => {
    if (!effectiveChartAnnotation) {
      return
    }
    engine.chartAnnotation = effectiveChartAnnotation
  }, [effectiveChartAnnotation, engine])

  useEffect(() => {
    if (service) {
      return
    }

    const data: QueryReturn<Record<string, unknown>> = {
      data: resolvedRows
    }
    engine.data = data
  }, [engine, resolvedRows, service])

  useEffect(() => {
    if (!service) {
      return
    }

    service.dataSettings = projectedDataSettings as never
  }, [projectedDataSettings, service])

  useEffect(() => {
    if (!service?.loading$) {
      setIsLoading(false)
      return
    }

    const subscription = service.loading$.subscribe(value => {
      setIsLoading(Boolean(value))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [service])

  useEffect(() => {
    if (!service) {
      return
    }

    const subscription = service.selectResult().subscribe(result => {
      const nextError = asRecord(result)?.error
      if (nextError) {
        setError(String(nextError))
        return
      }

      setError(null)
      setResolvedRows(Array.isArray(result.data) ? result.data : [])
      setLatestQueryResult(result as QueryReturn<Record<string, unknown>>)
      engine.data = result as QueryReturn<Record<string, unknown>>
      if (effectiveChartAnnotation) {
        engine.chartAnnotation = effectiveChartAnnotation
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [effectiveChartAnnotation, engine, service, setError])

  useEffect(() => {
    if (!service) {
      return
    }

    const subscription = service.onAfterServiceInit().subscribe(async () => {
      const nextEntityType = await service.getEntityType()
      setEntityType(nextEntityType)
      engine.entityType = nextEntityType
      isServiceReadyRef.current = true
      service.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [engine, service])

  useEffect(() => {
    if (!service) {
      previousProjectedDataSettingsRef.current = projectedDataSettings
      return
    }

    const previous = previousProjectedDataSettingsRef.current
    previousProjectedDataSettingsRef.current = projectedDataSettings

    if (!isServiceReadyRef.current || previous === projectedDataSettings) {
      return
    }

    service.refresh()
  }, [projectedDataSettings, service])

  useEffect(() => {
    const subscription = subscribeIfPossible<{ event?: unknown; slicers?: ISlicer[] }>(engine.selectChanged$, event => {
      openContextMenu(asSlicers(event?.slicers), event?.event)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [engine.selectChanged$, options?.disableContextMenu, options?.realtimeLinked])

  useEffect(() => {
    const subscription = subscribeIfPossible<Record<string, unknown>>(engine.chartContextMenu$, event => {
      chartContextMenu?.(event)

      const rawEvent = asMouseLikeEvent(asRecord(event)?.event)
      rawEvent?.stopPropagation?.()
      rawEvent?.preventDefault?.()

      if (typeof engine.dispatchAction === 'function') {
        engine.dispatchAction({
          dataIndex: asRecord(event)?.dataIndex,
          name: asRecord(event)?.name,
          seriesId: asRecord(event)?.seriesId,
          seriesIndex: asRecord(event)?.seriesIndex,
          seriesName: asRecord(event)?.seriesName,
          type: 'unselect'
        })
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [chartContextMenu, engine])

  useEffect(() => {
    const subscription = subscribeIfPossible(engine.chartClick$, event => {
      chartClick?.(event)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [chartClick, engine.chartClick$])

  useEffect(() => {
    const subscription = subscribeIfPossible(engine.chartHighlight$, event => {
      chartHighlight?.(event)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [chartHighlight, engine.chartHighlight$])

  useEffect(() => {
    if (!explain) {
      return
    }

    explain([
      projectedDataSettings,
      latestQueryResult,
      echartsOption
    ])
  }, [echartsOption, explain, latestQueryResult, projectedDataSettings])

  useEffect(() => {
    if (!hasObservedChartOptionsRef.current) {
      hasObservedChartOptionsRef.current = true
      return
    }

    openContextMenu([])
  }, [echartsOption])

  const drillDimensions = useMemo(() => {
    if (!effectiveEntityType) {
      return []
    }

    return resolvePresentationGroupBy(analyticalState.state.dataSettings)
      .map(item => {
        const dimension = item as Record<string, unknown>
        const property = getEntityProperty(effectiveEntityType, dimension as never) as Property | null
        return {
          dimension,
          property,
          disabled: analyticalState.state.selectedDrilledDimensions.some(
            selected => getPropertyName(selected.dimension as never) === getPropertyName(dimension as never)
          )
        }
      })
      .filter(item => Boolean(item.property))
  }, [analyticalState.state.dataSettings, analyticalState.state.selectedDrilledDimensions, effectiveEntityType])

  const drillLevelGroups = useMemo(() => {
    if (!effectiveEntityType || !chartAnnotation) {
      return []
    }

    return (chartAnnotation.dimensions ?? [])
      .map(dimension => {
        const hierarchy = getEntityHierarchy(effectiveEntityType, dimension as never)
        if (!hierarchy?.levels?.length) {
          return null
        }

        const selectedSlicer = analyticalState.state.selectedSlicers[0]
        const slicer = isAdvancedFilter(selectedSlicer)
          ? selectedSlicer.children?.find(item => item.dimension?.dimension === dimension.dimension)
          : selectedSlicer

        if (!slicer || slicer.dimension?.dimension !== dimension.dimension) {
          return null
        }

        const slicerLevel = getEntityLevel(effectiveEntityType, slicer.dimension as never)
        const slicerLevelNumber = slicerLevel?.levelNumber ?? 0
        return {
          slicer,
          property: hierarchy,
          levels: hierarchy.levels.map(level => ({
            property: level,
            disabled: (level.levelNumber ?? 0) <= slicerLevelNumber
          })),
          slicerCaption: slicerAsString(slicer)
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [analyticalState.state.selectedSlicers, chartAnnotation, effectiveEntityType])

  const drillDimensionGroups = useMemo(() => {
    if (!effectiveEntityType) {
      return []
    }

    const selected = analyticalState.state.selectedSlicers
    const slicers = isAdvancedFilter(selected[0]) ? selected[0].children ?? [] : selected

    return slicers.map(slicer => {
      const property = getEntityProperty(effectiveEntityType, slicer.dimension as never) as Property | null
      return {
        slicer,
        label: `${property?.caption || property?.name || getPropertyName(slicer.dimension as never)}:${slicerAsString(slicer)}`
      }
    })
  }, [analyticalState.state.selectedSlicers, effectiveEntityType])

  const currentChartType = effectiveChartAnnotation?.chartType ?? null
  const chartTypes = uniqueChartTypes(currentChartType, chartSettings?.chartTypes)
  const cardTitle = typeof payloadModel.title === 'string'
    ? payloadModel.title
    : currentChartType?.name ?? currentChartType?.type ?? 'Chart'
  const isEmpty = resolvedRows.length === 0
  const showHeader = !options?.hideHeader
  const showDataDownload = !options?.hideDataDownload
  const showScreenshot = !options?.hideScreenshot
  const showSlicers = options?.showSlicers
  const drillDownTarget = analyticalState.state.selectedSlicers[0] ?? null

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm" data-testid="react-analytical-card">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
          <div className="min-w-0 text-sm font-semibold text-slate-900" data-testid="react-analytical-card-title">
            {cardTitle}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {chartTypes.map(chartType => {
              const selected = chartTypeKey(chartType) === chartTypeKey(currentChartType)
              return (
                <button
                  key={chartTypeKey(chartType)}
                  type="button"
                  className={
                    selected
                      ? 'rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'
                  }
                  onClick={() => {
                    setChartAnnotation(previous => {
                      if (!previous) {
                        return previous
                      }
                      return {
                        ...previous,
                        chartType
                      }
                    })
                  }}
                >
                  {chartType.name ?? chartType.type}
                </button>
              )
            })}

            {showSlicers ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                data-testid="react-analytical-card-slicer-action"
                onClick={() => {
                  setIsSlicersOpen(value => !value)
                }}
              >
                Slicers{analyticalState.state.slicers.length > 0 ? ' *' : ''}
              </button>
            ) : null}

            {isLoading ? (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                Loading
              </div>
            ) : (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                onClick={() => {
                  if (service) {
                    service.refresh(true)
                    return
                  }

                  if (chartSettings) {
                    engine.settings = chartSettings
                  }
                  engine.options = resolveChartOptions(payloadModel)
                  engine.data = { data: resolvedRows }
                  if (effectiveChartAnnotation) {
                    engine.chartAnnotation = effectiveChartAnnotation
                  }
                }}
              >
                Refresh
              </button>
            )}

            {showDataDownload ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                disabled={resolvedRows.length === 0}
                onClick={() => {
                  const csv = toCsv(resolvedRows)
                  if (!csv) {
                    return
                  }
                  downloadBlob(`${title || 'data'}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
                }}
              >
                Download
              </button>
            ) : null}

            {showScreenshot ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                onClick={() => {
                  const baseImage = engine.echarts?.getDataURL?.({ type: 'png' })
                  if (!baseImage) {
                    return
                  }

                  const link = document.createElement('a')
                  document.body.appendChild(link)
                  link.href = baseImage
                  link.download = `${title || 'image'}.png`
                  link.click()
                  link.remove()
                }}
              >
                Screenshot
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {analyticalState.breadcrumbs.length > 0 ? (
        <div className="border-b border-slate-200/80 px-4 py-3" data-testid="react-analytical-card-breadcrumbs">
          <ReactBreadcrumbBar
            close={analyticalState.clearDrill}
            selectedChange={analyticalState.reselectDrill}
            steps={analyticalState.breadcrumbs}
          />
        </div>
      ) : null}

      {isSlicersOpen ? (
        <div className="border-b border-slate-200/80 px-4 py-3">
          <ReactSlicers
            capacities={['CombinationSlicer', 'AdvancedSlicer', 'Variable']}
            dataSettings={(payloadModel.dataSettings as Record<string, unknown>) ?? undefined}
            dimensions={payloadModel.interaction?.slicers?.dimensions ?? []}
            editable
            entityType={effectiveEntityType}
            service={service}
            slicers={analyticalState.state.slicers}
            valueChange={analyticalState.updateSlicers}
          />
        </div>
      ) : null}

      <div className="relative p-4">
        {isContextMenuOpen && analyticalState.state.selectedSlicers.length > 0 ? (
          <div
            className="absolute z-10 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            data-testid="react-analytical-card-context-menu"
            style={{
              left: Math.max(contextMenuPosition.x, 0),
              top: Math.max(contextMenuPosition.y, 0)
            }}
          >
            <button
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              data-testid="react-analytical-card-link-analysis"
              onClick={() => {
                emitLinkedAnalysis(analyticalState.state.selectedSlicers)
                closeContextMenu()
              }}
              type="button"
            >
              Link Analysis
            </button>

            {drillLevelGroups.length > 0 ? (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Drill Level
                </div>
                {drillLevelGroups.map((group, index) => (
                  <div key={`${group.property.name}-${index}`} className="mt-1">
                    <button
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      data-testid={`react-analytical-card-drill-level-group-${index}`}
                      onClick={() => {
                        setActiveDrillLevelGroupIndex(previous => (previous === index ? null : index))
                        setActiveDrillDimensionGroupIndex(null)
                      }}
                      type="button"
                    >
                      <span className="truncate">{`${group.property.caption || group.property.name}:${group.slicerCaption}`}</span>
                    </button>

                    {activeDrillLevelGroupIndex === index ? (
                      <div className="mt-1 space-y-1 rounded-xl bg-slate-50 p-2">
                        {group.levels.map((item, levelIndex) => (
                          <button
                            key={item.property.name}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-white disabled:text-slate-400"
                            data-testid={`react-analytical-card-drill-level-option-${levelIndex}`}
                            disabled={item.disabled}
                            onClick={() => {
                              if (!effectiveEntityType) {
                                return
                              }

                              if (isAdvancedFilter(group.slicer)) {
                                const hierarchyLevelFor = asRecord(item.property)?.hierarchyLevelFor
                                const parentFilter = group.slicer.children.find(
                                  child => getPropertyHierarchy(child.dimension as never) === hierarchyLevelFor
                                )
                                if (!parentFilter) {
                                  return
                                }

                                analyticalState.drill({
                                  parent: parentFilter.dimension ?? {},
                                  slicer: {
                                    ...parentFilter,
                                    drill: Drill.Children
                                  },
                                  dimension: parseDimension(item.property.name, effectiveEntityType) ?? {}
                                })
                              } else {
                                analyticalState.drill({
                                  parent: group.slicer.dimension ?? {},
                                  slicer: {
                                    ...group.slicer,
                                    drill: Drill.Children
                                  },
                                  dimension: parseDimension(item.property.name, effectiveEntityType) ?? {}
                                })
                              }
                              closeContextMenu()
                            }}
                            type="button"
                          >
                            <ReactEntityProperty property={item.property} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {drillDimensionGroups.length > 0 && drillDimensions.length > 0 ? (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Drill Dimension
                </div>
                {drillDimensionGroups.map((group, index) => (
                  <div key={`${group.label}-${index}`} className="mt-1">
                    <button
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      data-testid={`react-analytical-card-drill-dimension-group-${index}`}
                      onClick={() => {
                        setActiveDrillDimensionGroupIndex(previous => (previous === index ? null : index))
                        setActiveDrillLevelGroupIndex(null)
                      }}
                      type="button"
                    >
                      <span className="truncate">{group.label}</span>
                    </button>

                    {activeDrillDimensionGroupIndex === index ? (
                      <div className="mt-1 space-y-1 rounded-xl bg-slate-50 p-2">
                        {drillDimensions.map((item, dimensionIndex) => (
                          <button
                            key={getPropertyName(item.dimension as never)}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-white disabled:text-slate-400"
                            data-testid={`react-analytical-card-drill-dimension-option-${dimensionIndex}`}
                            disabled={item.disabled}
                            onClick={() => {
                              analyticalState.drill({
                                parent: group.slicer.dimension ?? {},
                                dimension: item.dimension,
                                slicer: group.slicer
                              })
                              closeContextMenu()
                            }}
                            type="button"
                          >
                            <ReactEntityProperty property={item.property} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {drillDownTarget ? (
              <button
                className="mt-2 flex w-full items-center rounded-xl border-t border-slate-100 px-3 py-2 pt-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                data-testid="react-analytical-card-drill-down"
                onClick={() => {
                  analyticalState.drillDown(drillDownTarget)
                  closeContextMenu()
                }}
                type="button"
              >
                Drill Down
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-sm text-rose-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="error">
                🐞
              </span>
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        {!error && isEmpty ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="empty">
                🛒
              </span>
              <span>Data Empty</span>
            </div>
          </div>
        ) : null}

        {!error && !isEmpty ? (
          <ReactECharts
            lazyUpdate
            notMerge
            onChartReady={instance => {
              engine.echarts = instance as never
            }}
            option={echartsOption}
            style={{ width: '100%', height: 320 }}
          />
        ) : null}
      </div>
    </div>
  )
}

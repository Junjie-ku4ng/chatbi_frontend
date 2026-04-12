'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { applyNexusChartTheme } from './chart-theme'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'
import type { AnswerComponentPayload } from './types'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type ISlicer = Record<string, unknown>

type AnalyticalCardOptions = {
  showSlicers?: boolean
  hideHeader?: boolean
  hideRefresh?: boolean
  hideLoading?: boolean
  hideScreenshot?: boolean
  hideDataDownload?: boolean
  disableContextMenu?: boolean
  realtimeLinked?: boolean
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function looksLikeEchartsOption(value: unknown) {
  const record = asRecord(value)
  if (!record) {
    return false
  }

  const series = Array.isArray(record.series) ? record.series : []
  const hasEchartsSeriesShape = series.some(item => {
    const seriesRecord = asRecord(item)
    if (!seriesRecord) {
      return false
    }

    return (
      typeof seriesRecord.type === 'string' ||
      Array.isArray(seriesRecord.data) ||
      asRecord(seriesRecord.encode) !== undefined
    )
  })

  return (
    record.xAxis !== undefined ||
    record.yAxis !== undefined ||
    record.dataset !== undefined ||
    record.legend !== undefined ||
    record.tooltip !== undefined ||
    hasEchartsSeriesShape
  )
}

function findNestedEchartsOption(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value)
  if (!record) {
    return undefined
  }

  if (looksLikeEchartsOption(record)) {
    return record
  }

  const nestedCandidates: unknown[] = [
    record.option,
    record.echartsOption,
    record.echartsOptions,
    record.chartOptions,
    asRecord(record.output)?.option,
    asRecord(record.output)?.echartsOption,
    asRecord(record.output)?.echartsOptions,
    asRecord(record.output)?.chartOptions
  ]

  for (const candidate of nestedCandidates) {
    const resolved = findNestedEchartsOption(candidate)
    if (resolved) {
      return resolved
    }
  }

  return undefined
}

function resolveEchartsOption(payload: Record<string, unknown>) {
  const candidates: unknown[] = [
    payload.option,
    payload.echartsOption,
    payload.echartsOptions,
    payload.chartOptions,
    asRecord(payload.output)?.option,
    asRecord(payload.output)?.echartsOption,
    asRecord(payload.output)?.echartsOptions,
    asRecord(payload.output)?.chartOptions
  ]

  for (const candidate of candidates) {
    const resolved = findNestedEchartsOption(candidate)
    if (resolved) {
      return resolved
    }
  }

  return undefined
}

function normalizePoints(payload: Record<string, unknown>) {
  const points = Array.isArray(payload.points) ? payload.points : []
  if (points.length > 0) {
    return points
      .map(point => {
        const record = asRecord(point)
        if (!record) return null
        return {
          name: String(record.name ?? record.label ?? record.x ?? ''),
          value: Number(record.value ?? record.y ?? 0)
        }
      })
      .filter((point): point is { name: string; value: number } => point !== null)
  }

  const series = Array.isArray(payload.series) ? payload.series : []
  return series
    .map((point, index) => {
      const record = asRecord(point)
      if (!record) return null
      return {
        name: String(record.name ?? record.x ?? index + 1),
        value: Number(record.value ?? record.y ?? 0)
      }
    })
    .filter((point): point is { name: string; value: number } => point !== null)
}

function buildDefaultOption(payload: Record<string, unknown>) {
  const values = normalizePoints(payload)

  return {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: values.map(point => point.name),
      axisLabel: { color: '#616676' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#616676' }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: values.map(point => point.value),
        lineStyle: { color: '#1767a0', width: 3 },
        areaStyle: { color: 'rgba(23,103,160,0.16)' }
      }
    ],
    grid: {
      left: 40,
      right: 20,
      top: 30,
      bottom: 32
    }
  }
}

type ChartAnswerComponentProps = {
  payload: AnswerComponentPayload
  options?: AnalyticalCardOptions
  service?: AnalyticalCardServiceLike
  slicersChange?: (slicers: ISlicer[]) => void
  slicersChanging?: (slicers: ISlicer[]) => void
  chartClick?: (event: unknown) => void
  chartHighlight?: (event: unknown) => void
  chartContextMenu?: (event: unknown) => void
  explain?: (payload: unknown[]) => void
}

export function ChartAnswerComponent({
  chartClick,
  chartContextMenu,
  chartHighlight,
  explain,
  options,
  payload,
  service,
  slicersChange,
  slicersChanging
}: ChartAnswerComponentProps) {
  void chartClick
  void chartContextMenu
  void chartHighlight
  void explain
  void options
  void service
  void slicersChange
  void slicersChanging

  const option = useMemo(() => {
    const resolvedOption = resolveEchartsOption(payload)
    if (resolvedOption) {
      return applyNexusChartTheme(resolvedOption)
    }
    return applyNexusChartTheme(buildDefaultOption(payload))
  }, [payload])

  return (
    <>
      <div className="chat-assistant-answer-chart">
        <ReactECharts option={option} style={{ width: '100%', height: 280 }} notMerge lazyUpdate />
      </div>
    </>
  )
}

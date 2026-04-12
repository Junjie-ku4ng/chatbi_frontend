'use client'

import { useMemo } from 'react'
import { AnalyticalCardRuntimeBootstrap } from './analytical-card-runtime-bootstrap'
import { ChartAnswerComponent } from './chart-component'

export type RuntimeAnalyticalCardPreviewProps = {
  modelId: string
  xpertId?: string
  cube?: string
  title?: string
  measure?: string
  timeDimension?: string
  timeHierarchy?: string
  timeLevel?: string
  slicerDimension?: string
}

function normalizeText(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function RuntimeAnalyticalCardPreview({
  cube,
  measure,
  modelId,
  slicerDimension,
  timeDimension,
  timeHierarchy,
  timeLevel,
  title,
  xpertId
}: RuntimeAnalyticalCardPreviewProps) {
  const resolvedCube = normalizeText(cube) ?? 'Supermart Grocery Sales'
  const resolvedTitle = normalizeText(title) ?? '按月份看销售趋势'
  const resolvedMeasure = normalizeText(measure) ?? 'Sales'
  const resolvedTimeDimension = normalizeText(timeDimension) ?? 'Time Calendar'
  const resolvedTimeHierarchy = normalizeText(timeHierarchy) ?? resolvedTimeDimension
  const resolvedTimeLevel = normalizeText(timeLevel) ?? 'Month'
  const resolvedSlicerDimension = normalizeText(slicerDimension) ?? 'Region'
  const resolvedXpertId = normalizeText(xpertId) ?? modelId

  const payload = useMemo(
    () => ({
      title: resolvedTitle,
      dataSettings: {
        dataSource: modelId,
        entitySet: resolvedCube,
        chartAnnotation: {
          chartType: { type: 'Line', name: 'Line' },
          dimensions: [
            {
              dimension: resolvedTimeDimension,
              hierarchy: resolvedTimeHierarchy,
              level: resolvedTimeLevel
            }
          ],
          measures: [{ dimension: 'Measures', measure: resolvedMeasure, role: 'Axis1' }]
        }
      },
      chartSettings: {
        chartTypes: [{ type: 'Line', name: 'Line' }],
        locale: 'zh-Hans'
      },
      interaction: {
        slicers: {
          enabled: true,
          dimensions: [resolvedSlicerDimension]
        }
      }
    }),
    [
      modelId,
      resolvedCube,
      resolvedMeasure,
      resolvedSlicerDimension,
      resolvedTimeDimension,
      resolvedTimeHierarchy,
      resolvedTimeLevel,
      resolvedTitle
    ]
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2f7ff,transparent_35%),linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] px-6 py-10 text-slate-900">
      <AnalyticalCardRuntimeBootstrap activeXpertId={resolvedXpertId} modelId={modelId} />

      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Runtime AnalyticalCard Preview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Onyx x xpert runtime-hosted chart</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Default analytical-card runtime factory drives this preview through the transplanted xpert chart card.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <ChartAnswerComponent payload={payload} />
        </section>
      </div>
    </main>
  )
}

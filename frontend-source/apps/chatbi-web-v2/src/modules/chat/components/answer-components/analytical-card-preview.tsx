'use client'

import { BehaviorSubject, of, type Observable } from 'rxjs'
import { useMemo } from 'react'
import {
  AggregationRole,
  ChartMeasureRoleType,
  Semantics,
  Syntax,
  type IDimensionMember
} from '@metad/ocap-core'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'
import { ReactAnalyticalCard } from './react-analytical-card'

type PreviewEntityServiceLike = {
  selectMembers: (_dimension?: unknown) => Observable<IDimensionMember[]>
}

function buildPreviewMembers(): IDimensionMember[] {
  return [
    {
      memberKey: 'East',
      dimension: '[Region]',
      hierarchy: '[Region]',
      memberCaption: 'East'
    },
    {
      memberKey: 'West',
      dimension: '[Region]',
      hierarchy: '[Region]',
      memberCaption: 'West'
    },
    {
      memberKey: 'Central',
      dimension: '[Region]',
      hierarchy: '[Region]',
      memberCaption: 'Central'
    }
  ]
}

export function AnalyticalCardPreview() {
  const rows = useMemo(
    () => [
      {
        '[Time Calendar].[month]': '[2025].[1].[2025-01]',
        '[Time Calendar].[MEMBER_CAPTION]': '2025-01',
        Sales: 198761
      },
      {
        '[Time Calendar].[month]': '[2025].[2].[2025-02]',
        '[Time Calendar].[MEMBER_CAPTION]': '2025-02',
        Sales: 166267
      },
      {
        '[Time Calendar].[month]': '[2025].[3].[2025-03]',
        '[Time Calendar].[MEMBER_CAPTION]': '2025-03',
        Sales: 221904
      }
    ],
    []
  )

  const service = useMemo(() => {
    const loading$ = new BehaviorSubject(false)
    const result$ = new BehaviorSubject<{ data: Array<Record<string, unknown>> }>({
      data: rows
    })

    return {
      loading$,
      dataSettings: {
        dataSource: 'preview-model',
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
          measures: [{ dimension: 'Measures', measure: 'Sales', role: ChartMeasureRoleType.Axis1 }]
        }
      },
      entityService: {
        selectMembers: () => of(buildPreviewMembers())
      },
      onAfterServiceInit: () => of(void 0),
      selectResult: () => result$.asObservable(),
      getEntityType: async () => ({
        name: 'Supermart Grocery Sales',
        syntax: Syntax.MDX,
        properties: {
          '[Region]': {
            name: '[Region]',
            caption: 'Region',
            role: AggregationRole.dimension,
            visible: true,
            hierarchies: [{ name: '[Region]', caption: 'Region' }]
          },
          '[Time Calendar]': {
            name: '[Time Calendar]',
            caption: 'Time Calendar',
            role: AggregationRole.dimension,
            visible: true,
            semantics: {
              semantic: Semantics.Calendar
            },
            hierarchies: [{ name: '[Time Calendar].[Calendar]', caption: 'Calendar' }]
          },
          Sales: {
            name: 'Sales',
            caption: 'Sales',
            role: AggregationRole.measure,
            visible: true
          }
        }
      }),
      refresh: () => {
        result$.next({
          data: rows
        })
      },
      onDestroy: () => {
        loading$.complete()
        result$.complete()
      }
    } satisfies AnalyticalCardServiceLike & {
      entityService: PreviewEntityServiceLike
    }
  }, [rows])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2f7ff,transparent_35%),linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            AnalyticalCard Preview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Onyx x xpert chart direct-port</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Native prop-surface preview using the transplanted chart runtime, slicer value-help, and Onyx-style card
            shell.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <ReactAnalyticalCard
            chartOptions={{
              tooltip: { trigger: 'axis' }
            }}
            chartSettings={{
              locale: 'zh-Hans',
              chartTypes: [{ type: 'Line', name: 'Line' }]
            }}
            dataSettings={{
              dataSource: 'preview-model',
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
                measures: [{ dimension: 'Measures', measure: 'Sales', role: ChartMeasureRoleType.Axis1 }]
              }
            }}
            interaction={{
              slicers: {
                enabled: true,
                dimensions: ['[Region]']
              }
            }}
            options={{
              showSlicers: true
            }}
            rows={rows}
            service={service}
            title="按月份看收入趋势"
          />
        </section>
      </div>
    </main>
  )
}

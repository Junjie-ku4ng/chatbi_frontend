'use client'

import {
  calcOffsetRange,
  formatRangeCurrentPeriod,
  getEntityProperty,
  OffSetDirection,
  TimeGranularity,
  TimeRangeType,
  type EntityType,
  type TimeRange,
  type TimeRangesSlicer
} from '@metad/ocap-core'
import { useMemo, useState } from 'react'

type EditableTimeRange = {
  currentAmount: string
  currentDirection: OffSetDirection
  formatter: string
  granularity: TimeGranularity
  id: string
  lookAhead: string
  lookBack: string
  type: TimeRangeType
}

function createEditableTimeRange(range?: Partial<TimeRange>): EditableTimeRange {
  return {
    currentAmount:
      range?.current?.amount == null || Number.isNaN(Number(range.current.amount)) ? '' : String(range.current.amount),
    currentDirection: range?.current?.direction ?? OffSetDirection.LookBack,
    formatter: typeof range?.formatter === 'string' ? range.formatter : '',
    granularity: range?.granularity ?? TimeGranularity.Day,
    id: crypto.randomUUID(),
    lookAhead: range?.lookAhead == null || Number.isNaN(Number(range.lookAhead)) ? '' : String(range.lookAhead),
    lookBack: range?.lookBack == null || Number.isNaN(Number(range.lookBack)) ? '' : String(range.lookBack),
    type: range?.type ?? TimeRangeType.Standard
  }
}

function resolveNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? undefined : parsed
}

function resolveCurrentDateToken(_: TimeRangesSlicer['currentDate']) {
  return new Date()
}

function toTimeRange(range: EditableTimeRange): TimeRange {
  return {
    type: range.type,
    granularity: range.granularity,
    ...(range.type === TimeRangeType.Offset
      ? {
          current: {
            amount: resolveNumber(range.currentAmount) ?? 0,
            direction: range.currentDirection,
            granularity: range.granularity
          }
        }
      : {}),
    ...(range.lookBack.trim() ? { lookBack: resolveNumber(range.lookBack) } : {}),
    ...(range.lookAhead.trim() ? { lookAhead: resolveNumber(range.lookAhead) } : {}),
    ...(range.formatter.trim() ? { formatter: range.formatter.trim() } : {})
  }
}

function previewTimeRange(currentDate: TimeRangesSlicer['currentDate'], range: EditableTimeRange) {
  try {
    const resolved = toTimeRange(range)
    const current = resolveCurrentDateToken(currentDate)
    return {
      currentPeriod: formatRangeCurrentPeriod(current, resolved),
      result: calcOffsetRange(current, resolved)
    }
  } catch {
    return {
      currentPeriod: null,
      result: null as [string, string] | null
    }
  }
}

export function ReactTimeFilterEditor(props: {
  entityType?: EntityType | null
  initialValue?: Partial<TimeRangesSlicer> | null
  propertyName?: string | null
  onApply: (value: TimeRangesSlicer) => void
  onCancel: () => void
}) {
  const initialDimensionName =
    (typeof props.initialValue?.dimension === 'object' && props.initialValue?.dimension?.dimension) || props.propertyName || ''
  const initialHierarchy =
    typeof props.initialValue?.dimension === 'object' && props.initialValue?.dimension?.hierarchy
      ? props.initialValue.dimension.hierarchy
      : ''
  const [dimensionName] = useState(initialDimensionName)
  const [hierarchy, setHierarchy] = useState(initialHierarchy)
  const [currentDate, setCurrentDate] = useState<TimeRangesSlicer['currentDate']>(
    props.initialValue?.currentDate ?? 'TODAY'
  )
  const [ranges, setRanges] = useState<EditableTimeRange[]>(
    Array.isArray(props.initialValue?.ranges) && props.initialValue.ranges.length > 0
      ? props.initialValue.ranges.map(range => createEditableTimeRange(range))
      : [createEditableTimeRange()]
  )

  const property = useMemo(() => {
    if (!props.entityType || !dimensionName) {
      return null
    }
    return getEntityProperty(props.entityType, dimensionName)
  }, [dimensionName, props.entityType])

  const hierarchies = property?.hierarchies ?? []
  const canApply = Boolean(dimensionName) && ranges.length > 0

  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      data-testid="react-time-filter-editor"
    >
      <div className="text-sm font-semibold text-slate-800">
        {property?.caption ? `Set Date Range for ${property.caption}` : 'Set Date Range'}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>Current Date</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            data-testid="react-time-filter-current-date"
            onChange={event => {
              setCurrentDate(event.target.value as TimeRangesSlicer['currentDate'])
            }}
            value={currentDate}
          >
            <option value="SYSTEMTIME">System Date</option>
            <option value="TODAY">User Current Date</option>
          </select>
        </label>

        {hierarchies.length > 0 ? (
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Hierarchy</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              data-testid="react-time-filter-hierarchy"
              onChange={event => {
                setHierarchy(event.target.value)
              }}
              value={hierarchy}
            >
              <option value="">Default hierarchy</option>
              {hierarchies.map(item => (
                <option key={item.name} value={item.name}>
                  {item.caption || item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="space-y-3">
        {ranges.map((range, index) => {
          const preview = previewTimeRange(currentDate, range)
          return (
            <div
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3"
              data-testid={`react-time-filter-range-${index}`}
              key={range.id}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-700">
                  Range {index + 1}
                  {preview.result ? `: ${preview.result[0]} - ${preview.result[1]}` : ''}
                </div>
                {ranges.length > 1 ? (
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    data-testid={`react-time-filter-remove-${index}`}
                    onClick={() => {
                      setRanges(current => current.filter(item => item.id !== range.id))
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Range Type</span>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-time-filter-type-${index}`}
                    onChange={event => {
                      const type = event.target.value as TimeRangeType
                      setRanges(current =>
                        current.map(item =>
                          item.id === range.id
                            ? {
                                ...item,
                                type,
                                ...(type === TimeRangeType.Standard ? { currentAmount: '', currentDirection: OffSetDirection.LookBack } : {})
                              }
                            : item
                        )
                      )
                    }}
                    value={range.type}
                  >
                    <option value={TimeRangeType.Standard}>Standard</option>
                    <option value={TimeRangeType.Offset}>Offset</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Granularity</span>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-time-filter-granularity-${index}`}
                    onChange={event => {
                      const granularity = event.target.value as TimeGranularity
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, granularity } : item))
                      )
                    }}
                    value={range.granularity}
                  >
                    <option value={TimeGranularity.Year}>Year</option>
                    <option value={TimeGranularity.Quarter}>Quarter</option>
                    <option value={TimeGranularity.Month}>Month</option>
                    <option value={TimeGranularity.Week}>Week</option>
                    <option value={TimeGranularity.Day}>Day</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Look Back</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-time-filter-look-back-${index}`}
                    onChange={event => {
                      const lookBack = event.target.value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, lookBack } : item))
                      )
                    }}
                    onInput={event => {
                      const lookBack = (event.target as HTMLInputElement).value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, lookBack } : item))
                      )
                    }}
                    type="number"
                    value={range.lookBack}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Current Period</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                    data-testid={`react-time-filter-current-period-${index}`}
                    readOnly
                    value={preview.currentPeriod ?? ''}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Look Ahead</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-time-filter-look-ahead-${index}`}
                    onChange={event => {
                      const lookAhead = event.target.value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, lookAhead } : item))
                      )
                    }}
                    onInput={event => {
                      const lookAhead = (event.target as HTMLInputElement).value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, lookAhead } : item))
                      )
                    }}
                    type="number"
                    value={range.lookAhead}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>Formatter</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-time-filter-formatter-${index}`}
                    onChange={event => {
                      const formatter = event.target.value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, formatter } : item))
                      )
                    }}
                    onInput={event => {
                      const formatter = (event.target as HTMLInputElement).value
                      setRanges(current =>
                        current.map(item => (item.id === range.id ? { ...item, formatter } : item))
                      )
                    }}
                    value={range.formatter}
                  />
                </label>
              </div>

              {range.type === TimeRangeType.Offset ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    <span>Offset Direction</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      data-testid={`react-time-filter-offset-direction-${index}`}
                      onChange={event => {
                        const currentDirection = event.target.value as OffSetDirection
                        setRanges(current =>
                          current.map(item => (item.id === range.id ? { ...item, currentDirection } : item))
                        )
                      }}
                      value={range.currentDirection}
                    >
                      <option value={OffSetDirection.LookBack}>Look Back</option>
                      <option value={OffSetDirection.LookAhead}>Look Ahead</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    <span>Offset Amount</span>
                    <input
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      data-testid={`react-time-filter-offset-amount-${index}`}
                      onChange={event => {
                        const currentAmount = event.target.value
                        setRanges(current =>
                          current.map(item => (item.id === range.id ? { ...item, currentAmount } : item))
                        )
                      }}
                      onInput={event => {
                        const currentAmount = (event.target as HTMLInputElement).value
                        setRanges(current =>
                          current.map(item => (item.id === range.id ? { ...item, currentAmount } : item))
                        )
                      }}
                      type="number"
                      value={range.currentAmount}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
        data-testid="react-time-filter-add-range"
        onClick={() => {
          setRanges(current => [...current, createEditableTimeRange()])
        }}
        type="button"
      >
        Add Time Range
      </button>

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid="react-time-filter-cancel"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
          data-testid="react-time-filter-apply"
          disabled={!canApply}
          onClick={() => {
            props.onApply({
              currentDate,
              dimension: {
                dimension: dimensionName,
                ...(hierarchy ? { hierarchy } : {})
              },
              ranges: ranges.map(range => toTimeRange(range))
            })
          }}
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

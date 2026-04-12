'use client'

import {
  AdvancedSlicerOperator,
  DisplayBehaviour,
  getEntityDimensions,
  getEntityMeasures,
  type AdvancedSlicer,
  type EntityType
} from '@metad/ocap-core'
import { useMemo, useState } from 'react'
import { ReactEntityProperty } from './react-entity-property'

type AdvancedSlicerOperatorOption = {
  hasOther?: boolean
  label: string
  value: AdvancedSlicerOperator
  valueSize?: number
}

const ADVANCED_SLICER_OPERATORS: AdvancedSlicerOperatorOption[] = [
  { value: AdvancedSlicerOperator.Equal, label: 'Equal' },
  { value: AdvancedSlicerOperator.NotEqual, label: 'Not Equal' },
  { value: AdvancedSlicerOperator.LessThan, label: 'Less Than' },
  { value: AdvancedSlicerOperator.GreaterThan, label: 'Greater Than' },
  { value: AdvancedSlicerOperator.LessEqual, label: 'Less Equal' },
  { value: AdvancedSlicerOperator.GreaterEqual, label: 'Greater Equal' },
  { value: AdvancedSlicerOperator.Between, label: 'Between', valueSize: 2 },
  { value: AdvancedSlicerOperator.NotBetween, label: 'Not Between', valueSize: 2 },
  { value: AdvancedSlicerOperator.TopCount, label: 'Top Count', hasOther: true },
  { value: AdvancedSlicerOperator.BottomCount, label: 'Bottom Count', hasOther: true },
  { value: AdvancedSlicerOperator.TopPercent, label: 'Top Percent', hasOther: true },
  { value: AdvancedSlicerOperator.BottomPercent, label: 'Bottom Percent', hasOther: true },
  { value: AdvancedSlicerOperator.TopSum, label: 'Top Sum', hasOther: true },
  { value: AdvancedSlicerOperator.BottomSum, label: 'Bottom Sum', hasOther: true }
]

export function ReactAdvancedSlicerEditor(props: {
  entityType?: EntityType | null
  initialValue?: Partial<AdvancedSlicer> | null
  onApply: (value: AdvancedSlicer) => void
  onCancel: () => void
}) {
  const dimensions = useMemo(
    () => (props.entityType ? getEntityDimensions(props.entityType) : []),
    [props.entityType]
  )
  const measures = useMemo(
    () => (props.entityType ? getEntityMeasures(props.entityType) : []),
    [props.entityType]
  )

  const initialOperator =
    props.initialValue?.operator && ADVANCED_SLICER_OPERATORS.some(item => item.value === props.initialValue?.operator)
      ? props.initialValue.operator
      : AdvancedSlicerOperator.Equal

  const initialValue = Array.isArray(props.initialValue?.value)
    ? props.initialValue.value
    : props.initialValue?.value != null
      ? [props.initialValue.value, null]
      : [null, null]

  const [selectedContexts, setSelectedContexts] = useState<string[]>(
    Array.isArray(props.initialValue?.context)
      ? props.initialValue.context
          .map(item => (item && typeof item.dimension === 'string' ? item.dimension : null))
          .filter((item): item is string => Boolean(item))
      : []
  )
  const [operator, setOperator] = useState<AdvancedSlicerOperator>(initialOperator)
  const [value0, setValue0] = useState(initialValue[0] == null ? '' : String(initialValue[0]))
  const [value1, setValue1] = useState(initialValue[1] == null ? '' : String(initialValue[1]))
  const [measure, setMeasure] = useState(props.initialValue?.measure ?? measures[0]?.name ?? '')
  const [other, setOther] = useState(Boolean(props.initialValue?.other))

  const selectedOperator = useMemo(
    () => ADVANCED_SLICER_OPERATORS.find(item => item.value === operator) ?? ADVANCED_SLICER_OPERATORS[0],
    [operator]
  )
  const showValueTo = selectedOperator.valueSize === 2
  const showOther = Boolean(selectedOperator.hasOther)

  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      data-testid="react-advanced-slicer-editor"
    >
      <div className="text-sm font-semibold text-slate-800">Advanced Slicer</div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Context</div>
        <div className="flex flex-wrap gap-2">
          {dimensions.map(property => {
            const selected = selectedContexts.includes(property.name)
            return (
              <button
                className={
                  selected
                    ? 'rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-left text-xs font-medium text-sky-700'
                    : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs font-medium text-slate-700'
                }
                data-testid={`react-advanced-slicer-context-${property.name}`}
                key={property.name}
                onClick={() => {
                  setSelectedContexts(current =>
                    current.includes(property.name)
                      ? current.filter(item => item !== property.name)
                      : [...current, property.name]
                  )
                }}
                type="button"
              >
                <ReactEntityProperty displayBehaviour={DisplayBehaviour.auto} property={property} />
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Operator</span>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          data-testid="react-advanced-slicer-operator"
          onChange={event => {
            const next = event.target.value as AdvancedSlicerOperator
            setOperator(next)
            if (!ADVANCED_SLICER_OPERATORS.find(item => item.value === next)?.hasOther) {
              setOther(false)
            }
            if (ADVANCED_SLICER_OPERATORS.find(item => item.value === next)?.valueSize !== 2) {
              setValue1('')
            }
          }}
          value={operator}
        >
          {ADVANCED_SLICER_OPERATORS.map(item => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {showOther ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={other}
            data-testid="react-advanced-slicer-other"
            onChange={event => {
              setOther(event.target.checked)
            }}
            onClick={event => {
              setOther((event.target as HTMLInputElement).checked)
            }}
            type="checkbox"
          />
          <span>Enable Other</span>
        </label>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>{showValueTo ? 'From' : 'Value'}</span>
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            data-testid="react-advanced-slicer-value-0"
            onChange={event => {
              setValue0(event.target.value)
            }}
            onInput={event => {
              setValue0((event.target as HTMLInputElement).value)
            }}
            value={value0}
          />
        </label>

        {showValueTo ? (
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>To</span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              data-testid="react-advanced-slicer-value-1"
              onChange={event => {
                setValue1(event.target.value)
              }}
              onInput={event => {
                setValue1((event.target as HTMLInputElement).value)
              }}
              value={value1}
            />
          </label>
        ) : null}
      </div>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Measure</span>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          data-testid="react-advanced-slicer-measure"
          onChange={event => {
            setMeasure(event.target.value)
          }}
          value={measure}
        >
          <option value="">Select measure</option>
          {measures.map(property => (
            <option key={property.name} value={property.name}>
              {property.caption || property.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid="react-advanced-slicer-cancel"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
          data-testid="react-advanced-slicer-apply"
          disabled={!measure || !value0.trim()}
          onClick={() => {
            props.onApply({
              context: selectedContexts.map(dimension => ({ dimension })),
              measure,
              operator,
              other: showOther ? other : undefined,
              value: [value0.trim(), showValueTo ? value1.trim() || null : null]
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

'use client'

import {
  AggregationRole,
  DisplayBehaviour,
  FilterSelectionType,
  VariableSelectionType,
  type Dimension,
  type ISlicer,
  type Property,
  type VariableProperty
} from '@metad/ocap-core'
import { useEffect, useMemo, useState } from 'react'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'
import { ReactMemberValueHelp } from './react-member-value-help'

function selectionTypeForVariable(property: VariableProperty) {
  return property.variableSelectionType === VariableSelectionType.Value
    ? FilterSelectionType.Single
    : FilterSelectionType.Multiple
}

function resolvePropertyName(initialValue?: ISlicer | null) {
  if (typeof initialValue?.dimension === 'object' && initialValue.dimension?.parameter) {
    return initialValue.dimension.parameter
  }

  if (typeof initialValue?.dimension === 'object' && initialValue.dimension?.dimension) {
    return initialValue.dimension.dimension
  }

  return ''
}

function buildValueHelpDimension(
  property: Property | VariableProperty,
  currentDimension?: Dimension
): Dimension {
  if (property.role === AggregationRole.variable) {
    const variable = property as VariableProperty
    return {
      dimension: variable.referenceDimension ?? property.name,
      hierarchy: currentDimension?.hierarchy ?? variable.referenceHierarchy ?? variable.referenceDimension ?? property.name,
      ...(currentDimension?.displayBehaviour ? { displayBehaviour: currentDimension.displayBehaviour } : {})
    }
  }

  return {
    dimension: property.name,
    hierarchy: currentDimension?.hierarchy ?? property.name,
    ...(currentDimension?.displayBehaviour ? { displayBehaviour: currentDimension.displayBehaviour } : {})
  }
}

function buildOutputSlicer(
  property: Property | VariableProperty,
  draftSlicer: ISlicer
): ISlicer {
  const valueHelpDimension = buildValueHelpDimension(
    property,
    typeof draftSlicer.dimension === 'object' ? draftSlicer.dimension : undefined
  )

  if (property.role === AggregationRole.variable) {
    const variable = property as VariableProperty
    return {
      ...draftSlicer,
      dimension: {
        ...valueHelpDimension,
        dimension: variable.referenceDimension ?? valueHelpDimension.dimension,
        parameter: variable.name
      },
      selectionType: draftSlicer.selectionType ?? selectionTypeForVariable(variable)
    }
  }

  return {
    ...draftSlicer,
    dimension: valueHelpDimension
  }
}

function normalizeInitialSlicer(initialValue?: ISlicer | null) {
  return {
    ...(initialValue ?? {}),
    members: Array.isArray(initialValue?.members) ? [...initialValue.members] : [],
    ...(initialValue?.selectionType ? { selectionType: initialValue.selectionType } : {})
  } as ISlicer
}

export function ReactSimpleSlicerEditor(props: {
  availableProperties: Array<Property | VariableProperty>
  initialValue?: ISlicer | null
  onApply: (value: ISlicer) => void
  onCancel: () => void
  service?: AnalyticalCardServiceLike
}) {
  const [isValueHelpOpen, setIsValueHelpOpen] = useState(false)
  const [propertyName, setPropertyName] = useState(() => resolvePropertyName(props.initialValue))
  const [draftSlicer, setDraftSlicer] = useState<ISlicer>(() => normalizeInitialSlicer(props.initialValue))

  useEffect(() => {
    setPropertyName(resolvePropertyName(props.initialValue))
    setDraftSlicer(normalizeInitialSlicer(props.initialValue))
    setIsValueHelpOpen(false)
  }, [props.initialValue])

  const propertyLookup = useMemo(
    () => new Map(props.availableProperties.map(property => [property.name, property] as const)),
    [props.availableProperties]
  )

  const selectedProperty = propertyLookup.get(propertyName)
  const effectiveDimension = selectedProperty
    ? buildValueHelpDimension(
        selectedProperty,
        typeof draftSlicer.dimension === 'object' ? draftSlicer.dimension : undefined
      )
    : undefined

  const selectedMembers = Array.isArray(draftSlicer.members) ? draftSlicer.members : []
  const canApply = Boolean(selectedProperty) && selectedMembers.length > 0

  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      data-testid="react-simple-slicer-editor"
    >
      <div className="text-sm font-semibold text-slate-800">Slicer</div>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        <span>Dimension</span>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          data-testid="react-simple-slicer-dimension"
          onChange={event => {
            const nextProperty = propertyLookup.get(event.target.value)
            setPropertyName(event.target.value)
            setIsValueHelpOpen(false)
            setDraftSlicer(current => {
              if (!nextProperty) {
                return {
                  ...current,
                  members: []
                }
              }

              const nextSelectionType =
                nextProperty.role === AggregationRole.variable
                  ? selectionTypeForVariable(nextProperty as VariableProperty)
                  : current.selectionType

              return {
                ...current,
                members: [],
                dimension: buildValueHelpDimension(nextProperty),
                exclude: false,
                ...(nextSelectionType ? { selectionType: nextSelectionType } : {})
              }
            })
          }}
          value={propertyName}
        >
          <option value="">Select dimension</option>
          {props.availableProperties.map(property => (
            <option key={property.name} value={property.name}>
              {property.caption || property.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800">Dimension Members</div>
            <div className="mt-1 text-xs text-slate-500">
              {selectedMembers.length > 0
                ? `${selectedMembers.length} selected`
                : 'No members selected'}
            </div>
          </div>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400"
            data-testid="react-simple-slicer-open-value-help"
            disabled={!selectedProperty}
            onClick={() => {
              setIsValueHelpOpen(true)
            }}
            type="button"
          >
            Browse Members
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedMembers.map(member => (
            <span
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              data-testid={`react-simple-slicer-member-${member.key ?? member.value}`}
              key={`${member.key ?? member.value}`}
            >
              {member.caption || member.label || member.value || member.key}
            </span>
          ))}
          {selectedMembers.length === 0 ? (
            <span className="text-xs text-slate-500">Use value-help to choose members</span>
          ) : null}
        </div>
      </div>

      {isValueHelpOpen && selectedProperty && effectiveDimension ? (
        <ReactMemberValueHelp
          dimension={{
            ...effectiveDimension,
            ...(effectiveDimension.displayBehaviour ? {} : { displayBehaviour: DisplayBehaviour.auto })
          }}
          initialSlicer={{
            ...draftSlicer,
            dimension: effectiveDimension
          }}
          onApply={value => {
            const nextValue = buildOutputSlicer(selectedProperty, value)
            setDraftSlicer(nextValue)
            setIsValueHelpOpen(false)
            props.onApply(nextValue)
          }}
          onCancel={() => {
            setIsValueHelpOpen(false)
          }}
          service={props.service}
        />
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid="react-simple-slicer-cancel"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
          data-testid="react-simple-slicer-apply"
          disabled={!canApply}
          onClick={() => {
            const property = propertyLookup.get(propertyName)
            if (!property) {
              return
            }

            props.onApply(buildOutputSlicer(property, draftSlicer))
          }}
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

'use client'

import {
  advancedSlicerAsString,
  AggregationRole,
  getEntityProperty,
  isAdvancedFilter,
  isAdvancedSlicer,
  DisplayBehaviour,
  FilterSelectionType,
  Syntax,
  isSemanticCalendar,
  isTimeRangesSlicer,
  VariableSelectionType,
  getEntityDimensions,
  getEntityVariables,
  slicerAsString,
  timeRangesSlicerAsString,
  type AdvancedSlicer,
  type EntityType,
  type IAdvancedFilter,
  type ISlicer,
  type Property,
  type TimeRangesSlicer,
  type VariableProperty
} from '@metad/ocap-core'
import { useMemo, useRef, useState } from 'react'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'
import { ReactAdvancedSlicerEditor } from './react-advanced-slicer-editor'
import { ReactCombinationSlicerEditor } from './react-combination-slicer-editor'
import { ReactEntityProperty } from './react-entity-property'
import { ReactSimpleSlicerEditor } from './react-simple-slicer-editor'
import { ReactTimeFilterEditor } from './react-time-filter-editor'
import { getDimensionName, removeSlicer, upsertSlicer } from './use-base-slicers'
import { XPERT_SLICER_DATE_VARIABLES } from './xpert-slicer-date-variables'

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function slicerLabel(slicer: ISlicer) {
  if (isAdvancedSlicer(slicer)) {
    return advancedSlicerAsString(slicer, 'on context')
  }
  if (isAdvancedFilter(slicer)) {
    return slicerAsString(slicer)
  }
  if (isTimeRangesSlicer(slicer)) {
    return timeRangesSlicerAsString(slicer, 'Time Ranges')
  }
  const members = Array.isArray(slicer.members) ? slicer.members : []
  const member = members[0]
  if (member && typeof member === 'object') {
    return asString(member.label) || asString(member.caption) || asString(member.value)
  }
  return asString(member)
}

function slicerTitle(slicer: ISlicer, entityType?: EntityType | null) {
  if (isAdvancedSlicer(slicer)) {
    return 'Advanced Slicer'
  }
  if (isAdvancedFilter(slicer)) {
    return 'Combination Slicer'
  }
  if (isTimeRangesSlicer(slicer)) {
    const property = getDimensionName(slicer)
    if (!property) {
      return 'Time Ranges'
    }
    return entityType ? getEntityProperty(entityType, property)?.caption || property : property
  }

  const dimension = slicer.dimension
  if (entityType && dimension?.parameter && entityType.parameters?.[dimension.parameter]) {
    const parameter = entityType.parameters[dimension.parameter]
    return parameter.caption || parameter.name
  }

  const property = getDimensionName(slicer)
  if (!property) {
    return ''
  }

  return entityType ? getEntityProperty(entityType, property)?.caption || property : property
}

function toFallbackDimensionProperty(name: string): Property {
  return {
    name,
    caption: name,
    role: AggregationRole.dimension
  } as Property
}

function mergeDimensionProperties(entityTypeProperties: Property[], fallbackDimensions: string[]) {
  const results = [...entityTypeProperties]
  const seen = new Set(results.map(property => property.name))

  for (const dimension of fallbackDimensions) {
    if (seen.has(dimension)) {
      continue
    }
    results.push(toFallbackDimensionProperty(dimension))
    seen.add(dimension)
  }

  return results
}

function replaceSlicerAtIndex(slicers: ISlicer[], index: number, slicer: ISlicer) {
  const next = [...slicers]
  next[index] = slicer
  return next
}

type EditorState =
  | {
      index: number | null
      initialValue?: Partial<AdvancedSlicer> | null
      kind: 'advanced'
    }
  | {
      index: number | null
      initialValue?: Partial<IAdvancedFilter> | null
      kind: 'combination'
    }
  | {
      index: number | null
      initialValue?: ISlicer | null
      kind: 'simple'
    }
  | {
      index: number | null
      initialValue?: Partial<TimeRangesSlicer> | null
      kind: 'time'
      propertyName?: string | null
    }

export function ReactSlicers(props: {
  capacities?: string[]
  dataSettings?: Record<string, unknown>
  dimensions: string[]
  entityType?: EntityType | null
  editable?: boolean
  service?: AnalyticalCardServiceLike
  slicers: ISlicer[]
  valueChange: (value: ISlicer[]) => void
}) {
  const [search, setSearch] = useState('')
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [calendarPropertyName, setCalendarPropertyName] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const draftRef = useRef({
    propertyName: props.dimensions[0] ?? ''
  })

  const availableDimensionProperties = useMemo(() => {
    const entityDimensions = props.entityType ? getEntityDimensions(props.entityType) : []
    return mergeDimensionProperties(entityDimensions, props.dimensions)
  }, [props.dimensions, props.entityType])

  const availableVariables = useMemo(() => {
    if (!props.entityType || props.entityType.syntax !== Syntax.MDX) {
      return [] as VariableProperty[]
    }
    return getEntityVariables(props.entityType).filter(variable => variable.visible !== false)
  }, [props.entityType])

  const allAvailableProperties = useMemo(
    () => [...availableVariables, ...availableDimensionProperties],
    [availableDimensionProperties, availableVariables]
  )

  const searchText = search.trim().toLowerCase()
  const filteredDimensions = useMemo(() => {
    if (!searchText) {
      return availableDimensionProperties
    }
    return availableDimensionProperties.filter(property => {
      const caption = asString(property.caption).toLowerCase()
      return property.name.toLowerCase().includes(searchText) || caption.includes(searchText)
    })
  }, [availableDimensionProperties, searchText])

  const filteredVariables = useMemo(() => {
    if (!searchText) {
      return availableVariables
    }
    return availableVariables.filter(property => {
      const caption = asString(property.caption).toLowerCase()
      return property.name.toLowerCase().includes(searchText) || caption.includes(searchText)
    })
  }, [availableVariables, searchText])

  const propertyLookup = useMemo(() => {
    return new Map(allAvailableProperties.map(property => [property.name, property] as const))
  }, [allAvailableProperties])

  const selectedCalendarProperty = useMemo(() => {
    if (!calendarPropertyName) {
      return null
    }
    const property = propertyLookup.get(calendarPropertyName)
    return property && property.role === AggregationRole.dimension ? (property as Property) : null
  }, [calendarPropertyName, propertyLookup])

  const showCombinationSlicer =
    props.entityType?.syntax === Syntax.SQL && Boolean(props.capacities?.includes('CombinationSlicer'))
  const showAdvancedSlicer =
    props.entityType?.syntax === Syntax.MDX && Boolean(props.capacities?.includes('AdvancedSlicer'))
  const showVariable =
    props.entityType?.syntax === Syntax.MDX && Boolean(props.capacities?.includes('Variable'))

  function closeCreatorSurface() {
    setIsCreatorOpen(false)
    setCalendarPropertyName(null)
    setSearch('')
    setEditorState(current => (current?.index == null ? null : current))
  }

  function closeCreatorEditor() {
    setEditorState(current => (current?.index == null ? null : current))
  }

  function closeItemEditor() {
    setEditorState(current => (current?.index != null ? null : current))
  }

  function selectProperty(property: Property | VariableProperty) {
    draftRef.current.propertyName = property.name
    setCalendarPropertyName(null)
    setEditorState({
      kind: 'simple',
      index: null,
      initialValue: {
        dimension:
          property.role === AggregationRole.variable
            ? {
                dimension: (property as VariableProperty).referenceDimension ?? property.name,
                parameter: property.name
              }
            : {
                dimension: property.name
              },
        ...(property.role === AggregationRole.variable
          ? {
              selectionType:
                (property as VariableProperty).variableSelectionType === VariableSelectionType.Value
                  ? FilterSelectionType.Single
                  : FilterSelectionType.Multiple
            }
          : {})
      } as ISlicer
    })
  }

  function applyCreatorSlicer(value: ISlicer) {
    props.valueChange(upsertSlicer(props.slicers, value))
    closeCreatorSurface()
  }

  function applyEditorSlicer(value: ISlicer) {
    if (editorState?.index == null) {
      applyCreatorSlicer(value)
      return
    }

    props.valueChange(replaceSlicerAtIndex(props.slicers, editorState.index, value))
    closeItemEditor()
  }

  function openTimeFilterEditor(property: Property, options?: { index?: number | null; range?: TimeRangesSlicer['ranges'][number] }) {
    setEditorState({
      kind: 'time',
      index: options?.index ?? null,
      propertyName: property.name,
      initialValue: {
        currentDate: 'TODAY',
        dimension: {
          dimension: property.name
        },
        ranges: options?.range ? [options.range] : []
      }
    })
  }

  function openItemEditor(slicer: ISlicer, index: number) {
    closeCreatorSurface()

    if (isAdvancedSlicer(slicer)) {
      setEditorState({
        kind: 'advanced',
        index,
        initialValue: slicer
      })
      return
    }

    if (isAdvancedFilter(slicer)) {
      setEditorState({
        kind: 'combination',
        index,
        initialValue: slicer
      })
      return
    }

    if (isTimeRangesSlicer(slicer)) {
      setEditorState({
        kind: 'time',
        index,
        propertyName: getDimensionName(slicer) ?? null,
        initialValue: slicer
      })
      return
    }

    setEditorState({
      kind: 'simple',
      index,
      initialValue: slicer
    })
  }

  function renderEditor(state: EditorState, mode: 'creator' | 'item') {
    const onCancel = () => {
      if (mode === 'creator') {
        closeCreatorEditor()
      } else {
        closeItemEditor()
      }
    }

    if (state.kind === 'advanced') {
      return (
        <ReactAdvancedSlicerEditor
          entityType={props.entityType}
          initialValue={state.initialValue}
          onApply={value => {
            applyEditorSlicer(value as ISlicer)
          }}
          onCancel={onCancel}
        />
      )
    }

    if (state.kind === 'combination') {
      return (
        <ReactCombinationSlicerEditor
          entityType={props.entityType}
          initialValue={state.initialValue}
          onApply={value => {
            applyEditorSlicer(value as ISlicer)
          }}
          onCancel={onCancel}
        />
      )
    }

    if (state.kind === 'time') {
      return (
        <ReactTimeFilterEditor
          entityType={props.entityType}
          initialValue={state.initialValue}
          propertyName={state.propertyName}
          onApply={value => {
            applyEditorSlicer(value as ISlicer)
          }}
          onCancel={onCancel}
        />
      )
    }

    return (
      <ReactSimpleSlicerEditor
        availableProperties={allAvailableProperties}
        initialValue={state.initialValue ?? null}
        service={props.service}
        onApply={value => {
          applyEditorSlicer(value)
        }}
        onCancel={onCancel}
      />
    )
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
      data-testid="react-slicers"
    >
      <div className="mb-3 text-sm font-semibold text-slate-800">Slicers</div>

      {props.editable ? (
        <div className="mb-3 space-y-2">
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            data-testid="react-slicers-trigger"
            onClick={() => {
              if (isCreatorOpen) {
                closeCreatorSurface()
              } else {
                setIsCreatorOpen(true)
              }
            }}
            type="button"
          >
            Add
          </button>

          {isCreatorOpen ? (
            <div
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              data-testid="react-slicers-menu"
            >
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                data-testid="react-slicers-search"
                onChange={event => {
                  setSearch(event.target.value)
                }}
                onInput={event => {
                  setSearch((event.target as HTMLInputElement).value)
                }}
                placeholder="Search dimensions or variables"
                value={search}
              />

              <div className="flex flex-wrap gap-2">
                {showVariable
                  ? filteredVariables.map(property => (
                      <button
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs font-medium text-slate-700"
                        data-testid={`react-slicers-property-${property.name}`}
                        key={property.name}
                        onClick={() => {
                          setCalendarPropertyName(null)
                          setEditorState(null)
                          selectProperty(property)
                        }}
                        type="button"
                      >
                        <ReactEntityProperty
                          displayBehaviour={DisplayBehaviour.auto}
                          property={property}
                        />
                      </button>
                    ))
                  : null}

                {filteredDimensions.map(property => (
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs font-medium text-slate-700"
                    data-testid={`react-slicers-property-${property.name}`}
                    key={property.name}
                    onClick={() => {
                      if (isSemanticCalendar(property)) {
                        setEditorState(null)
                        setCalendarPropertyName(property.name)
                        return
                      }
                      setCalendarPropertyName(null)
                      setEditorState(null)
                      selectProperty(property)
                    }}
                    type="button"
                  >
                    <ReactEntityProperty
                      displayBehaviour={DisplayBehaviour.auto}
                      property={property}
                    />
                  </button>
                ))}

                {showCombinationSlicer ? (
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    data-testid="react-slicers-capacity-CombinationSlicer"
                    onClick={() => {
                      setCalendarPropertyName(null)
                      setEditorState({
                        kind: 'combination',
                        index: null,
                        initialValue: null
                      })
                    }}
                    type="button"
                  >
                    Combination Slicer
                  </button>
                ) : null}

                {showAdvancedSlicer ? (
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    data-testid="react-slicers-capacity-AdvancedSlicer"
                    onClick={() => {
                      setCalendarPropertyName(null)
                      setEditorState({
                        kind: 'advanced',
                        index: null,
                        initialValue: null
                      })
                    }}
                    type="button"
                  >
                    Advanced Slicer
                  </button>
                ) : null}
              </div>

              {selectedCalendarProperty ? (
                <div
                  className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  data-testid={`react-slicers-calendar-menu-${selectedCalendarProperty.name}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Calendar
                  </div>

                  <button
                    className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700"
                    data-testid={`react-slicers-calendar-members-${selectedCalendarProperty.name}`}
                    onClick={() => {
                      selectProperty(selectedCalendarProperty)
                    }}
                    type="button"
                  >
                    Dimension Members
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {XPERT_SLICER_DATE_VARIABLES.map(variable => (
                      <button
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs font-medium text-slate-700"
                        data-testid={`react-slicers-calendar-date-${variable.id}`}
                        key={variable.id}
                        onClick={() => {
                          openTimeFilterEditor(selectedCalendarProperty, { range: variable.dateRange })
                        }}
                        type="button"
                      >
                        {variable.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {editorState && editorState.index == null ? renderEditor(editorState, 'creator') : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {props.slicers.map((slicer, index) => (
          <div
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
            data-testid={`react-slicer-item-${index}`}
            key={`${getDimensionName(slicer) ?? 'dimension'}-${index}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700">{slicerTitle(slicer, props.entityType)}</div>
              <div className="mt-1 text-xs text-slate-500">{slicerLabel(slicer)}</div>
            </div>
            {props.editable ? (
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                  data-testid={`react-slicer-edit-${index}`}
                  onClick={() => {
                    openItemEditor(slicer, index)
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                  data-testid={`react-slicer-remove-${index}`}
                  onClick={() => {
                    props.valueChange(removeSlicer(props.slicers, index))
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {editorState && editorState.index != null ? (
        <div className="mt-3">{renderEditor(editorState, 'item')}</div>
      ) : null}
    </section>
  )
}

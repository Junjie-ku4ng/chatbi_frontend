'use client'

import {
  DisplayBehaviour,
  FilterSelectionType,
  getEntityProperty,
  type Dimension,
  type EntityType,
  type IDimensionMember,
  type IMember,
  type ISlicer
} from '@metad/ocap-core'
import { useEffect, useMemo, useState } from 'react'
import type { AnalyticalCardServiceLike } from './create-analytical-card-service'

type EntityServiceLike = {
  selectMembers: (dimension: Dimension) => {
    subscribe: (observer: (value: IDimensionMember[]) => void) => { unsubscribe(): void }
  }
}

function resolveEntityService(service?: AnalyticalCardServiceLike) {
  const candidate = service as AnalyticalCardServiceLike & {
    entityService?: EntityServiceLike
  }

  if (
    candidate?.entityService &&
    typeof candidate.entityService === 'object' &&
    typeof candidate.entityService.selectMembers === 'function'
  ) {
    return candidate.entityService
  }

  return undefined
}

function toMember(option: IDimensionMember): IMember {
  return {
    key: option.memberKey,
    value: option.memberKey,
    caption: option.memberCaption,
    label: option.memberCaption
  }
}

function includesText(member: IMember, query: string, displayBehaviour: DisplayBehaviour | '') {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  const caption = `${member.caption ?? member.label ?? ''}`.toLowerCase()
  const key = `${member.key ?? member.value ?? ''}`.toLowerCase()
  if (caption.includes(normalizedQuery)) {
    return true
  }

  return displayBehaviour !== DisplayBehaviour.descriptionOnly && key.includes(normalizedQuery)
}

function sameMember(a: IMember, b: IMember) {
  return `${a.key ?? a.value}` === `${b.key ?? b.value}`
}

export function ReactMemberValueHelp(props: {
  dimension: Dimension
  entityType?: EntityType | null
  initialSlicer?: ISlicer | null
  service?: AnalyticalCardServiceLike
  onApply: (value: ISlicer) => void
  onCancel: () => void
}) {
  const [availableMembers, setAvailableMembers] = useState<IMember[]>([])
  const [search, setSearch] = useState('')
  const [selectionType, setSelectionType] = useState<FilterSelectionType>(
    props.initialSlicer?.selectionType ?? FilterSelectionType.Multiple
  )
  const [excludeSelected, setExcludeSelected] = useState(Boolean(props.initialSlicer?.exclude))
  const [displayBehaviour, setDisplayBehaviour] = useState<DisplayBehaviour | ''>(
    props.dimension.displayBehaviour ?? ''
  )
  const [hierarchy, setHierarchy] = useState(props.dimension.hierarchy ?? props.dimension.dimension)
  const [selectedMembers, setSelectedMembers] = useState<IMember[]>(
    Array.isArray(props.initialSlicer?.members) ? [...props.initialSlicer.members] : []
  )

  const hierarchies = useMemo(() => {
    const property = props.entityType ? getEntityProperty(props.entityType, props.dimension) : null
    return property?.hierarchies ?? []
  }, [props.dimension, props.entityType])

  const filteredMembers = useMemo(() => {
    return availableMembers.filter(member => includesText(member, search, displayBehaviour))
  }, [availableMembers, displayBehaviour, search])

  useEffect(() => {
    const entityService = resolveEntityService(props.service)
    if (!entityService) {
      setAvailableMembers([])
      return
    }

    const subscription = entityService.selectMembers(props.dimension).subscribe(members => {
      setAvailableMembers((members ?? []).map(toMember))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.dimension, props.service])

  useEffect(() => {
    setSelectedMembers(Array.isArray(props.initialSlicer?.members) ? [...props.initialSlicer.members] : [])
    setSelectionType(props.initialSlicer?.selectionType ?? FilterSelectionType.Multiple)
    setExcludeSelected(Boolean(props.initialSlicer?.exclude))
  }, [props.initialSlicer])

  function toggleMember(member: IMember) {
    setSelectedMembers(current => {
      if (selectionType === FilterSelectionType.Single) {
        return [member]
      }

      const next = [...current]
      const index = next.findIndex(item => sameMember(item, member))
      if (index >= 0) {
        next.splice(index, 1)
      } else {
        next.push(member)
        if (selectionType === FilterSelectionType.SingleRange) {
          next.splice(0, Math.max(0, next.length - 2))
        }
      }
      return next
    })
  }

  return (
    <div
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="react-member-value-help"
    >
      <div className="text-sm font-semibold text-slate-900">{`Set Filters for ${props.dimension.dimension}`}</div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Display Behaviour</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                data-testid="react-member-value-help-display-behaviour"
                onChange={event => {
                  setDisplayBehaviour((event.target.value as DisplayBehaviour | '') || '')
                }}
                value={displayBehaviour}
              >
                <option value="">Auto</option>
                <option value={DisplayBehaviour.descriptionOnly}>Description</option>
                <option value={DisplayBehaviour.descriptionAndId}>Description ID</option>
                <option value={DisplayBehaviour.idAndDescription}>ID Description</option>
                <option value={DisplayBehaviour.idOnly}>ID</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Hierarchy</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                data-testid="react-member-value-help-hierarchy"
                onChange={event => {
                  setHierarchy(event.target.value)
                }}
                value={hierarchy}
              >
                <option value={props.dimension.dimension}>{props.dimension.dimension}</option>
                {hierarchies.map(item => (
                  <option key={item.name} value={item.name}>
                    {item.caption || item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Available Members</span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              data-testid="react-member-value-help-search"
              onChange={event => {
                setSearch(event.target.value)
              }}
              placeholder="Search members"
              value={search}
            />
          </label>

          <div className="max-h-72 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
            {filteredMembers.map(member => {
              const selected = selectedMembers.some(item => sameMember(item, member))
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                  data-testid={`react-member-value-help-option-${member.key}`}
                  key={`${member.key}`}
                  onClick={() => {
                    toggleMember(member)
                  }}
                  type="button"
                >
                  <span className="truncate">{member.caption || member.label || member.key}</span>
                  <span className="ml-2 shrink-0 text-xs opacity-70">{member.key}</span>
                </button>
              )
            })}
            {filteredMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                No members
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-sm font-semibold text-slate-800">Selected Members</div>
            <div className="space-y-2" data-testid="react-member-value-help-selected-members">
              {selectedMembers.map(member => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  data-testid={`react-member-value-help-selected-${member.key}`}
                  key={`${member.key}`}
                >
                  <span className="truncate">{member.caption || member.label || member.key}</span>
                  <button
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                    onClick={() => {
                      setSelectedMembers(current =>
                        current.filter(item => `${item.key ?? item.value}` !== `${member.key ?? member.value}`)
                      )
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {selectedMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                  No selection
                </div>
              ) : null}
            </div>

            <button
              className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              data-testid="react-member-value-help-clear"
              onClick={() => {
                setSelectedMembers([])
              }}
              type="button"
            >
              Clear Selection
            </button>
          </div>

          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Selection Type</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                data-testid="react-member-value-help-selection-type"
                onChange={event => {
                  setSelectionType(event.target.value as FilterSelectionType)
                }}
                value={selectionType}
              >
                <option value={FilterSelectionType.Single}>Single</option>
                <option value={FilterSelectionType.Multiple}>Multiple</option>
                <option value={FilterSelectionType.SingleRange}>Single Range</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                checked={excludeSelected}
                data-testid="react-member-value-help-exclude"
                onChange={event => {
                  setExcludeSelected(event.target.checked)
                }}
                type="checkbox"
              />
              <span>Exclude Selected</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid="react-member-value-help-cancel"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white"
          data-testid="react-member-value-help-apply"
          onClick={() => {
            props.onApply({
              ...(props.initialSlicer ?? {}),
              dimension: {
                ...props.dimension,
                hierarchy,
                ...(displayBehaviour ? { displayBehaviour } : {})
              },
              exclude: excludeSelected,
              members: selectedMembers,
              selectionType
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

'use client'

import {
  FILTER_OPERATOR_DESC,
  FilteringLogic,
  FilterOperator,
  getEntityDimensions,
  isAdvancedFilter,
  type EntityType,
  type IAdvancedFilter,
  type IFilter
} from '@metad/ocap-core'
import { useMemo, useState } from 'react'

type ExpressionConditionNode = {
  dimension: string
  id: string
  kind: 'condition'
  operator: FilterOperator
  value0: string
  value1: string
}

type ExpressionGroupNode = {
  children: ExpressionNode[]
  id: string
  kind: 'group'
  logic: FilteringLogic
}

type ExpressionNode = ExpressionConditionNode | ExpressionGroupNode

const FILTER_OPERATOR_OPTIONS = [
  FilterOperator.EQ,
  FilterOperator.NE,
  FilterOperator.BT,
  FilterOperator.GT,
  FilterOperator.GE,
  FilterOperator.LT,
  FilterOperator.LE
]

function getFilterOperatorLabel(operator: FilterOperator) {
  return (FILTER_OPERATOR_DESC as Record<string, string>)[operator] ?? operator
}

function createConditionNode(filter?: Partial<IFilter>): ExpressionConditionNode {
  return {
    dimension:
      typeof filter?.dimension === 'object' && filter.dimension?.dimension ? filter.dimension.dimension : '',
    id: crypto.randomUUID(),
    kind: 'condition',
    operator: filter?.operator ?? FilterOperator.EQ,
    value0:
      Array.isArray(filter?.members) && filter.members[0]?.value != null ? String(filter.members[0].value) : '',
    value1:
      Array.isArray(filter?.members) && filter.members[1]?.value != null ? String(filter.members[1].value) : ''
  }
}

function createGroupNode(logic = FilteringLogic.And, children?: ExpressionNode[]): ExpressionGroupNode {
  return {
    children: children && children.length > 0 ? children : [createConditionNode()],
    id: crypto.randomUUID(),
    kind: 'group',
    logic
  }
}

function fromFilterNode(filter: IFilter): ExpressionNode {
  if (isAdvancedFilter(filter)) {
    return createGroupNode(
      filter.filteringLogic,
      filter.children?.map(child => fromFilterNode(child)).filter(Boolean as never) ?? [createConditionNode()]
    )
  }

  return createConditionNode(filter)
}

function fromInitialValue(initialValue?: Partial<IAdvancedFilter> | null) {
  if (!Array.isArray(initialValue?.children) || initialValue.children.length === 0) {
    return createGroupNode(FilteringLogic.And)
  }

  return createGroupNode(
    initialValue.filteringLogic ?? FilteringLogic.And,
    initialValue.children.map(child => fromFilterNode(child))
  )
}

function serializeCondition(node: ExpressionConditionNode): IFilter {
  return {
    dimension: {
      dimension: node.dimension
    },
    operator: node.operator,
    members: [
      {
        caption: node.value0.trim(),
        key: node.value0.trim(),
        label: node.value0.trim(),
        value: node.value0.trim()
      },
      ...(node.operator === FilterOperator.BT && node.value1.trim()
        ? [
            {
              caption: node.value1.trim(),
              key: node.value1.trim(),
              label: node.value1.trim(),
              value: node.value1.trim()
            }
          ]
        : [])
    ]
  }
}

function serializeGroup(node: ExpressionGroupNode): IAdvancedFilter {
  return {
    filteringLogic: node.logic,
    children: node.children.map(child => {
      if (child.kind === 'group') {
        return serializeGroup(child)
      }
      return serializeCondition(child)
    })
  }
}

function updateNodeTree(group: ExpressionGroupNode, id: string, updater: (node: ExpressionNode) => ExpressionNode): ExpressionGroupNode {
  return {
    ...group,
    children: group.children.map(child => {
      if (child.id === id) {
        return updater(child)
      }
      if (child.kind === 'group') {
        return updateNodeTree(child, id, updater)
      }
      return child
    })
  }
}

function updateGroupTree(group: ExpressionGroupNode, id: string, updater: (node: ExpressionGroupNode) => ExpressionGroupNode): ExpressionGroupNode {
  if (group.id === id) {
    return updater(group)
  }

  return {
    ...group,
    children: group.children.map(child => {
      if (child.kind === 'group') {
        return updateGroupTree(child, id, updater)
      }
      return child
    })
  }
}

function removeNodeTree(group: ExpressionGroupNode, id: string): ExpressionGroupNode {
  return {
    ...group,
    children: group.children
      .filter(child => child.id !== id)
      .map(child => (child.kind === 'group' ? removeNodeTree(child, id) : child))
  }
}

function canApplyNode(node: ExpressionNode): boolean {
  if (node.kind === 'group') {
    return node.children.length > 0 && node.children.every(child => canApplyNode(child))
  }

  if (!node.dimension || !node.value0.trim()) {
    return false
  }
  if (node.operator === FilterOperator.BT && !node.value1.trim()) {
    return false
  }
  return true
}

function isRemovable(group: ExpressionGroupNode, isRoot: boolean) {
  return !isRoot && group.children.length > 0
}

function GroupEditor(props: {
  dimensions: ReturnType<typeof getEntityDimensions>
  group: ExpressionGroupNode
  isRoot?: boolean
  onAddAndGroup: (groupId: string) => void
  onAddCondition: (groupId: string) => void
  onAddOrGroup: (groupId: string) => void
  onRemoveNode: (id: string) => void
  onUpdateCondition: (id: string, patch: Partial<ExpressionConditionNode>) => void
  onUpdateGroupLogic: (id: string, logic: FilteringLogic) => void
  path: string
}) {
  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3"
      data-testid={`react-combination-slicer-group-${props.path}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-800">{props.isRoot ? 'Root Group' : 'Nested Group'}</div>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          data-testid={`react-combination-slicer-logic-${props.path}`}
          onChange={event => {
            props.onUpdateGroupLogic(props.group.id, Number(event.target.value) as FilteringLogic)
          }}
          value={props.group.logic}
        >
          <option value={FilteringLogic.And}>AND</option>
          <option value={FilteringLogic.Or}>OR</option>
        </select>
      </div>

      <div className="space-y-3">
        {props.group.children.map((child, index) => {
          if (child.kind === 'group') {
            return (
              <div className="space-y-2" key={child.id}>
                <GroupEditor
                  dimensions={props.dimensions}
                  group={child}
                  onAddAndGroup={props.onAddAndGroup}
                  onAddCondition={props.onAddCondition}
                  onAddOrGroup={props.onAddOrGroup}
                  onRemoveNode={props.onRemoveNode}
                  onUpdateCondition={props.onUpdateCondition}
                  onUpdateGroupLogic={props.onUpdateGroupLogic}
                  path={`${props.path}-group-${index}`}
                />
                {isRemovable(child, false) ? (
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    data-testid={`react-combination-slicer-remove-group-${props.path}-group-${index}`}
                    onClick={() => {
                      props.onRemoveNode(child.id)
                    }}
                    type="button"
                  >
                    Delete Group
                  </button>
                ) : null}
              </div>
            )
          }

          return (
            <div
              className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4"
              data-testid={`react-combination-slicer-condition-${props.path}-${index}`}
              key={child.id}
            >
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Dimension</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  data-testid={`react-combination-slicer-dimension-${props.path}-${index}`}
                  onChange={event => {
                    props.onUpdateCondition(child.id, { dimension: event.target.value })
                  }}
                  value={child.dimension}
                >
                  <option value="">Select dimension</option>
                  {props.dimensions.map(property => (
                    <option key={property.name} value={property.name}>
                      {property.caption || property.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Operator</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  data-testid={`react-combination-slicer-operator-${props.path}-${index}`}
                  onChange={event => {
                    const operator = event.target.value as FilterOperator
                    props.onUpdateCondition(child.id, {
                      operator,
                      ...(operator === FilterOperator.BT ? {} : { value1: '' })
                    })
                  }}
                  value={child.operator}
                >
                  {FILTER_OPERATOR_OPTIONS.map(operator => (
                    <option key={operator} value={operator}>
                      {getFilterOperatorLabel(operator)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>{child.operator === FilterOperator.BT ? 'From' : 'Value'}</span>
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  data-testid={`react-combination-slicer-value-0-${props.path}-${index}`}
                  onChange={event => {
                    props.onUpdateCondition(child.id, { value0: event.target.value })
                  }}
                  onInput={event => {
                    props.onUpdateCondition(child.id, { value0: (event.target as HTMLInputElement).value })
                  }}
                  value={child.value0}
                />
              </label>

              {child.operator === FilterOperator.BT ? (
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>To</span>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    data-testid={`react-combination-slicer-value-1-${props.path}-${index}`}
                    onChange={event => {
                      props.onUpdateCondition(child.id, { value1: event.target.value })
                    }}
                    onInput={event => {
                      props.onUpdateCondition(child.id, { value1: (event.target as HTMLInputElement).value })
                    }}
                    value={child.value1}
                  />
                </label>
              ) : (
                <div className="flex items-end">
                  {props.group.children.length > 1 ? (
                    <button
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      data-testid={`react-combination-slicer-remove-${props.path}-${index}`}
                      onClick={() => {
                        props.onRemoveNode(child.id)
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid={`react-combination-slicer-add-condition-${props.path}`}
          onClick={() => {
            props.onAddCondition(props.group.id)
          }}
          type="button"
        >
          Add Condition
        </button>
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid={`react-combination-slicer-add-and-group-${props.path}`}
          onClick={() => {
            props.onAddAndGroup(props.group.id)
          }}
          type="button"
        >
          Add AND Group
        </button>
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid={`react-combination-slicer-add-or-group-${props.path}`}
          onClick={() => {
            props.onAddOrGroup(props.group.id)
          }}
          type="button"
        >
          Add OR Group
        </button>
      </div>
    </div>
  )
}

export function ReactCombinationSlicerEditor(props: {
  entityType?: EntityType | null
  initialValue?: Partial<IAdvancedFilter> | null
  onApply: (value: IAdvancedFilter) => void
  onCancel: () => void
}) {
  const dimensions = useMemo(
    () => (props.entityType ? getEntityDimensions(props.entityType) : []),
    [props.entityType]
  )
  const [rootGroup, setRootGroup] = useState<ExpressionGroupNode>(() => fromInitialValue(props.initialValue))
  const canApply = canApplyNode(rootGroup)

  return (
    <div
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      data-testid="react-combination-slicer-editor"
    >
      <div className="text-sm font-semibold text-slate-800">Combination Slicer</div>

      <GroupEditor
        dimensions={dimensions}
        group={rootGroup}
        isRoot
        onAddAndGroup={groupId => {
          setRootGroup(current =>
            updateGroupTree(current, groupId, group => ({
              ...group,
              children: [...group.children, createGroupNode(FilteringLogic.And)]
            }))
          )
        }}
        onAddCondition={groupId => {
          setRootGroup(current =>
            updateGroupTree(current, groupId, group => ({
              ...group,
              children: [...group.children, createConditionNode()]
            }))
          )
        }}
        onAddOrGroup={groupId => {
          setRootGroup(current =>
            updateGroupTree(current, groupId, group => ({
              ...group,
              children: [...group.children, createGroupNode(FilteringLogic.Or)]
            }))
          )
        }}
        onRemoveNode={id => {
          setRootGroup(current => {
            const next = removeNodeTree(current, id)
            return next.children.length > 0 ? next : createGroupNode(current.logic)
          })
        }}
        onUpdateCondition={(id, patch) => {
          setRootGroup(current =>
            updateNodeTree(current, id, node => {
              if (node.kind !== 'condition') {
                return node
              }
              return { ...node, ...patch }
            })
          )
        }}
        onUpdateGroupLogic={(id, logic) => {
          setRootGroup(current =>
            updateGroupTree(current, id, group => ({
              ...group,
              logic
            }))
          )
        }}
        path="root"
      />

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          data-testid="react-combination-slicer-cancel"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
          data-testid="react-combination-slicer-apply"
          disabled={!canApply}
          onClick={() => {
            props.onApply(serializeGroup(rootGroup))
          }}
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

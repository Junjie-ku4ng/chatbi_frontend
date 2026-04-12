'use client'

import {
  AggregationRole,
  DisplayBehaviour,
  Semantics,
  isCalculationProperty,
  isIndicatorMeasureProperty,
  isMeasureControlProperty,
  isParameterProperty,
  isSemanticCalendar,
  type EntityProperty,
  type PropertyAttributes
} from '@metad/ocap-core'

export const SemanticIconMap = {
  [Semantics['Address.Country']]: 'public'
}

export function propertyIcon(property: EntityProperty) {
  let icon = null
  let label = null
  const semantic = property?.semantics?.semantic as keyof typeof SemanticIconMap | undefined
  switch (property?.role) {
    case AggregationRole.dimension:
      if (isSemanticCalendar(property)) {
        icon = 'schedule'
        label = 'Calendar'
      } else if (semantic && SemanticIconMap[semantic]) {
        icon = SemanticIconMap[semantic]
        label = semantic
      } else {
        icon = 'tag'
        label = 'Dimension'
      }
      break
    case AggregationRole.hierarchy:
      icon = 'h_mobiledata'
      label = 'Hierarchy'
      break
    case AggregationRole.level:
      icon = 'format_list_numbered_rtl'
      label = 'Level'
      break
    case AggregationRole.variable:
      icon = 'priority_high'
      label = 'Variable'
      break
    case AggregationRole.measure:
      if (isCalculationProperty(property)) {
        if (isMeasureControlProperty(property)) {
          icon = 'alternate_email'
          label = 'Measure Control'
        } else if (isIndicatorMeasureProperty(property)) {
          icon = 'trending_up'
          label = 'Indicator'
        } else {
          icon = 'functions'
          label = 'Calculation'
        }
      } else {
        icon = 'straighten'
        label = 'Measure'
      }
      break
    default:
      if (isParameterProperty(property)) {
        icon = 'alternate_email'
        label = 'Parameter'
      }
    }
  return { icon, label }
}

export function ReactEntityProperty({
  displayBehaviour,
  hiddenIcon = false,
  highlight,
  property,
  role
}: {
  property: (PropertyAttributes | EntityProperty) | null | undefined
  displayBehaviour?: DisplayBehaviour | string | null
  hiddenIcon?: boolean
  highlight?: string | null
  role?: AggregationRole | null
}) {
  const resolvedProperty = property ? ({ ...property, role: role ?? property.role } as EntityProperty) : null
  const icon = resolvedProperty ? propertyIcon(resolvedProperty).icon : null
  const caption = resolvedProperty?.caption || resolvedProperty?.name || ''

  const renderedText =
    highlight && caption.toLowerCase().includes(highlight.toLowerCase())
      ? caption
      : displayBehaviour === DisplayBehaviour.descriptionAndId
        ? `${caption} (${resolvedProperty?.name ?? ''})`
        : caption

  return (
    <div className="flex min-w-0 items-center gap-2" data-testid="react-entity-property">
      {!hiddenIcon && icon ? (
        <span className="shrink-0 text-slate-500" data-testid="react-entity-property-icon">
          {icon}
        </span>
      ) : null}
      <span className="truncate text-sm text-slate-700" data-testid="react-entity-property-label">
        {renderedText}
      </span>
    </div>
  )
}

import type { RuntimeMessageStep } from './chat-runtime-projection'

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

export type AssistantMessagePart = {
  type: string
  text?: string
  name?: string
  data?: unknown
}

export type ThreadAnalysisComponent = {
  type: 'table' | 'kpi' | 'chart'
  payload: Record<string, unknown>
}

export type ThreadClarification = {
  required: true
  message: string
  missingSlots: string[]
  candidateHints?: Record<string, string[]>
  resolvedContext?: Record<string, string>
  reasonCodes?: string[]
  exampleAnswers?: string[]
}

export type AssistantThreadTimelineItem =
  | {
      key: string
      kind: 'assistant_text'
      text: string
      timelineOrder?: number
    }
  | {
      key: string
      kind: 'plan_step'
      step: RuntimeMessageStep
      timelineOrder?: number
    }
  | {
      key: string
      kind: 'tool_step'
      step: RuntimeMessageStep
      timelineOrder?: number
    }
  | {
      key: string
      kind: 'analysis_component'
      component: ThreadAnalysisComponent
      timelineOrder?: number
    }
  | {
      key: string
      kind: 'clarification'
      clarification: ThreadClarification
      timelineOrder?: number
    }
  | {
      key: string
      kind: 'terminal_status'
      status: 'running' | 'done' | 'error'
      label: string
      timelineOrder?: number
    }

export type AssistantThreadTimelineSections = {
  runtimeItems: AssistantThreadTimelineItem[]
  contentItems: AssistantThreadTimelineItem[]
}

function sortTimelineItems(items: ReadonlyArray<AssistantThreadTimelineItem>) {
  return [...items].sort((left, right) => {
    const leftOrder = left.timelineOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.timelineOrder ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

function toAnalysisComponent(part: AssistantMessagePart) {
  if (part.type !== 'data' || part.name !== 'chatbi_component') {
    return null
  }

  const component = asRecord(part.data)
  const payload = asRecord(component?.payload)
  const type = component?.type

  if ((type !== 'table' && type !== 'kpi' && type !== 'chart') || !payload) {
    return null
  }

  return {
    type,
    payload
  } satisfies ThreadAnalysisComponent
}

function toClarification(part: AssistantMessagePart) {
  if (part.type !== 'data' || part.name !== 'chatbi_clarification') {
    return null
  }

  const clarification = asRecord(part.data)
  if (!clarification || clarification.required !== true || typeof clarification.message !== 'string') {
    return null
  }

  return clarification as ThreadClarification
}

function toTimelineMarkerOrder(part: AssistantMessagePart) {
  if (part.type !== 'data' || part.name !== 'chatbi_timeline_marker') {
    return undefined
  }

  const marker = asRecord(part.data)
  return asFiniteNumber(marker?.order)
}

function toPartTimelineOrder(part: AssistantMessagePart) {
  if (part.type !== 'data') {
    return undefined
  }

  const data = asRecord(part.data)
  return asFiniteNumber(data?.timelineOrder)
}

function resolveComponentLogicalKey(component: ThreadAnalysisComponent) {
  const payload = asRecord(component.payload) ?? {}
  const interaction = asRecord(payload.interaction)
  const explain = asRecord(interaction?.explain)
  const handoff = asRecord(payload.analysisHandoff)

  const stableIdentity =
    asString(payload.queryLogId) ??
    asString(explain?.queryLogId) ??
    asString(handoff?.queryLogId) ??
    asString(payload.traceKey) ??
    asString(explain?.traceKey) ??
    asString(handoff?.traceKey) ??
    asString(payload.id) ??
    asString(payload.componentId)

  if (stableIdentity) {
    return `${component.type}:${stableIdentity}`
  }

  const semanticIdentity = asString(payload.title) ?? asString(payload.name) ?? asString(payload.label)
  if (semanticIdentity) {
    return `${component.type}:${semanticIdentity}`
  }

  return `${component.type}:${JSON.stringify(component.payload)}`
}

function toRuntimeTimelineItem(step: RuntimeMessageStep): AssistantThreadTimelineItem | null {
  if (step.kind === 'component') {
    return null
  }

  if (step.kind === 'plan') {
    return {
      key: `plan:${step.id}:${step.runtimeEventId}`,
      kind: 'plan_step',
      step,
      timelineOrder: step.timelineOrder ?? undefined
    }
  }

  return {
    key: `step:${step.id}:${step.runtimeEventId}`,
    kind: 'tool_step',
    step,
    timelineOrder: step.timelineOrder ?? undefined
  }
}

export function buildAssistantThreadTimeline(input: {
  parts: ReadonlyArray<AssistantMessagePart>
  runtimeSteps: ReadonlyArray<RuntimeMessageStep>
  terminalStatus?: { status: 'running' | 'done' | 'error'; label: string } | null
}) {
  const contentItems: AssistantThreadTimelineItem[] = []
  const componentIndexByLogicalKey = new Map<string, number>()
  const clarificationMessages = new Set<string>()
  let pendingTimelineOrder: number | undefined

  for (const [index, part] of input.parts.entries()) {
    const markerOrder = toTimelineMarkerOrder(part)
    if (markerOrder !== undefined) {
      pendingTimelineOrder = markerOrder
      continue
    }

    if (part.type === 'text') {
      const text = typeof part.text === 'string' ? part.text : ''
      if (text.trim() !== '') {
        const previousItem = contentItems.at(-1)
        if (pendingTimelineOrder === undefined && previousItem?.kind === 'assistant_text') {
          contentItems[contentItems.length - 1] = {
            ...previousItem,
            text: `${previousItem.text}${text}`
          }
        } else {
          contentItems.push({
            key: `text:${index}`,
            kind: 'assistant_text',
            text,
            timelineOrder: pendingTimelineOrder
          })
        }
      }
      pendingTimelineOrder = undefined
      continue
    }

    const component = toAnalysisComponent(part)
    if (component) {
      const nextItem: AssistantThreadTimelineItem = {
        key: `component:${index}:${component.type}`,
        kind: 'analysis_component',
        component,
        timelineOrder: toPartTimelineOrder(part) ?? pendingTimelineOrder
      }
      const logicalKey = resolveComponentLogicalKey(component)
      const existingIndex = componentIndexByLogicalKey.get(logicalKey)
      if (existingIndex !== undefined) {
        const existingItem = contentItems[existingIndex]
        contentItems[existingIndex] = {
          ...nextItem,
          ...(existingItem?.timelineOrder !== undefined ? { timelineOrder: existingItem.timelineOrder } : {})
        }
      } else {
        componentIndexByLogicalKey.set(logicalKey, contentItems.length)
        contentItems.push(nextItem)
      }
      pendingTimelineOrder = undefined
      continue
    }

    const clarification = toClarification(part)
    if (clarification) {
      clarificationMessages.add(clarification.message.trim())
      contentItems.push({
        key: `clarification:${index}`,
        kind: 'clarification',
        clarification,
        timelineOrder: toPartTimelineOrder(part) ?? pendingTimelineOrder
      })
      pendingTimelineOrder = undefined
    }
  }

  const runtimeItems = [...input.runtimeSteps]
    .sort((left, right) => left.runtimeEventId - right.runtimeEventId)
    .map(toRuntimeTimelineItem)
    .filter((item): item is AssistantThreadTimelineItem => item !== null)

  const terminalItems: AssistantThreadTimelineItem[] = input.terminalStatus
    ? [
        {
          key: `terminal:${input.terminalStatus.status}:${input.terminalStatus.label}`,
          kind: 'terminal_status',
          status: input.terminalStatus.status,
          label: input.terminalStatus.label,
          timelineOrder: Number.MAX_SAFE_INTEGER
        }
      ]
    : []

  const filteredContentItems = contentItems.filter(item => {
    if (item.kind !== 'assistant_text') {
      return true
    }

    return !clarificationMessages.has(item.text.trim())
  })

  return [...runtimeItems, ...filteredContentItems, ...terminalItems]
}

export function partitionAssistantThreadTimeline(
  items: ReadonlyArray<AssistantThreadTimelineItem>
): AssistantThreadTimelineSections {
  const runtimeCandidates: AssistantThreadTimelineItem[] = []
  const contentCandidates: AssistantThreadTimelineItem[] = []

  for (const item of items) {
    if (item.kind === 'plan_step' || item.kind === 'tool_step' || item.kind === 'terminal_status') {
      runtimeCandidates.push(item)
      continue
    }

    contentCandidates.push(item)
  }

  const sortedContentItems = sortTimelineItems(contentCandidates)
  const firstContentOrder = sortedContentItems.find(item => item.timelineOrder !== undefined)?.timelineOrder
  const runtimeItems: AssistantThreadTimelineItem[] = []
  const contentItems = [...sortedContentItems]

  for (const item of sortTimelineItems(runtimeCandidates)) {
    if (firstContentOrder !== undefined && item.timelineOrder !== undefined && item.timelineOrder >= firstContentOrder) {
      contentItems.push(item)
      continue
    }

    runtimeItems.push(item)
  }

  return {
    runtimeItems: sortTimelineItems(runtimeItems),
    contentItems: sortTimelineItems(contentItems)
  }
}

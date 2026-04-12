import type { RuntimeMessageStep } from './chat-runtime-projection'

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
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
    }
  | {
      key: string
      kind: 'plan_step'
      step: RuntimeMessageStep
    }
  | {
      key: string
      kind: 'tool_step'
      step: RuntimeMessageStep
    }
  | {
      key: string
      kind: 'analysis_component'
      component: ThreadAnalysisComponent
    }
  | {
      key: string
      kind: 'clarification'
      clarification: ThreadClarification
    }
  | {
      key: string
      kind: 'terminal_status'
      status: 'running' | 'done' | 'error'
      label: string
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

function toRuntimeTimelineItem(step: RuntimeMessageStep): AssistantThreadTimelineItem | null {
  if (step.kind === 'component') {
    return null
  }

  if (step.kind === 'plan') {
    return {
      key: `plan:${step.id}:${step.runtimeEventId}`,
      kind: 'plan_step',
      step
    }
  }

  return {
    key: `step:${step.id}:${step.runtimeEventId}`,
    kind: 'tool_step',
    step
  }
}

export function buildAssistantThreadTimeline(input: {
  parts: ReadonlyArray<AssistantMessagePart>
  runtimeSteps: ReadonlyArray<RuntimeMessageStep>
  terminalStatus?: { status: 'running' | 'done' | 'error'; label: string } | null
}) {
  const textItems: AssistantThreadTimelineItem[] = []
  const trailingItems: AssistantThreadTimelineItem[] = []

  for (const [index, part] of input.parts.entries()) {
    if (part.type === 'text') {
      const text = typeof part.text === 'string' ? part.text.trim() : ''
      if (text) {
        textItems.push({
          key: `text:${index}`,
          kind: 'assistant_text',
          text
        })
      }
      continue
    }

    const component = toAnalysisComponent(part)
    if (component) {
      trailingItems.push({
        key: `component:${index}:${component.type}`,
        kind: 'analysis_component',
        component
      })
      continue
    }

    const clarification = toClarification(part)
    if (clarification) {
      trailingItems.push({
        key: `clarification:${index}`,
        kind: 'clarification',
        clarification
      })
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
          label: input.terminalStatus.label
        }
      ]
    : []

  return [...textItems, ...runtimeItems, ...trailingItems, ...terminalItems]
}

import {
  partitionAssistantThreadTimeline,
  type AssistantThreadTimelineItem
} from '@/modules/chat/runtime/chat-thread-timeline'
import type { RuntimeMessageStep } from '@/modules/chat/runtime/chat-runtime-projection'

export type DonorAnswerSectionKindV2 = 'markdown' | 'timeline' | 'clarification' | 'analysis' | 'status'

export type DonorAnswerSectionV2 = {
  key: string
  sectionKind: DonorAnswerSectionKindV2 | null
  item: AssistantThreadTimelineItem
}

export type DonorMessagePresentationV2 = {
  tone: 'clarification' | 'analysis' | 'chat'
  runtimeShellHeader: string
  runtimeStepItems: Array<Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }>>
  runtimeTerminalItems: Array<Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }>>
  finalAnswerSections: DonorAnswerSectionV2[]
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function resolveRuntimeActivityLabel(step: RuntimeMessageStep) {
  if (step.kind === 'plan') {
    return 'Thinking'
  }

  const detail = asRecord(step.detail)
  const title = asNonEmptyString(step.title)
  const detailMessage = asNonEmptyString(detail?.message)
  const sourceEvent = asNonEmptyString(step.sourceEvent)?.toLowerCase()
  const haystack = [title, detailMessage, sourceEvent].filter(Boolean).join(' ').toLowerCase()

  if (
    haystack.includes('context for cube') ||
    haystack.includes('resolve context') ||
    haystack.includes('resolving context')
  ) {
    return 'Resolving context'
  }

  if (
    haystack.includes('query executed') ||
    haystack.includes('execute query') ||
    haystack.includes('executing query')
  ) {
    return 'Executing query'
  }

  return title ? `Executing ${title}` : 'Executing tool'
}

function getRuntimeShellHeaderLabel(items: ReadonlyArray<AssistantThreadTimelineItem>) {
  const latestStep = [...items]
    .filter((item): item is Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }> => item.kind === 'plan_step' || item.kind === 'tool_step')
    .sort((left, right) => (right.timelineOrder ?? Number.MIN_SAFE_INTEGER) - (left.timelineOrder ?? Number.MIN_SAFE_INTEGER))[0]

  if (!latestStep) {
    const runtimeStatus = [...items]
      .filter((item): item is Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }> => item.kind === 'terminal_status')
      .sort((left, right) => (right.timelineOrder ?? Number.MIN_SAFE_INTEGER) - (left.timelineOrder ?? Number.MIN_SAFE_INTEGER))[0]
    return runtimeStatus?.label ?? 'Thinking…'
  }

  if (latestStep.kind === 'plan_step') {
    return 'Thinking'
  }

  return resolveRuntimeActivityLabel(latestStep.step)
}

function getAnswerSectionKind(item: AssistantThreadTimelineItem): DonorAnswerSectionKindV2 | null {
  if (item.kind === 'assistant_text') {
    return 'markdown'
  }

  if (item.kind === 'plan_step' || item.kind === 'tool_step') {
    return 'timeline'
  }

  if (item.kind === 'clarification') {
    return 'clarification'
  }

  if (item.kind === 'analysis_component' && item.component.type !== 'chart') {
    return 'analysis'
  }

  if (item.kind === 'terminal_status') {
    return 'status'
  }

  return null
}

function coalesceFinalAnswerSections(
  items: ReadonlyArray<AssistantThreadTimelineItem>
): DonorAnswerSectionV2[] {
  const sections: DonorAnswerSectionV2[] = []

  for (const item of items) {
    const sectionKind = getAnswerSectionKind(item)
    const previousSection = sections.at(-1)

    if (
      sectionKind === 'markdown' &&
      item.kind === 'assistant_text' &&
      previousSection?.sectionKind === 'markdown' &&
      previousSection.item.kind === 'assistant_text'
    ) {
      sections[sections.length - 1] = {
        key: `${previousSection.key}+section:${item.key}`,
        sectionKind: 'markdown',
        item: {
          ...previousSection.item,
          key: `${previousSection.item.key}+${item.key}`,
          text: `${previousSection.item.text}${item.text}`
        }
      }
      continue
    }

    sections.push({
      key: `section:${item.key}`,
      sectionKind,
      item
    })
  }

  return sections
}

export function buildDonorMessagePresentationV2(
  timelineItems: ReadonlyArray<AssistantThreadTimelineItem>
): DonorMessagePresentationV2 {
  const timelineSections = partitionAssistantThreadTimeline(timelineItems)
  const hasAnalysis = timelineItems.some(item => item.kind === 'plan_step' || item.kind === 'tool_step' || item.kind === 'analysis_component')
  const hasClarification = timelineItems.some(item => item.kind === 'clarification')
  const runtimeStepItems = timelineSections.runtimeItems.filter(
    (item): item is Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }> =>
      item.kind === 'plan_step' || item.kind === 'tool_step'
  )
  const runtimeTerminalItems = timelineSections.runtimeItems.filter(
    (item): item is Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }> => item.kind === 'terminal_status'
  )

  return {
    tone: hasClarification ? 'clarification' : hasAnalysis ? 'analysis' : 'chat',
    runtimeShellHeader: getRuntimeShellHeaderLabel(timelineSections.runtimeItems),
    runtimeStepItems,
    runtimeTerminalItems,
    finalAnswerSections: coalesceFinalAnswerSections(timelineSections.contentItems)
  }
}

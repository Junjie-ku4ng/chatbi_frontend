import {
  partitionAssistantThreadTimeline,
  type AssistantThreadTimelineItem,
  type ThreadAnalysisComponent
} from '@/modules/chat/runtime/chat-thread-timeline'
import type { RuntimeMessageStep } from '@/modules/chat/runtime/chat-runtime-projection'
import type { AnswerComponentPayload, AnswerSurfaceView } from '@/modules/chat/components/answer-components/types'

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

function asPayloadRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as AnswerComponentPayload
  }
  return value as AnswerComponentPayload
}

function getAnalysisComponentKey(component: ThreadAnalysisComponent) {
  const payload = asPayloadRecord(component.payload)
  const interaction = asRecord(payload.interaction)
  const explain = asRecord(interaction?.explain)
  const handoff = asRecord(payload.analysisHandoff)

  return (
    asNonEmptyString(payload.queryLogId) ??
    asNonEmptyString(explain?.queryLogId) ??
    asNonEmptyString(handoff?.queryLogId) ??
    asNonEmptyString(payload.traceKey) ??
    asNonEmptyString(explain?.traceKey) ??
    asNonEmptyString(handoff?.traceKey)
  )
}

function isChartTablePair(left: ThreadAnalysisComponent, right: ThreadAnalysisComponent) {
  const types = new Set([left.type, right.type])
  return left.type !== right.type && types.has('chart') && types.has('table')
}

function mergeAvailableViews(left: ThreadAnalysisComponent, right: ThreadAnalysisComponent) {
  const leftPayload = asPayloadRecord(left.payload)
  const rightPayload = asPayloadRecord(right.payload)
  const views = [
    left.type,
    right.type,
    ...(Array.isArray(leftPayload.interaction?.availableViews) ? leftPayload.interaction.availableViews : []),
    ...(Array.isArray(rightPayload.interaction?.availableViews) ? rightPayload.interaction.availableViews : [])
  ].filter((view): view is AnswerSurfaceView => view === 'chart' || view === 'table' || view === 'kpi')

  return Array.from(new Set(views))
}

function mergeAnalysisComponentItems(
  left: Extract<AssistantThreadTimelineItem, { kind: 'analysis_component' }>,
  right: Extract<AssistantThreadTimelineItem, { kind: 'analysis_component' }>
): Extract<AssistantThreadTimelineItem, { kind: 'analysis_component' }> | null {
  if (!isChartTablePair(left.component, right.component)) {
    return null
  }

  const leftKey = getAnalysisComponentKey(left.component)
  const rightKey = getAnalysisComponentKey(right.component)
  if (!leftKey && !rightKey) {
    return null
  }
  if (leftKey && rightKey && leftKey !== rightKey) {
    return null
  }

  const leftPayload = asPayloadRecord(left.component.payload)
  const rightPayload = asPayloadRecord(right.component.payload)
  const views = mergeAvailableViews(left.component, right.component)
  const mergedPayload: AnswerComponentPayload = {
    ...rightPayload,
    ...leftPayload,
    ...(leftPayload.option ?? rightPayload.option ? { option: leftPayload.option ?? rightPayload.option } : {}),
    ...(leftPayload.rows ?? rightPayload.rows ? { rows: leftPayload.rows ?? rightPayload.rows } : {}),
    ...(leftPayload.columns ?? rightPayload.columns ? { columns: leftPayload.columns ?? rightPayload.columns } : {}),
    interaction: {
      ...(rightPayload.interaction ?? {}),
      ...(leftPayload.interaction ?? {}),
      availableViews: views,
      defaultView: left.component.type
    }
  }

  return {
    key: `${left.key}+${right.key}`,
    kind: 'analysis_component',
    component: {
      type: left.component.type,
      payload: mergedPayload
    },
    timelineOrder:
      left.timelineOrder !== undefined && right.timelineOrder !== undefined
        ? Math.min(left.timelineOrder, right.timelineOrder)
        : left.timelineOrder ?? right.timelineOrder
  }
}

function resolveRuntimeActivityLabel(step: RuntimeMessageStep) {
  if (step.kind === 'plan') {
    return '思考中'
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
    return '正在解析上下文'
  }

  if (
    haystack.includes('query executed') ||
    haystack.includes('execute query') ||
    haystack.includes('executing query')
  ) {
    return '正在执行查询'
  }

  return title ? `正在执行 ${title}` : '正在执行工具'
}

function getRuntimeShellHeaderLabel(items: ReadonlyArray<AssistantThreadTimelineItem>) {
  const latestStep = [...items]
    .filter((item): item is Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }> => item.kind === 'plan_step' || item.kind === 'tool_step')
    .sort((left, right) => (right.timelineOrder ?? Number.MIN_SAFE_INTEGER) - (left.timelineOrder ?? Number.MIN_SAFE_INTEGER))[0]

  if (!latestStep) {
    const runtimeStatus = [...items]
      .filter((item): item is Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }> => item.kind === 'terminal_status')
      .sort((left, right) => (right.timelineOrder ?? Number.MIN_SAFE_INTEGER) - (left.timelineOrder ?? Number.MIN_SAFE_INTEGER))[0]
    return runtimeStatus?.label ?? '思考中...'
  }

  if (latestStep.kind === 'plan_step') {
    return '思考中'
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
      item.kind === 'analysis_component' &&
      previousSection?.item.kind === 'analysis_component'
    ) {
      const merged = mergeAnalysisComponentItems(previousSection.item, item)
      if (merged) {
        sections[sections.length - 1] = {
          key: `${previousSection.key}+section:${item.key}`,
          sectionKind: 'analysis',
          item: merged
        }
        continue
      }
    }

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

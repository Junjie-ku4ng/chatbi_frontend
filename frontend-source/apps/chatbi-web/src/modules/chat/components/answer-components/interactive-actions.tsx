'use client'

import { buildAnalysisConsoleHref, buildOpsTraceHref } from '@/modules/chat/analysis/api'
import { addStoryWidget, buildStoryDesignerHref, createStory } from '@/modules/story/api'
import type { AnswerComponentPayload, AnswerSurfaceView } from './types'

type PromptApplier = (prompt: string) => void

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : []
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function resolveAnalysisHandoff(payload: AnswerComponentPayload | Record<string, unknown>) {
  return asRecord(payload.analysisHandoff)
}

export function resolveAnswerSurfaceQueryLogId(payload: AnswerComponentPayload) {
  const handoff = resolveAnalysisHandoff(payload)
  return asString(payload.queryLogId) ?? asString(payload.interaction?.explain?.queryLogId) ?? asString(handoff?.queryLogId)
}

export function resolveAnswerSurfaceTraceKey(payload: AnswerComponentPayload) {
  const handoff = resolveAnalysisHandoff(payload)
  return asString(payload.traceKey) ?? asString(payload.interaction?.explain?.traceKey) ?? asString(handoff?.traceKey)
}

function mergeDraftPatch(basePatch: Record<string, unknown>, overridePatch: Record<string, unknown> | undefined) {
  if (!overridePatch) {
    return basePatch
  }

  const merged: Record<string, unknown> = {
    ...basePatch,
    ...overridePatch
  }

  if (asRecord(basePatch.analysis) || asRecord(overridePatch.analysis)) {
    merged.analysis = {
      ...(asRecord(basePatch.analysis) ?? {}),
      ...(asRecord(overridePatch.analysis) ?? {})
    }
  }

  return merged
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAnswerSurfaceModelId(payload: AnswerComponentPayload) {
  const handoff = resolveAnalysisHandoff(payload)
  return asString(handoff?.modelId) ?? asString(payload.modelId)
}

export function buildAnswerSurfaceAnalysisDraft(
  payload: AnswerComponentPayload,
  overrides?: {
    prompt?: string
    analysisAction?: string
    patch?: Record<string, unknown>
  }
) {
  const handoff = resolveAnalysisHandoff(payload)
  if (!handoff) {
    return undefined
  }
  const sort = asRecord(handoff.sort)
  const ranking = asRecord(handoff.ranking)
  const focusDimension =
    asString(handoff.highlightDimension) ??
    (Array.isArray(handoff.dimensionCodes) && typeof handoff.dimensionCodes[0] === 'string'
      ? handoff.dimensionCodes[0]
      : undefined) ??
    asString(asRecord(handoff.timeState)?.dimension)
  const basePatch = {
    ...(focusDimension ? { focusDimension } : {}),
    ...(asRecord(handoff.timeState) ? { time: { type: 'last_n', ...asRecord(handoff.timeState) } } : {}),
    filters: Array.isArray(handoff.appliedFilters) ? handoff.appliedFilters : [],
    ...(Array.isArray(handoff.metricCodes) ? { metricCodes: handoff.metricCodes } : {}),
    ...(Array.isArray(handoff.dimensionCodes) ? { dimensionCodes: handoff.dimensionCodes } : {}),
    ...(asString(handoff.analysisShape) ? { analysisShape: asString(handoff.analysisShape) } : {}),
    ...(asString(handoff.preferredShape) ? { preferredShape: asString(handoff.preferredShape) } : {}),
    ...(sort ? { sort } : {}),
    ...(typeof ranking?.limit === 'number' ? { topN: ranking.limit } : {})
  }

  return {
    prompt: overrides?.prompt ?? '继续分析当前结果',
    patch: mergeDraftPatch(basePatch, overrides?.patch),
    analysisAction: overrides?.analysisAction ?? 'open_analysis',
    ...(asString(handoff.queryLogId) ? { baseQueryLogId: asString(handoff.queryLogId) } : {})
  }
}

export function buildAnswerSurfaceOpenAnalysisHref(
  payload: AnswerComponentPayload,
  overrides?: {
    prompt?: string
    analysisAction?: string
    patch?: Record<string, unknown>
  }
) {
  const queryLogId = resolveAnswerSurfaceQueryLogId(payload)
  if (!queryLogId) {
    return undefined
  }

  const traceKey = resolveAnswerSurfaceTraceKey(payload)
  const draft = buildAnswerSurfaceAnalysisDraft(payload, overrides)
  return buildAnalysisConsoleHref({
    queryLogId,
    traceKey,
    draft
  })
}

export function buildAnswerSurfaceTraceHref(payload: AnswerComponentPayload) {
  return buildOpsTraceHref(resolveAnswerSurfaceTraceKey(payload))
}

export function buildAnswerSurfaceStorySeed(input: {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
}) {
  const widgetType = input.payload.interaction?.story?.widgetType ?? input.type
  const title =
    asString(input.payload.interaction?.story?.title) ??
    asString(input.payload.label) ??
    'Analysis result'
  const widgetPayload = asRecord(input.payload.interaction?.story?.widgetPayload)
    ? cloneRecord(asRecord(input.payload.interaction?.story?.widgetPayload) ?? {})
    : cloneRecord(input.payload)

  return {
    modelId: resolveAnswerSurfaceModelId(input.payload),
    queryLogId: resolveAnswerSurfaceQueryLogId(input.payload),
    traceKey: resolveAnswerSurfaceTraceKey(input.payload),
    widgetType,
    title,
    widgetPayload
  }
}

export async function saveAnswerSurfaceToStory(input: {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
  storyTitle: string
  storySummary?: string
  widgetTitle?: string
}) {
  const seed = buildAnswerSurfaceStorySeed({
    type: input.type,
    payload: input.payload
  })

  if (!seed.modelId) {
    throw new Error('Story save requires a semantic model id.')
  }

  const created = await createStory({
    modelId: seed.modelId,
    title: input.storyTitle.trim(),
    ...(input.storySummary?.trim() ? { summary: input.storySummary.trim() } : {}),
    metadata: {
      source: 'chat_answer_surface',
      ...(seed.queryLogId ? { queryLogId: seed.queryLogId } : {}),
      ...(seed.traceKey ? { traceKey: seed.traceKey } : {})
    },
    ...(seed.traceKey ? { traceKey: seed.traceKey } : {})
  })

  const widget = await addStoryWidget(created.story.id, {
    widgetType: seed.widgetType,
    widgetKey: `chat-answer-${seed.widgetType}`,
    title: input.widgetTitle?.trim() || seed.title,
    payload: seed.widgetPayload,
    layout: {
      x: 0,
      y: 0,
      w: 6,
      h: 4
    },
    sortOrder: 0
  })

  return {
    story: created.story,
    widget,
    designerHref: buildStoryDesignerHref(created.story.id)
  }
}

function buildAnalysisDraft(payload: AnswerComponentPayload) {
  return buildAnswerSurfaceAnalysisDraft(payload)
}

function buildOpenAnalysisHref(payload: AnswerComponentPayload) {
  return buildAnswerSurfaceOpenAnalysisHref(payload)
}

function buildDrillPrompt(payload: Record<string, unknown>) {
  const handoff = resolveAnalysisHandoff(payload)
  const focusDimension =
    asString(handoff?.highlightDimension) ??
    (Array.isArray(handoff?.dimensionCodes) && typeof handoff.dimensionCodes[0] === 'string'
      ? handoff.dimensionCodes[0]
      : undefined) ??
    asString(asRecord(handoff?.timeState)?.dimension)
  return focusDimension ? `继续按 ${focusDimension} 下钻分析当前结果。` : '请继续对当前结果做下钻分析。'
}

function buildSlicePrompt(payload: Record<string, unknown>) {
  const handoff = resolveAnalysisHandoff(payload)
  const focusDimension =
    asString(asRecord(handoff?.timeState)?.dimension) ??
    (Array.isArray(handoff?.dimensionCodes) && typeof handoff.dimensionCodes[0] === 'string'
      ? handoff.dimensionCodes[0]
      : undefined)
  return focusDimension
    ? `请基于当前结果增加切片分析，并结合 ${focusDimension} 维度补充筛选。`
    : '请基于当前结果增加切片分析。'
}

function buildCsvContent(payload: Record<string, unknown>) {
  const rows = asRecordArray(payload.rows ?? payload.preview)
  if (rows.length === 0) {
    return undefined
  }
  const columns = Array.isArray(payload.columns)
    ? payload.columns.filter((column): column is string => typeof column === 'string')
    : Object.keys(rows[0] ?? {})
  const lines = [
    columns.join(','),
    ...rows.map(row =>
      columns
        .map(column => {
          const value = String(row[column] ?? '')
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(',')
    )
  ]
  return lines.join('\n')
}

function exportPayloadRows(payload: Record<string, unknown>) {
  const exportRef = asString(payload.exportRef)
  if (exportRef) {
    window.open(exportRef, '_blank', 'noopener,noreferrer')
    return
  }
  const csv = buildCsvContent(payload)
  if (!csv) {
    const openAnalysisHref = buildOpenAnalysisHref(payload)
    if (openAnalysisHref) {
      window.open(openAnalysisHref, '_blank', 'noopener,noreferrer')
    }
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'analysis-result.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AnswerComponentActions(props: {
  payload: AnswerComponentPayload
  onApplyPrompt?: PromptApplier
}) {
  const openAnalysisHref = buildOpenAnalysisHref(props.payload)
  const canDrill = Boolean(resolveAnalysisHandoff(props.payload))
  const canSlice = Boolean(resolveAnalysisHandoff(props.payload))
  const canExport = Boolean(
    asString(props.payload.exportRef) ||
      asRecordArray(props.payload.rows ?? props.payload.preview).length > 0 ||
      openAnalysisHref
  )

  if (!openAnalysisHref && !canDrill && !canSlice && !canExport) {
    return null
  }

  return (
    <div className="chat-assistant-answer-actions" data-testid="chat-answer-actions">
      {openAnalysisHref ? (
        <button
          type="button"
          className="chat-assistant-answer-action"
          onClick={() => {
            window.open(openAnalysisHref, '_blank', 'noopener,noreferrer')
          }}
        >
          Open Analysis
        </button>
      ) : null}
      {canDrill ? (
        <button
          type="button"
          className="chat-assistant-answer-action"
          onClick={() => {
            props.onApplyPrompt?.(buildDrillPrompt(props.payload))
          }}
        >
          Drill
        </button>
      ) : null}
      {canSlice ? (
        <button
          type="button"
          className="chat-assistant-answer-action"
          onClick={() => {
            props.onApplyPrompt?.(buildSlicePrompt(props.payload))
          }}
        >
          Slice
        </button>
      ) : null}
      {canExport ? (
        <button
          type="button"
          className="chat-assistant-answer-action"
          onClick={() => {
            exportPayloadRows(props.payload)
          }}
        >
          Export
        </button>
      ) : null}
    </div>
  )
}

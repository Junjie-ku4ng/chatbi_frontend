'use client'

export type ChatSourceItem = {
  id: string
  title: string
  body: string
  eyebrow?: string
  meta?: string
  kind?: 'document' | 'mail' | 'chat' | 'insight' | 'search'
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
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

function capitalize(input: string) {
  return input.length > 0 ? `${input.slice(0, 1).toUpperCase()}${input.slice(1)}` : input
}

function pushUnique(items: ChatSourceItem[], item: ChatSourceItem | null) {
  if (!item || items.some(existing => existing.id === item.id)) {
    return
  }
  items.push(item)
}

function buildQueryLogSource(queryLogId: string): ChatSourceItem {
  return {
    id: `query-log:${queryLogId}`,
    title: 'Query Log Reference',
    eyebrow: 'Evidence link',
    body: 'Analytical evidence captured for this answer and reusable across downstream analysis surfaces.',
    meta: queryLogId,
    kind: 'document'
  }
}

function buildTraceSource(traceKey: string): ChatSourceItem {
  return {
    id: `trace:${traceKey}`,
    title: 'Trace Reference',
    eyebrow: 'Ops trace',
    body: 'Execution trace for this answer, including runtime steps and chart rendering provenance.',
    meta: traceKey,
    kind: 'mail'
  }
}

function buildResultSetSource(record: Record<string, unknown>): ChatSourceItem {
  const cube = asString(record.cube)
  const visualType = asString(record.visualType)
  const rowCount = asFiniteNumber(record.rowCount)
  const colCount = asFiniteNumber(record.colCount)
  const queryLogId = asString(record.queryLogId)
  const traceKey = asString(record.traceKey)

  return {
    id: `result-set:${queryLogId ?? traceKey ?? cube ?? 'analysis'}`,
    title: cube ? `${cube} Result Set` : 'Result Set',
    eyebrow: visualType ? `${capitalize(visualType)} analysis` : 'Analysis result',
    body:
      rowCount !== undefined || colCount !== undefined
        ? `Structured analytical result with ${rowCount ?? 0} rows and ${colCount ?? 0} columns, ready for chart and table rendering.`
        : 'Structured analytical result ready for chart and table rendering.',
    meta: queryLogId ?? traceKey,
    kind: 'search'
  }
}

function buildDiagnosticSource(record: Record<string, unknown>): ChatSourceItem | null {
  const kind = asString(record.kind)
  if (kind !== 'diagnostic_evidence_ledger' && kind !== 'planning_diagnostics') {
    return null
  }

  return {
    id: `${kind}:${asString(record.traceKey) ?? asString(record.queryLogId) ?? 'analysis'}`,
    title: kind === 'planning_diagnostics' ? 'Planning Diagnostics' : 'Diagnostic Evidence',
    eyebrow: 'Runtime evidence',
    body: 'Structured runtime evidence captured during answer generation and available for deeper inspection.',
    meta: asString(record.traceKey) ?? asString(record.queryLogId),
    kind: 'insight'
  }
}

function extractSourceItems(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(item => {
    const record = asRecord(item)
    if (!record) {
      return []
    }

    const id = asString(record.id)
    const title = asString(record.title)
    const body = asString(record.body)
    const meta = asString(record.meta)
    const eyebrow = asString(record.eyebrow)
    const kind = asString(record.kind)

    if (!id || !title || !body) {
      return []
    }

    return [
      {
        id,
        title,
        body,
        ...(eyebrow ? { eyebrow } : {}),
        ...(meta ? { meta } : {}),
        ...(kind === 'document' || kind === 'mail' || kind === 'chat' || kind === 'insight' || kind === 'search'
          ? { kind }
          : {})
      } satisfies ChatSourceItem
    ]
  })
}

export function extractChatSourceItemsFromPartData(value: unknown): ChatSourceItem[] {
  const record = asRecord(value)
  return extractSourceItems(record?.items)
}

export function deriveChatSourceItems(doneEvent: Record<string, unknown> | null | undefined): ChatSourceItem[] {
  if (!doneEvent) {
    return []
  }

  const items: ChatSourceItem[] = []
  const meta = asRecord(doneEvent.meta)
  const artifacts = Array.isArray(doneEvent.artifacts) ? doneEvent.artifacts : []

  for (const artifact of artifacts) {
    const record = asRecord(artifact)
    if (!record) {
      continue
    }

    const kind = asString(record.kind)
    if (kind === 'result_set' || kind === 'federated_result_set') {
      pushUnique(items, buildResultSetSource(record))
    }

    if (kind === 'query_reference') {
      const queryLogId = asString(record.queryLogId)
      const traceKey = asString(record.traceKey)
      if (queryLogId) {
        pushUnique(items, buildQueryLogSource(queryLogId))
      }
      if (traceKey) {
        pushUnique(items, buildTraceSource(traceKey))
      }
    }

    pushUnique(items, buildDiagnosticSource(record))
  }

  const metaQueryLogId = asString(meta?.queryLogId)
  const metaTraceKey = asString(meta?.traceKey) ?? asString(meta?.trace_key)
  if (metaQueryLogId) {
    pushUnique(items, buildQueryLogSource(metaQueryLogId))
  }
  if (metaTraceKey) {
    pushUnique(items, buildTraceSource(metaTraceKey))
  }

  return items
}

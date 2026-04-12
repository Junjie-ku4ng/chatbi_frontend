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

function pushUnique(items: ChatSourceItem[], item: ChatSourceItem | null) {
  if (!item || items.some(existing => existing.id === item.id)) {
    return
  }
  items.push(item)
}

function buildQueryLogSource(queryLogId: string): ChatSourceItem {
  return {
    id: `query-log:${queryLogId}`,
    title: '查询日志引用',
    eyebrow: '证据链接',
    body: '本次回答捕获的分析证据，可用于后续分析界面。',
    meta: queryLogId,
    kind: 'document'
  }
}

function buildTraceSource(traceKey: string): ChatSourceItem {
  return {
    id: `trace:${traceKey}`,
    title: '链路追踪引用',
    eyebrow: '运行追踪',
    body: '本次回答的执行追踪，包含运行步骤和图表渲染来源。',
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
    title: cube ? `${cube} 结果集` : '结果集',
    eyebrow: visualType ? `${visualType} 分析` : '分析结果',
    body:
      rowCount !== undefined || colCount !== undefined
        ? `结构化分析结果包含 ${rowCount ?? 0} 行和 ${colCount ?? 0} 列，可用于图表和表格渲染。`
        : '结构化分析结果已可用于图表和表格渲染。',
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
    title: kind === 'planning_diagnostics' ? '规划诊断' : '诊断证据',
    eyebrow: '运行证据',
    body: '回答生成过程中捕获的结构化运行证据，可用于进一步检查。',
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

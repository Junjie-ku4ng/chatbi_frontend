'use client'

export type AnalysisConsoleDraft = {
  prompt?: string
  patch?: Record<string, unknown>
  analysisAction?: string
  baseQueryLogId?: string
}

export function buildAnalysisConsoleHref(input: {
  queryLogId: string
  traceKey?: string
  draft?: AnalysisConsoleDraft
}) {
  const query = new URLSearchParams()
  query.set('queryLogId', input.queryLogId)
  if (input.traceKey) {
    query.set('traceKey', input.traceKey)
  }
  if (input.draft) {
    query.set('analysisDraft', JSON.stringify(input.draft))
  }
  return `/chat?${query.toString()}#analysis`
}

export function buildOpsTraceHref(traceKey?: string | null) {
  if (!traceKey) {
    return undefined
  }
  return `/ops/traces/${encodeURIComponent(traceKey)}`
}

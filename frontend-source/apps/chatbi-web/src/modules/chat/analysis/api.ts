import { apiRequest } from '@/lib/api-client'

export type AnalysisSuggestionKind = 'member' | 'time' | 'sort_metric' | 'dimension_level'

export type AnalysisContext = {
  queryLogId: string
  base?: {
    modelId?: string
    cube?: string
    queryLogId?: string
    traceKey?: string
  }
  explain?: Record<string, unknown>
  capabilities?: {
    operations?: string[]
    sortableMetrics?: string[]
    drillLevels?: Array<Record<string, unknown>>
    timePresets?: Array<Record<string, unknown>>
  }
  uiCapabilities?: {
    supportsPreview?: boolean
    supportsTemplates?: boolean
    supportsDerivedMetrics?: boolean
    supportsPivot?: boolean
    supportsDrilldown?: boolean
  }
  safeRanges?: {
    topN?: { min?: number; max?: number; default?: number }
    time?: { lastNMin?: number; lastNMax?: number; compare?: string[] }
  }
  defaultPresets?: {
    topN?: number
    time?: Record<string, unknown> | null
  }
  presetBundles?: Array<{
    id: string
    name: string
    description?: string
    patch: Record<string, unknown>
    riskLevel: 'low' | 'medium' | 'high'
  }>
  templateHints?: {
    items?: Array<{ id: string; name: string; scope?: string; status?: string }>
    total?: number
  }
  historySummary?: {
    total?: number
    succeeded?: number
    failed?: number
  }
  failureRecovery?: {
    canReplayFailed?: boolean
    latestFailedRunId?: string
  }
}

export type AnalysisPreviewResult = {
  baseQueryLogId: string
  analysisAction?: string
  previewPlan: Record<string, unknown>
  changes: Array<Record<string, unknown>>
  risk: 'low' | 'medium' | 'high'
  riskReasons?: string[]
  estimatedRowImpact?: {
    baselineLimit?: number
    previewLimit?: number
    delta?: number
    direction?: 'increase' | 'decrease' | 'same'
  }
  comparison?: {
    compareToRunId?: string
    changedFieldDelta?: number
    riskDelta?: number
    rowImpactDelta?: number
  }
}

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

export type AnalysisSuggestionPage = {
  kind: AnalysisSuggestionKind
  items: Array<Record<string, unknown>>
}

export type AnalysisHistoryItem = {
  id: string
  queryLogId: string
  followupQueryLogId?: string | null
  replayOfRunId?: string | null
  conversationId?: string
  followupType: string
  prompt: string
  analysisAction?: string
  patchSummary?: {
    topN?: number
    sortBy?: string
    filterCount?: number
    timeType?: string
  }
  changes?: Array<Record<string, unknown>>
  status: string
  errorMessage?: string
  createdAt?: string
  createdBy?: string
}

export type AnalysisHistoryPage = {
  queryLogId: string
  items: AnalysisHistoryItem[]
  total: number
  limit?: number
  offset?: number
  nextCursor?: string | null
}

export type AnalysisReplayResult = {
  replayedFromRunId: string
  status: string
  followup?: {
    id?: string
    queryLogId?: string
    followupQueryLogId?: string
    replayOfRunId?: string
    status?: string
  }
  meta?: {
    queryLogId?: string
    baseQueryLogId?: string
    traceKey?: string
  }
}

export type AnalysisTemplate = {
  id: string
  modelId: string
  name: string
  scope: 'personal' | 'team'
  status: 'active' | 'archived'
  config: Record<string, unknown>
  createdAt: string
  createdBy?: string
  updatedAt: string
  updatedBy?: string
}

export type AnalysisTemplatePage = {
  items: AnalysisTemplate[]
  total: number
  limit?: number
  offset?: number
}

export async function getAnalysisContext(queryLogId: string) {
  return apiRequest<AnalysisContext>(`/chat/query/${encodeURIComponent(queryLogId)}/analysis/context`, {
    track: 'xpert'
  })
}

export async function previewAnalysis(
  queryLogId: string,
  input: {
    patch?: Record<string, unknown>
    prompt?: string
    analysisAction?: string
    compareToRunId?: string
  }
) {
  return apiRequest<AnalysisPreviewResult>(`/chat/query/${encodeURIComponent(queryLogId)}/analysis/preview`, {
    method: 'POST',
    track: 'xpert',
    body: input
  })
}

export async function listAnalysisSuggestions(
  queryLogId: string,
  input: {
    kind: AnalysisSuggestionKind
    dimension?: string
    q?: string
    topK?: number
  }
) {
  const query = new URLSearchParams()
  query.set('kind', input.kind)
  if (input.dimension) query.set('dimension', input.dimension)
  if (input.q) query.set('q', input.q)
  if (typeof input.topK === 'number' && Number.isFinite(input.topK)) {
    query.set('topK', String(Math.floor(input.topK)))
  }
  return apiRequest<AnalysisSuggestionPage>(
    `/chat/query/${encodeURIComponent(queryLogId)}/analysis/suggestions?${query.toString()}`,
    { track: 'xpert' }
  )
}

export async function listAnalysisHistory(
  queryLogId: string,
  input?: { limit?: number; offset?: number; cursor?: string; status?: string }
) {
  const query = new URLSearchParams()
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) {
    query.set('limit', String(Math.floor(input.limit)))
  }
  if (typeof input?.offset === 'number' && Number.isFinite(input.offset)) {
    query.set('offset', String(Math.floor(input.offset)))
  }
  if (input?.cursor) {
    query.set('cursor', input.cursor)
  }
  if (input?.status) {
    query.set('status', input.status)
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<AnalysisHistoryPage>(`/chat/query/${encodeURIComponent(queryLogId)}/analysis/history${suffix}`, {
    track: 'xpert'
  })
}

export async function replayAnalysisHistoryRun(
  queryLogId: string,
  runId: string,
  input?: {
    strategy?: 'exact' | 'exact_with_prompt_override'
    promptOverride?: string
    analysisAction?: string
  }
) {
  return apiRequest<AnalysisReplayResult>(
    `/chat/query/${encodeURIComponent(queryLogId)}/analysis/history/${encodeURIComponent(runId)}/replay`,
    {
      method: 'POST',
      track: 'xpert',
      body: input ?? {}
    }
  )
}

export async function listAnalysisTemplates(input: {
  modelId: string
  q?: string
  status?: 'active' | 'archived'
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams()
  query.set('modelId', input.modelId)
  if (input.q) query.set('q', input.q)
  if (input.status) query.set('status', input.status)
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) {
    query.set('limit', String(Math.floor(input.limit)))
  }
  if (typeof input.offset === 'number' && Number.isFinite(input.offset)) {
    query.set('offset', String(Math.floor(input.offset)))
  }
  return apiRequest<AnalysisTemplatePage>(`/chat/query-analysis/templates?${query.toString()}`, {
    track: 'xpert'
  })
}

export async function createAnalysisTemplate(input: {
  modelId: string
  name: string
  scope?: 'personal' | 'team'
  status?: 'active' | 'archived'
  config: Record<string, unknown>
}) {
  return apiRequest<{ template: AnalysisTemplate }>('/chat/query-analysis/templates', {
    method: 'POST',
    track: 'xpert',
    body: input
  })
}

export async function patchAnalysisTemplate(
  id: string,
  input: {
    name?: string
    scope?: 'personal' | 'team'
    status?: 'active' | 'archived'
    config?: Record<string, unknown>
  }
) {
  return apiRequest<{ template: AnalysisTemplate }>(`/chat/query-analysis/templates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    track: 'xpert',
    body: input
  })
}

export async function applyAnalysisTemplate(queryLogId: string, templateId: string, prompt?: string) {
  return apiRequest<Record<string, unknown>>(
    `/chat/query/${encodeURIComponent(queryLogId)}/analysis/templates/${encodeURIComponent(templateId)}/apply`,
    {
      method: 'POST',
      track: 'xpert',
      body: prompt ? { prompt } : {}
    }
  )
}

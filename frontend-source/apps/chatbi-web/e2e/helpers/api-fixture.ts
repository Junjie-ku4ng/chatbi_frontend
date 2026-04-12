import { e2eAuthHeaders, e2eWebBaseUrl } from './auth'
import { createE2EId } from './ids'

export type E2EModelRef = {
  id: string
  name: string
  cube?: string
  dataSourceId?: string
}

type E2EDataSourceRef = {
  id: string
}

export type E2EAiProviderRef = {
  id: string
  code: string
  name: string
}

export type E2EAiModelRef = {
  id: string
  providerId: string
  capability: 'llm' | 'embedding'
}

export type E2EInsightRef = {
  id: string
  modelId: string
  title: string
}

export type E2EStoryRef = {
  id: string
  modelId: string
  title: string
  status: 'draft' | 'published' | 'archived'
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT'
  body?: unknown
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const normalizedPath = normalizeApiPath(path)
  const response = await fetch(`${e2eWebBaseUrl}${normalizedPath}`, {
    method: options.method ?? 'GET',
    headers: {
      ...e2eAuthHeaders(),
      'content-type': 'application/json'
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`API ${options.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }
  return payload as T
}

function normalizeApiPath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized.startsWith('/api/xpert/') || normalized.startsWith('/api/pa/')) {
    return normalized
  }
  if (normalized.startsWith('/api/')) {
    return `/api/xpert${normalized.slice('/api'.length)}`
  }
  return `/api/xpert${normalized}`
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path)
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: 'POST',
    body
  })
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body
  })
}

const defaultSemanticSchemaSnapshot = {
  measures: ['Revenue', 'Cost', 'Profit', 'Quantity'],
  dimensions: [
    { name: 'Product', hierarchies: ['Product'], levels: ['All', 'SKU'], members: ['All Products', 'P100', 'P200'] },
    { name: 'Region', hierarchies: ['Region'], levels: ['All', 'Region'], members: ['All Regions', 'East', 'West'] },
    { name: 'Period', hierarchies: ['Period'], levels: ['Year', 'Month'], members: ['2024', '2024-01', '2024-02'] },
    { name: 'Version', hierarchies: ['Version'], levels: ['Version'], members: ['Actual', 'Plan'] },
    { name: 'Scenario', hierarchies: ['Scenario'], levels: ['Scenario'], members: ['Base', 'Best'] },
    { name: 'Measures', hierarchies: ['Measures'], levels: ['Measures'], members: ['Revenue', 'Cost', 'Profit', 'Quantity'] }
  ]
}

export async function createDataSourceFixture() {
  const name = createE2EId('e2e-ds')
  return apiPost<E2EDataSourceRef>('/data-source', {
    typeCode: 'pa-tm1',
    name,
    host: process.env.PA_VERIFY_PA_HOST || process.env.PA_BASE_URL || 'http://localhost:4000',
    authType: process.env.PA_VERIFY_AUTH_TYPE || process.env.PA_AUTH_MODE || 'basic',
    authRef: process.env.PA_VERIFY_AUTH_REF || process.env.PA_AUTH_BASIC || 'admin:password'
  })
}

export async function createSemanticModelFixture(input?: {
  name?: string
  cube?: string
  schemaSnapshot?: Record<string, unknown>
}) {
  const dataSource = await createDataSourceFixture()
  const name = input?.name ?? createE2EId('e2e-model')
  const cube = input?.cube ?? 'Sales'
  const payload = await apiPost<E2EModelRef>('/semantic-model', {
    dataSourceId: dataSource.id,
    name,
    cube,
    schemaSnapshot: input?.schemaSnapshot ?? defaultSemanticSchemaSnapshot
  })
  return {
    id: String(payload.id),
    name: payload.name ?? name,
    cube: payload.cube ?? cube,
    dataSourceId: dataSource.id
  }
}

export async function listSemanticModelsFixture() {
  const normalizeItems = (value: unknown): E2EModelRef[] => {
    const rows =
      Array.isArray(value)
        ? value
        : Array.isArray(asRecord(value)?.items)
          ? ((asRecord(value)?.items as unknown[]) ?? [])
          : []
    const normalized: E2EModelRef[] = []
    for (const item of rows) {
      const row = asRecord(item)
      if (!row) continue
      const id = asString(row.modelId) ?? asString(row.id)
      const name = asString(row.name) ?? asString(row.entity)
      if (!id || !name) continue
      normalized.push({
        id,
        name,
        cube: asString(row.cube)
      })
    }
    return normalized
  }

  const semanticModelQuery = new URLSearchParams()
  if ((process.env.NEXT_PUBLIC_ASK_INCLUDE_TEST_MODELS ?? 'true') === 'true') {
    semanticModelQuery.set('includeTestModels', 'true')
  }
  const runtime = String(process.env.NEXT_PUBLIC_ASK_MODEL_RUNTIME ?? '').trim()
  if (runtime) {
    semanticModelQuery.set('runtime', runtime)
  }

  try {
    const payload = await apiGet<unknown>(`/semantic-model${semanticModelQuery.toString() ? `?${semanticModelQuery.toString()}` : ''}`)
    const normalized = normalizeItems(payload)
    if (normalized.length > 0) return normalized
  } catch {
    // fallback below
  }

  try {
    const payload = await apiGet<{ items?: unknown[] }>(
      `/chatbi-model/my?${new URLSearchParams({
        data: JSON.stringify({
          take: 200,
          skip: 0,
          order: {
            updatedAt: 'DESC'
          }
        })
      }).toString()}`
    )
    const normalized = normalizeItems(payload)
    if (normalized.length > 0) return normalized
  } catch {
    // fallback below
  }

  try {
    const payload = await apiGet<{ items?: unknown[] }>(
      `/semantic-model/my?${new URLSearchParams({
        data: JSON.stringify({
          take: 200,
          skip: 0,
          order: {
            updatedAt: 'DESC'
          }
        })
      }).toString()}`
    )
    const normalized = normalizeItems(payload)
    if (normalized.length > 0) return normalized
  } catch {
    // fallback below
  }

  const payload = await apiGet<unknown>('/semantic-model')
  return normalizeItems(payload)
}

async function canExecuteQuery(modelId: string) {
  try {
    const response = await fetch(`${e2eWebBaseUrl}/api/xpert/chat`, {
      method: 'POST',
      headers: {
        ...e2eAuthHeaders(),
        'content-type': 'application/json',
        accept: 'text/event-stream'
      },
      body: JSON.stringify({
        request: {
          input: {
            input: '上月收入趋势',
            files: []
          },
          id: createE2EId('query')
        },
        options: {
          xpertId: modelId
        }
      })
    })
    return response.ok
  } catch {
    return false
  }
}

export async function pickModelFixture(input?: { preferNames?: string[]; requireQuerySuccess?: boolean }) {
  const items = await listSemanticModelsFixture()
  if (items.length === 0) {
    throw new Error('No semantic model found. Run verify scripts first.')
  }

  const preferredNamePatterns =
    input?.preferNames && input.preferNames.length > 0
      ? input.preferNames
      : ['verify-p2-chatbi-answer-component', 'verify-p2-chatbi-stream-contract', 'verify-p2-chatbi-orchestration']

  const requireQuerySuccess = input?.requireQuerySuccess === true

  for (const pattern of preferredNamePatterns) {
    const normalized = pattern.trim().toLowerCase()
    if (!normalized) continue
    const matched = items.find(item => item.name?.toLowerCase().includes(normalized))
    if (matched) {
      if (!requireQuerySuccess || (await canExecuteQuery(matched.id))) {
        return matched
      }
    }
  }

  if (requireQuerySuccess) {
    const candidates = items.slice(0, 20)
    for (const candidate of candidates) {
      if (await canExecuteQuery(candidate.id)) {
        return candidate
      }
    }
  }

  return items[0]
}

export async function ensureIndicatorContractFixture(modelId: string) {
  const listContracts = async () => {
    const payload = await apiGet<{ items?: Array<{ id: string }> }>(
      `/indicator-contracts?modelId=${encodeURIComponent(modelId)}`
    )
    return payload.items ?? []
  }

  const existing = await listContracts()
  if (existing.length > 0) {
    return existing[0].id
  }

  const code = createE2EId('E2E_CONTRACT')
  await apiPost('/indicators', {
    modelId,
    code,
    name: `${code} Name`,
    type: 'measure',
    description: 'E2E indicator contract fixture'
  })

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const items = await listContracts()
    if (items.length > 0) {
      return items[0].id
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  throw new Error('Failed to create indicator contract fixture')
}

export async function createAiProviderFixture() {
  const code = createE2EId('e2e-provider')
  const created = await apiPost<E2EAiProviderRef>('/ai/providers', {
    code,
    name: `E2E Provider ${code}`,
    category: 'llm',
    protocol: 'http',
    endpoint: 'https://example.com/openai/v1',
    status: 'active'
  })
  return created
}

export async function listAiProvidersFixture() {
  const payload = await apiGet<{ items?: E2EAiProviderRef[] }>('/ai/providers')
  return payload.items ?? []
}

export async function createAiModelFixture(providerId: string, capability: 'llm' | 'embedding' = 'llm') {
  const code = createE2EId(`e2e-${capability}`)
  const created = await apiPost<E2EAiModelRef>('/ai/models', {
    providerId,
    code,
    name: `E2E ${capability} ${code}`,
    capability,
    remoteModel: capability === 'llm' ? 'gpt-5.1' : 'BAAI/bge-large-zh-v1.5',
    status: 'active'
  })
  return created
}

export async function bindAiModelFixture(input: {
  semanticModelId: string
  aiModelId: string
  task: 'nl2plan_llm' | 'indicator_embedding'
}) {
  return apiRequest('/ai/model-bindings', {
    method: 'PUT',
    body: {
      modelId: input.semanticModelId,
      aiModelId: input.aiModelId,
      task: input.task,
      strict: true
    }
  })
}

export async function createInsightFixture(modelId: string) {
  const title = createE2EId('E2E Insight')
  const payload = await apiPost<Record<string, unknown>>('/insights', {
    modelId,
    title,
    summary: 'Created by e2e fixture',
    tags: ['e2e']
  })
  const created = asRecord(payload.insight) ?? payload
  return {
    id: asString(created.id) ?? '',
    modelId,
    title
  }
}

function normalizeInsightFixture(item: Record<string, unknown>): E2EInsightRef | null {
  const options = asRecord(item.options)
  const modelId = asString(item.modelId) ?? asString(options?.modelId)
  const id = asString(item.id)
  const title = asString(item.title) ?? asString(item.name)
  if (!id || !modelId || !title) {
    return null
  }
  return {
    id,
    modelId,
    title
  }
}

export async function seedInsightsFixture(modelId: string, count: number) {
  const created: E2EInsightRef[] = []
  for (let index = 0; index < count; index += 1) {
    const insight = await createInsightFixture(modelId)
    created.push(insight)
  }
  return created
}

export async function listInsightsFixture(modelId: string) {
  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/insights?${new URLSearchParams({
      modelId,
      limit: '50',
      offset: '0'
    }).toString()}`
  )
  const items = Array.isArray(payload.items) ? payload.items : []
  return items
    .map(normalizeInsightFixture)
    .filter((item): item is E2EInsightRef => Boolean(item))
    .filter(item => item.modelId === modelId)
}

export async function createStoryFixture(modelId: string, input?: { title?: string; summary?: string }) {
  const title = input?.title ?? createE2EId('E2E Story')
  const payload = await apiPost<Record<string, unknown>>('/stories', {
    modelId,
    title,
    summary: input?.summary ?? 'Created by e2e fixture',
    status: 'draft',
    metadata: {}
  })
  const created = asRecord(payload.story) ?? payload
  return {
    id: asString(created.id) ?? '',
    modelId,
    title,
    status: 'draft'
  }
}

export async function listStoriesFixture(modelId: string) {
  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/stories?${new URLSearchParams({
      modelId,
      limit: '50',
      offset: '0'
    }).toString()}`
  )
  const items = Array.isArray(payload.items) ? payload.items : []
  return items.map(item => {
    const statusRaw = asString(item.status)?.toUpperCase()
    const status: E2EStoryRef['status'] =
      statusRaw === 'RELEASED' || statusRaw === 'PUBLISHED' || statusRaw === 'APPROVED'
        ? 'published'
        : statusRaw === 'ARCHIVED'
          ? 'archived'
          : 'draft'
    return {
      id: asString(item.id) ?? '',
      modelId: asString(item.modelId) ?? modelId,
      title: asString(item.name) ?? asString(item.title) ?? 'Untitled Story',
      status
    }
  })
}

export async function addStoryItemFixture(storyId: string, input: { itemType: 'insight' | 'query_log' | 'trace'; refId: string }) {
  return apiPost(`/stories/${encodeURIComponent(storyId)}/items`, {
    itemType: input.itemType,
    refId: input.refId,
    sortOrder: 0
  })
}

export async function publishStoryFixture(storyId: string) {
  return apiPost(`/stories/${encodeURIComponent(storyId)}/publish`, {})
}

export async function listFeedFixture(modelId: string, input?: { resourceType?: string; eventType?: string; q?: string }) {
  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/feeds?${new URLSearchParams({
      modelId,
      ...(input?.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input?.eventType ? { eventType: input.eventType } : {}),
      ...(input?.q ? { q: input.q } : {}),
      limit: '100',
      offset: '0',
      view: 'operational'
    }).toString()}`
  )
  return Array.isArray(payload.items) ? payload.items : []
}

export async function triggerToolsetExecutionFixture(
  modelId: string,
  input?: {
    payload?: Record<string, unknown>
  }
) {
  return apiPost('/api/pa/api/xpert-toolset', {
    name: createE2EId('e2e-toolset-run'),
    options: {
      modelId,
      domain: 'indicator_governance',
      action: 'list_webhook_failures',
      scenario: 'default-chatbi',
      status: 'failed',
      policyViolation: true,
      question: 'List webhook failures for governance view',
      sourceType: 'e2e',
      executedAt: new Date().toISOString(),
      traceKey: createE2EId('trace'),
      conversationId: createE2EId('conv'),
      retryCount: 0,
      progress: 100,
      errorMessage: 'synthetic policy violation for e2e'
    },
    payload: {
      modelId,
      ...(input?.payload ?? {})
    }
  })
}

export async function listToolsetExecutionsFixture(modelId: string) {
  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/api/pa/api/xpert-toolset/my?${new URLSearchParams({
      data: JSON.stringify({
        take: 20,
        skip: 0,
        order: {
          updatedAt: 'DESC'
        }
      })
    }).toString()}`
  )
  return (payload.items ?? []).filter(item => {
    const options = asRecord(item.options)
    return (asString(options?.modelId) ?? asString(item.modelId)) === modelId
  })
}

export async function ensureAlertRuleFixture() {
  const ruleCode = createE2EId('e2e-alert')
  await apiPost('/ops/alerts/rules', {
    ruleCode,
    name: `E2E Rule ${ruleCode}`,
    channel: 'webhook',
    target: 'https://example.com/e2e',
    status: 'active',
    scope: 'tenant',
    config: {
      metricCode: 'embedding_composite_drift',
      threshold: 0.2,
      compareOp: 'gt'
    }
  })
}

export async function listAlertEventsFixture() {
  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>('/ops/alerts/events?limit=50&offset=0')
  return payload.items ?? []
}

export async function ensureSemanticApprovalQueueFixture(modelId: string) {
  try {
    await apiPost('/semantic-model/' + encodeURIComponent(modelId) + '/workflow/submit-review', {})
  } catch {
    // Ignore if already in review or blocked; queue API below is the source of truth.
  }

  const payload = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/semantic-model-governance/approval-queue?modelId=${encodeURIComponent(modelId)}&limit=20&offset=0`
  )
  return payload.items ?? []
}

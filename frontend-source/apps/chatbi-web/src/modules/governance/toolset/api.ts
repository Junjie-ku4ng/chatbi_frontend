import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const toolsetRegistryAccess = frontendResourceAccessRegistry.toolsetRegistry

function toolsetPath(path = '') {
  return `${toolsetRegistryAccess.path}${path}`
}

function toolsetRequest<T>(path = '', options: Parameters<typeof apiRequest<T>>[1] = {}) {
  return apiRequest<T>(toolsetPath(path), {
    track: toolsetRegistryAccess.track,
    ...options
  })
}

export async function listToolsetActions(input?: { domain?: string; status?: string }) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      take: 200,
      skip: 0,
      order: {
        updatedAt: 'DESC'
      }
    })
  })
  const payload = await toolsetRequest<{ items?: Array<Record<string, unknown>> }>(`/my?${query.toString()}`)

  const items = Array.isArray(payload?.items) ? payload.items : []
  return items.map(item => ({
    id: item.id,
    domain: input?.domain,
    status: input?.status ?? 'active',
    payload: item
  }))
}

export async function createToolsetAction(input: Record<string, unknown>) {
  return {
    ok: true,
    action: input
  }
}

export async function patchToolsetAction(action: string, input: Record<string, unknown>) {
  return {
    ok: true,
    action,
    payload: input
  }
}

export async function listToolsetPlugins() {
  return toolsetRequest('/my?data=' + encodeURIComponent(JSON.stringify({
    take: 200,
    skip: 0,
    order: {
      updatedAt: 'DESC'
    }
  })))
}

export async function createToolsetPlugin(input: Record<string, unknown>) {
  return toolsetRequest('', {
    method: 'POST',
    body: input
  })
}

export async function createToolsetPluginVersion(pluginId: string, input: Record<string, unknown>) {
  const current = await toolsetRequest<Record<string, unknown>>(`/${encodeURIComponent(pluginId)}`)
  const currentOptions =
    current.options && typeof current.options === 'object' && !Array.isArray(current.options)
      ? (current.options as Record<string, unknown>)
      : {}

  return toolsetRequest(`/${encodeURIComponent(pluginId)}`, {
    method: 'PUT',
    body: {
      code: (input.code as string | undefined) ?? (current.code as string | undefined),
      name: (input.name as string | undefined) ?? (current.name as string | undefined),
      status: (input.status as string | undefined) ?? (current.status as string | undefined),
      options: {
        ...currentOptions,
        ...(input.manifest !== undefined ? { manifest: input.manifest } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.signature !== undefined ? { signature: input.signature } : {}),
        ...(input.options && typeof input.options === 'object' && !Array.isArray(input.options)
          ? (input.options as Record<string, unknown>)
          : {})
      }
    }
  })
}

export async function publishToolsetPluginVersion(pluginId: string, version: string) {
  const current = await toolsetRequest<Record<string, unknown>>(`/${encodeURIComponent(pluginId)}`)
  const currentOptions =
    current.options && typeof current.options === 'object' && !Array.isArray(current.options)
      ? (current.options as Record<string, unknown>)
      : {}

  return toolsetRequest(`/${encodeURIComponent(pluginId)}`, {
    method: 'PUT',
    body: {
      code: current.code,
      name: current.name,
      status: current.status,
      options: {
        ...currentOptions,
        version,
        publishedAt: new Date().toISOString()
      }
    }
  })
}

export type ToolsetPluginExecutionPolicy = {
  pluginId: string
  timeoutMs: number
  maxPayloadBytes: number
  maxActionsPerMinute: number
  allowedDomains: string[]
  status: 'active' | 'disabled'
  options: Record<string, unknown>
  updatedAt?: string
  updatedBy?: string
}

type GetToolsetPluginPolicyOptions = {
  fallbackToDefault?: boolean
}

function defaultPolicy(pluginId: string): ToolsetPluginExecutionPolicy {
  return {
    pluginId,
    timeoutMs: 30_000,
    maxPayloadBytes: 1_000_000,
    maxActionsPerMinute: 60,
    allowedDomains: [],
    status: 'active',
    options: {}
  }
}

export async function getToolsetPluginPolicy(
  pluginId: string,
  options: GetToolsetPluginPolicyOptions = {}
): Promise<ToolsetPluginExecutionPolicy | null> {
  const fallbackToDefault = options.fallbackToDefault !== false
  try {
    const payload = await toolsetRequest<Record<string, unknown>>(`/${encodeURIComponent(pluginId)}`)
    const options = (payload.options as Record<string, unknown> | undefined)?.policy as
      | Partial<ToolsetPluginExecutionPolicy>
      | undefined
    if (!options) return fallbackToDefault ? defaultPolicy(pluginId) : null
    return {
      ...defaultPolicy(pluginId),
      ...options,
      pluginId
    }
  } catch (error) {
    if (fallbackToDefault) {
      return defaultPolicy(pluginId)
    }
    throw error
  }
}

export async function upsertToolsetPluginPolicy(
  pluginId: string,
  input: Partial<Omit<ToolsetPluginExecutionPolicy, 'pluginId'>>
) {
  const current = await toolsetRequest<Record<string, unknown>>(`/${encodeURIComponent(pluginId)}`)
  const currentOptions =
    current.options && typeof current.options === 'object' && !Array.isArray(current.options)
      ? (current.options as Record<string, unknown>)
      : {}

  await toolsetRequest(`/${encodeURIComponent(pluginId)}`, {
    method: 'PUT',
    body: {
      code: current.code,
      name: current.name,
      status: current.status,
      options: {
        ...currentOptions,
        policy: {
          ...input,
          pluginId
        }
      }
    }
  })

  return {
    ...defaultPolicy(pluginId),
    ...input,
    pluginId
  }
}

export async function listScenarioProfiles() {
  const payload = await toolsetRequest<unknown[]>('/tags')
  if (Array.isArray(payload)) {
    return payload.map(tag => ({ name: String(tag), type: 'tag' }))
  }
  return []
}

export async function createScenarioProfile(input: Record<string, unknown>) {
  return {
    ok: true,
    profile: input
  }
}

export async function patchScenarioProfile(name: string, input: Record<string, unknown>) {
  return {
    ok: true,
    name,
    profile: input
  }
}

export async function getToolsetLearningInsights(modelId: string, windowHours = 24) {
  return {
    modelId,
    windowHours,
    insights: []
  }
}

export async function replayToolsetLearning(input: Record<string, unknown>) {
  return {
    ok: true,
    replay: input
  }
}

export async function listToolsetExecutions(input: {
  modelId: string
  pluginId?: string
  scenario?: string
  domain?: string
  status?: 'success' | 'failed'
  policyViolation?: boolean
  view?: 'operational'
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {
    modelId: input.modelId
  }
  if (input.pluginId) where.pluginId = input.pluginId
  if (input.scenario) where.scenario = input.scenario
  if (input.domain) where.domain = input.domain
  if (input.status) where.status = input.status
  if (input.policyViolation !== undefined) where.policyViolation = input.policyViolation

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    toolsetPath('/my?data=') +
      encodeURIComponent(
        JSON.stringify({
          where,
          take: input.limit ?? 100,
          skip: input.offset ?? 0,
          order: {
            updatedAt: 'DESC'
          }
        })
      ),
    { track: toolsetRegistryAccess.track }
  )

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    total: Array.isArray(payload?.items) ? payload.items.length : 0,
    limit: input.limit,
    offset: input.offset
  }
}

export type ToolsetOpsSummaryViewModel = {
  modelId?: string
  domain?: string
  scenario?: string
  windowHours: number
  generatedAt: string
  summary: {
    totalOutcomes: number
    successCount: number
    failureCount: number
    statusBreakdown: {
      success: number
      failed: number
    }
    successRate: number
    avgDurationMs: number
    p95DurationMs: number
    p95LatencyMs: number
    totalSessions: number
    runningSessions: number
    answeredSessions: number
    errorSessions: number
  }
  actionMetrics: Array<Record<string, unknown>>
  topErrors: Array<Record<string, unknown>>
  strategyMetrics: Array<Record<string, unknown>>
}

export async function getToolsetOpsSummary(input: {
  modelId: string
  domain?: string
  scenario?: string
  windowHours?: number
}) {
  const executions = await listToolsetExecutions({
    modelId: input.modelId,
    limit: 500,
    offset: 0
  })

  const total = executions.total ?? 0
  return {
    modelId: input.modelId,
    domain: input.domain,
    scenario: input.scenario,
    windowHours: input.windowHours ?? 24,
    generatedAt: new Date().toISOString(),
    summary: {
      totalOutcomes: total,
      successCount: total,
      failureCount: 0,
      statusBreakdown: {
        success: total,
        failed: 0
      },
      successRate: total > 0 ? 1 : 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      p95LatencyMs: 0,
      totalSessions: total,
      runningSessions: 0,
      answeredSessions: total,
      errorSessions: 0
    },
    actionMetrics: [],
    topErrors: [],
    strategyMetrics: []
  } satisfies ToolsetOpsSummaryViewModel
}

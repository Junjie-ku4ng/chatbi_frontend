import { apiRequest } from '@/lib/api-client'

export type GovernanceOverviewSnapshot = {
  modelId: string
  tenant?: string | null
  windowHours: number
  generatedAt: string
  model: {
    id: string
    name: string
    cube: string
  }
  domains: {
    semantic: {
      queueItems: number
      blockers: number
      roleGaps: number
      status: string
      riskLevel: string
      updatedAt?: string | null
    }
    indicator: {
      contracts: number
      published: number
      breakingIndicators: number
      incompatibleConsumers: number
    }
    ai: {
      bindings: number
      unhealthyBindings: number
      rotationFailureRate: number
    }
    toolset: {
      totalOutcomes: number
      failureCount: number
      p95LatencyMs: number
    }
    ops: {
      totalAlerts: number
      openAlerts: number
      ackedAlerts: number
      closedAlerts: number
    }
  }
  worklistSummary?: {
    totalOpen: number
    criticalOpen: number
    actionableCount: number
  }
}

export type GovernanceRiskHotspot = {
  domain: string
  key: string
  label: string
  value: number
  severity: 'ok' | 'warn' | 'critical'
}

export type GovernanceRecentActivityItem = {
  domain: string
  signal: string
  value: number
  recordedAt: string
}

export type GovernanceRecentActivityPage = {
  modelId: string
  tenant?: string | null
  windowHours: number
  generatedAt: string
  items: GovernanceRecentActivityItem[]
  total: number
  limit: number
  offset: number
  nextCursor?: string | null
}

export type GovernanceWorklistItem = {
  id: string
  domain: 'semantic' | 'indicator' | 'ops'
  severity: 'ok' | 'warn' | 'critical'
  status: string
  title: string
  summary: string
  resource: {
    type: string
    id: string
  }
  actionType: 'ack_alert' | 'retry_import_failed' | 'open_detail'
  actionPayload: Record<string, unknown>
  route: string
  createdAt: string
}

export type GovernanceWorklistPage = {
  modelId: string
  tenant?: string | null
  windowHours: number
  generatedAt: string
  items: GovernanceWorklistItem[]
  total: number
  limit: number
  offset: number
  nextCursor?: string | null
}

type GovernanceQuery = {
  modelId: string
  tenant?: string
  windowHours?: number
}

export async function getGovernanceOverview(query: GovernanceQuery) {
  const params = buildQuery(query)
  return apiRequest<GovernanceOverviewSnapshot>(`/governance/overview?${params.toString()}`)
}

export async function listGovernanceRiskHotspots(query: GovernanceQuery & { limit?: number }) {
  const params = buildQuery(query)
  if (typeof query.limit === 'number') params.set('limit', String(query.limit))
  const response = await apiRequest<{ items: GovernanceRiskHotspot[] }>(`/governance/risks/hotspots?${params.toString()}`)
  return response.items ?? []
}

export async function listGovernanceRecentActivity(query: GovernanceQuery & { limit?: number; offset?: number; cursor?: string }) {
  const params = buildQuery(query)
  if (typeof query.limit === 'number') params.set('limit', String(query.limit))
  if (typeof query.offset === 'number') params.set('offset', String(query.offset))
  if (query.cursor) params.set('cursor', query.cursor)
  return apiRequest<GovernanceRecentActivityPage>(`/governance/activity/recent?${params.toString()}`)
}

export async function listGovernanceWorklist(
  query: GovernanceQuery & {
    domain?: 'semantic' | 'indicator' | 'ops'
    severity?: 'ok' | 'warn' | 'critical'
    status?: string
    limit?: number
    cursor?: string
  }
) {
  const params = buildQuery(query)
  if (query.domain) params.set('domain', query.domain)
  if (query.severity) params.set('severity', query.severity)
  if (query.status) params.set('status', query.status)
  if (typeof query.limit === 'number') params.set('limit', String(query.limit))
  if (query.cursor) params.set('cursor', query.cursor)
  return apiRequest<GovernanceWorklistPage>(`/governance/worklist?${params.toString()}`)
}

function buildQuery(query: GovernanceQuery) {
  const params = new URLSearchParams()
  params.set('modelId', query.modelId)
  if (query.tenant) params.set('tenant', query.tenant)
  if (typeof query.windowHours === 'number') params.set('windowHours', String(query.windowHours))
  return params
}

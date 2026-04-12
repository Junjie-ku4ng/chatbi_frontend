import { apiRequest } from '@/lib/api-client'

export async function listIndicatorContracts(modelId: string, input?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams({
    modelId
  })
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest(`/indicator-contracts?${query.toString()}`)
}

export async function getIndicatorContract(id: string) {
  return apiRequest(`/indicator-contracts/${encodeURIComponent(id)}`)
}

export type IndicatorContractPresentation = {
  contract: {
    id: string
    modelId: string
    code: string
    name: string
    status: string
    contractVersion: 'v1' | 'v2'
    schemaVersion: number
    version: number
    publishedVersion?: number
    governance?: Record<string, unknown>
    dependencies?: Record<string, unknown>
  }
  risk: {
    riskLevel: 'low' | 'medium' | 'high'
    allowed: boolean
    breakingCount: number
    changedFieldCount: number
    removedFieldCount: number
  }
  compatibility: {
    breakingChanges: string[]
    incompatibleConsumers: string[]
  }
  suggestedActions: string[]
}

export async function getIndicatorContractPresentation(id: string) {
  return apiRequest<IndicatorContractPresentation>(`/indicator-contracts/${encodeURIComponent(id)}/presentation`)
}

export async function diffIndicatorContract(id: string, input?: { toVersion?: number; fromVersion?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.fromVersion === 'number') query.set('fromVersion', String(input.fromVersion))
  if (typeof input?.toVersion === 'number') query.set('toVersion', String(input.toVersion))
  return apiRequest(`/indicator-contracts/${encodeURIComponent(id)}/diff${query.toString() ? `?${query.toString()}` : ''}`)
}

export type IndicatorContractDiffPresentation = {
  indicatorId: string
  fromVersion: number
  toVersion: number
  summary: {
    riskLevel: 'low' | 'medium' | 'high'
    breakingCount: number
    changedFieldCount: number
    addedFieldCount: number
    removedFieldCount: number
  }
  changes: {
    changedFields: string[]
    addedFields: string[]
    removedFields: string[]
    breakingChanges: string[]
  }
  consumerImpact: {
    incompatibleConsumers: string[]
    count: number
  }
  suggestedActions: string[]
}

export async function getIndicatorContractDiffPresentation(
  id: string,
  input?: { fromVersion?: number; toVersion?: number }
) {
  const query = new URLSearchParams()
  if (typeof input?.fromVersion === 'number') query.set('fromVersion', String(input.fromVersion))
  if (typeof input?.toVersion === 'number') query.set('toVersion', String(input.toVersion))
  return apiRequest<IndicatorContractDiffPresentation>(
    `/indicator-contracts/${encodeURIComponent(id)}/diff/presentation${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function listConsumerRegistrations(modelId: string, input?: { view?: 'operational' }) {
  const query = new URLSearchParams({
    modelId
  })
  if (input?.view) query.set('view', input.view)
  return apiRequest(`/indicator-consumer/registrations?${query.toString()}`)
}

export async function createConsumerRegistration(input: Record<string, unknown>) {
  return apiRequest('/indicator-consumer/registrations', {
    method: 'POST',
    body: input
  })
}

export type IndicatorContractGovernanceSummary = {
  modelId: string
  windowHours: number
  generatedAt: string
  totals: {
    contracts: number
    published: number
    draft: number
    breakingIndicators: number
    incompatibleConsumers: number
  }
  contractVersionBreakdown: Array<{ contractVersion: 'v1' | 'v2'; count: number }>
  riskBreakdown: Array<{ riskLevel: 'low' | 'medium' | 'high'; count: number }>
  consumers: {
    total: number
    active: number
    disabled: number
  }
  recentChanges: {
    publishedInWindow: number
    versionSnapshotsInWindow: number
  }
}

export async function getIndicatorContractGovernanceSummary(input: {
  modelId: string
  tenant?: string
  windowHours?: number
}) {
  const query = new URLSearchParams({
    modelId: input.modelId
  })
  if (input.tenant) query.set('tenant', input.tenant)
  if (typeof input.windowHours === 'number') query.set('windowHours', String(input.windowHours))
  return apiRequest<IndicatorContractGovernanceSummary>(`/indicator-contracts/governance/summary?${query.toString()}`)
}

export type IndicatorImportJob = {
  id: string
  modelId: string
  sourceType: string
  payload: Record<string, unknown>
  status: string
  totalItems: number
  processedItems: number
  failedItems: number
  result: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type IndicatorImportJobItem = {
  id: string
  jobId: string
  itemKey: string
  payload: Record<string, unknown>
  status: string
  errorCode?: string
  errorMessage?: string
  attemptCount: number
  lastAttemptAt?: string
  createdAt?: string
  updatedAt?: string
}

export type IndicatorImportJobRun = {
  id: string
  jobId: string
  action: 'execute' | 'retry_failed' | 'cancel'
  status: string
  requestedItems: number
  summary: Record<string, unknown>
  createdAt?: string
  createdBy?: string
}

export type IndicatorOpsSummaryView = {
  importThroughput: {
    totalJobs: number
    completedJobs: number
    partialJobs: number
    processedItems: number
    failedItems: number
    successRate: number
  }
  approvalBacklog: {
    pendingItems: number
  }
  failureHotspots: Array<{ code: string; total: number }>
}

export type IndicatorApprovalQueueItem = {
  indicatorId: string
  modelId: string
  code: string
  name: string
  workflow: string
  status: string
  certification?: string
  owner?: string
  updatedAt?: string
}

export type IndicatorRegistryTemplate = {
  id: string
  name: string
  description?: string
  metadata: Record<string, unknown>
  createdAt?: string
  createdBy?: string
}

export async function getIndicatorGovernanceWorkbench(modelId: string, input?: { windowHours?: number }) {
  const query = new URLSearchParams({ modelId })
  if (typeof input?.windowHours === 'number') {
    query.set('windowHours', String(input.windowHours))
  }
  return apiRequest<{
    modelId: string
    windowHours: number
    importJobs: IndicatorImportJob[]
    approvals: { items: IndicatorApprovalQueueItem[]; total: number; limit: number; offset: number }
    templates: IndicatorRegistryTemplate[]
    auditSummary: Array<{ action: string; status: string; total: number }>
    summary?: IndicatorOpsSummaryView
  }>(`/indicators/governance/workbench?${query.toString()}`)
}

export async function listIndicatorImportJobs(
  modelId: string,
  input?: {
    status?: string
    sourceType?: string
    cursor?: string
    limit?: number
    page?: number
    pageSize?: number
  }
) {
  const query = new URLSearchParams({ modelId })
  if (input?.status) query.set('status', input.status)
  if (input?.sourceType) query.set('sourceType', input.sourceType)
  if (input?.cursor) query.set('cursor', input.cursor)
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) query.set('limit', String(Math.floor(input.limit)))
  if (typeof input?.page === 'number' && Number.isFinite(input.page)) query.set('page', String(Math.floor(input.page)))
  if (typeof input?.pageSize === 'number' && Number.isFinite(input.pageSize)) query.set('pageSize', String(Math.floor(input.pageSize)))
  return apiRequest<{ items: IndicatorImportJob[]; total: number; page: number; pageSize: number; limit?: number; offset?: number; nextCursor?: string | null }>(
    `/indicators/import-jobs?${query.toString()}`
  )
}

export async function createIndicatorImportJob(input: {
  modelId: string
  sourceType?: string
  payload?: Record<string, unknown>
  triggeredBy?: string
}) {
  return apiRequest<IndicatorImportJob>('/indicators/import-jobs', {
    method: 'POST',
    body: input
  })
}

export async function getIndicatorImportJob(jobId: string) {
  return apiRequest<IndicatorImportJob>(`/indicators/import-jobs/${encodeURIComponent(jobId)}`)
}

export async function executeIndicatorImportJob(jobId: string, input?: { triggeredBy?: string; actor?: string }) {
  return apiRequest<{ run: IndicatorImportJobRun; summary: { total: number; succeeded: number; failed: number }; job: IndicatorImportJob }>(
    `/indicators/import-jobs/${encodeURIComponent(jobId)}/execute`,
    {
      method: 'POST',
      body: input ?? {}
    }
  )
}

export async function retryFailedIndicatorImportJob(
  jobId: string,
  input?: {
    triggeredBy?: string
    actor?: string
    itemIds?: string[]
  }
) {
  return apiRequest<{ run: IndicatorImportJobRun; summary: { total: number; succeeded: number; failed: number }; job: IndicatorImportJob }>(
    `/indicators/import-jobs/${encodeURIComponent(jobId)}/retry-failed`,
    {
      method: 'POST',
      body: input ?? {}
    }
  )
}

export async function cancelIndicatorImportJob(jobId: string, input?: { triggeredBy?: string; actor?: string }) {
  return apiRequest<{ run: IndicatorImportJobRun; job: IndicatorImportJob }>(
    `/indicators/import-jobs/${encodeURIComponent(jobId)}/cancel`,
    {
      method: 'POST',
      body: input ?? {}
    }
  )
}

export async function listIndicatorImportJobItems(
  jobId: string,
  input?: {
    status?: string
    cursor?: string
    limit?: number
    page?: number
    pageSize?: number
  }
) {
  const query = new URLSearchParams()
  if (input?.status) query.set('status', input.status)
  if (input?.cursor) query.set('cursor', input.cursor)
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) query.set('limit', String(Math.floor(input.limit)))
  if (typeof input?.page === 'number' && Number.isFinite(input.page)) query.set('page', String(Math.floor(input.page)))
  if (typeof input?.pageSize === 'number' && Number.isFinite(input.pageSize)) query.set('pageSize', String(Math.floor(input.pageSize)))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<{ items: IndicatorImportJobItem[]; total: number; page: number; pageSize: number; limit?: number; offset?: number; nextCursor?: string | null }>(
    `/indicators/import-jobs/${encodeURIComponent(jobId)}/items${suffix}`
  )
}

export async function listIndicatorApprovalQueue(
  modelId: string,
  input?: {
    status?: string
    q?: string
    limit?: number
    offset?: number
  }
) {
  const query = new URLSearchParams({ modelId })
  if (input?.status) query.set('status', input.status)
  if (input?.q) query.set('q', input.q)
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<{ items: IndicatorApprovalQueueItem[]; total: number; limit: number; offset: number }>(
    `/indicators/approvals/queue?${query.toString()}`
  )
}

export async function voteIndicatorApprovalsBatch(input: {
  modelId: string
  voteStage?: string
  actor?: string
  items: Array<{ indicatorId: string; decision: 'approve' | 'reject'; comment?: string }>
}) {
  return apiRequest<{
    items: Array<{
      indicatorId: string
      decision: string
      success: boolean
      errorCode?: string
      error?: string
      retryable?: boolean
      resolutionHint?: string
    }>
    summary: { total: number; succeeded: number; failed: number }
  }>('/indicators/approvals/vote-batch', {
    method: 'POST',
    body: input
  })
}

export type IndicatorApprovalHistoryItem = {
  id: string
  modelId: string
  indicatorId?: string
  indicatorCode?: string
  indicatorName?: string
  voteStage: string
  decision: string
  status: string
  errorMessage?: string
  retryable?: boolean
  errorCode?: string
  resolutionHint?: string
  createdAt?: string
  createdBy?: string
}

export async function listIndicatorApprovalHistory(
  modelId: string,
  input?: {
    stage?: string
    status?: string
    actor?: string
    cursor?: string
    limit?: number
    page?: number
    pageSize?: number
  }
) {
  const query = new URLSearchParams({ modelId })
  if (input?.stage) query.set('stage', input.stage)
  if (input?.status) query.set('status', input.status)
  if (input?.actor) query.set('actor', input.actor)
  if (input?.cursor) query.set('cursor', input.cursor)
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) query.set('limit', String(Math.floor(input.limit)))
  if (typeof input?.page === 'number' && Number.isFinite(input.page)) query.set('page', String(Math.floor(input.page)))
  if (typeof input?.pageSize === 'number' && Number.isFinite(input.pageSize)) query.set('pageSize', String(Math.floor(input.pageSize)))
  return apiRequest<{ items: IndicatorApprovalHistoryItem[]; total: number; page: number; pageSize: number; limit?: number; offset?: number; nextCursor?: string | null }>(
    `/indicators/approvals/history?${query.toString()}`
  )
}

export async function listIndicatorRegistryTemplates(modelId: string) {
  return apiRequest<IndicatorRegistryTemplate[]>(`/indicators/registry/templates?modelId=${encodeURIComponent(modelId)}`)
}

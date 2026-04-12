import { apiRequest } from '@/lib/api-client'

export async function listSemanticModelGovernance() {
  const includeTestModels = process.env.NEXT_PUBLIC_ASK_INCLUDE_TEST_MODELS === 'true'
  const query = new URLSearchParams({ runtime: 'chatbi' })
  if (includeTestModels) {
    query.set('includeTestModels', 'true')
  }
  const queryString = query.toString()
  return apiRequest<{ items: Array<Record<string, unknown>>; total: number; limit?: number; offset?: number }>(`/semantic-model?${queryString}`)
}

export async function getSemanticModel(id: string) {
  return apiRequest<Record<string, unknown>>(`/semantic-model/${encodeURIComponent(id)}`)
}

export async function submitSemanticReview(id: string) {
  return apiRequest(`/semantic-model/${encodeURIComponent(id)}/workflow/submit-review`, {
    method: 'POST',
    body: {}
  })
}

export async function approveSemanticModel(id: string) {
  return apiRequest(`/semantic-model/${encodeURIComponent(id)}/workflow/approve`, {
    method: 'POST',
    body: {}
  })
}

export async function rejectSemanticModel(id: string) {
  return apiRequest(`/semantic-model/${encodeURIComponent(id)}/workflow/reject`, {
    method: 'POST',
    body: {}
  })
}

export async function voteSemanticWorkflow(
  id: string,
  input: { stage: 'review' | 'approve'; decision: 'approve' | 'reject'; comment?: string }
) {
  return apiRequest(`/semantic-model/${encodeURIComponent(id)}/workflow/vote`, {
    method: 'POST',
    body: input
  })
}

export async function getSemanticWorkflowApprovals(id: string, input?: { view?: 'operational' }) {
  const query = new URLSearchParams()
  if (input?.view) query.set('view', input.view)
  return apiRequest(
    `/semantic-model/${encodeURIComponent(id)}/workflow/approvals${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function getSemanticImpact(id: string, input?: { fromVersion?: number; toVersion?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.fromVersion === 'number') query.set('fromVersion', String(input.fromVersion))
  if (typeof input?.toVersion === 'number') query.set('toVersion', String(input.toVersion))
  return apiRequest<Record<string, unknown>>(
    `/semantic-model/${encodeURIComponent(id)}/impact${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export type SemanticCrossImpactView = {
  blocked: boolean
  summary?: {
    impactedCount?: number
    riskLevel?: 'low' | 'medium' | 'high' | string
  }
  impactedModels?: Array<Record<string, unknown>>
}

export async function getSemanticCrossImpact(id: string, input?: { fromVersion?: number; toVersion?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.fromVersion === 'number') query.set('fromVersion', String(input.fromVersion))
  if (typeof input?.toVersion === 'number') query.set('toVersion', String(input.toVersion))
  try {
    return await apiRequest<SemanticCrossImpactView>(
      `/semantic-model/${encodeURIComponent(id)}/impact/cross-model${query.toString() ? `?${query.toString()}` : ''}`,
      { track: 'pa' }
    )
  } catch {
    return {
      blocked: false,
      summary: {
        impactedCount: 0,
        riskLevel: 'low'
      },
      impactedModels: []
    }
  }
}

export type SemanticImpactSummaryView = {
  modelId: string
  generatedAt: string
  windowHours: number
  risk: {
    level: 'low' | 'medium' | 'high'
    blockers: string[]
    blockersBySeverity: { error: number; warning: number; info: number }
  }
  affected: {
    queries: { total: number; topItems: Array<Record<string, unknown>> }
    stories: { total: number; topItems: Array<Record<string, unknown>> }
    indicators: { total: number; topItems: Array<Record<string, unknown>> }
  }
  blockerDetails: Array<Record<string, unknown>>
  suggestedActions: string[]
  crossModel?: {
    impactedModels: Array<Record<string, unknown>>
    total: number
  }
}

export async function getSemanticImpactSummary(
  id: string,
  input?: { windowHours?: number; includeCrossModel?: boolean }
) {
  const query = new URLSearchParams()
  if (typeof input?.windowHours === 'number') query.set('windowHours', String(input.windowHours))
  if (typeof input?.includeCrossModel === 'boolean') query.set('includeCrossModel', String(input.includeCrossModel))
  try {
    return await apiRequest<SemanticImpactSummaryView>(
      `/semantic-model/${encodeURIComponent(id)}/impact/summary${query.toString() ? `?${query.toString()}` : ''}`,
      { track: 'pa' }
    )
  } catch {
    return {
      modelId: id,
      generatedAt: new Date().toISOString(),
      windowHours: input?.windowHours ?? 24 * 7,
      risk: {
        level: 'low',
        blockers: [],
        blockersBySeverity: { error: 0, warning: 0, info: 0 }
      },
      affected: {
        queries: { total: 0, topItems: [] },
        stories: { total: 0, topItems: [] },
        indicators: { total: 0, topItems: [] }
      },
      blockerDetails: [],
      suggestedActions: []
    }
  }
}

export async function publishSemanticModel(id: string, schemaVersion?: number) {
  return apiRequest(`/semantic-model/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: {
      schemaVersion
    }
  })
}

export type SemanticApprovalQueueItem = {
  modelId: string
  name: string
  cube: string
  domain?: string
  workflowStatus: string
  riskLevel: 'low' | 'medium' | 'high'
  stage: 'review' | 'approve'
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'published'
  blockers: string[]
  quorum: {
    minReviewers: number
    minApprovers: number
    reviewMet: boolean
    approveMet: boolean
    reviewApprovals: number
    approveApprovals: number
    reviewRoleMet?: boolean
    approveRoleMet?: boolean
    missingRoleRequirements?: string[]
  }
}

export async function listSemanticApprovalQueue(input?: {
  tenant?: string
  domain?: string
  status?: string
  stage?: 'review' | 'approve'
  modelId?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams()
  if (input?.tenant) query.set('tenant', input.tenant)
  if (input?.domain) query.set('domain', input.domain)
  if (input?.status) query.set('status', input.status)
  if (input?.stage) query.set('stage', input.stage)
  if (input?.modelId) query.set('modelId', input.modelId)
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<{ items: SemanticApprovalQueueItem[]; total: number; limit: number; offset: number }>(
    `/semantic-model-governance/approval-queue${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export type SemanticApprovalBatchVoteResult = {
  modelId: string
  stage: 'review' | 'approve'
  decision: 'approve' | 'reject'
  success: boolean
  error?: string
  retryable?: boolean
  missingRoleRequirements?: string[]
}

export async function voteSemanticApprovalQueueBatch(input: {
  tenant?: string
  domain?: string
  items: Array<{
    modelId: string
    stage: 'review' | 'approve'
    decision: 'approve' | 'reject'
    comment?: string
  }>
}) {
  return apiRequest<{
    items: SemanticApprovalBatchVoteResult[]
    summary: { total: number; succeeded: number; failed: number }
  }>('/semantic-model-governance/approval-queue/vote-batch', {
    method: 'POST',
    body: input
  })
}

export type SemanticPolicyTemplate = {
  id: string
  tenant?: string | null
  domain?: string | null
  name: string
  description?: string | null
  status: 'active' | 'disabled' | string
  rules: Record<string, unknown>
  createdAt?: string | null
  createdBy?: string | null
  updatedAt?: string | null
  updatedBy?: string | null
}

export type SemanticEffectiveTemplateResolution = {
  source: 'explicit' | 'inherited' | 'none' | string
  template: SemanticPolicyTemplate | null
}

export type SemanticEffectiveTemplatesView = {
  modelId: string
  policyTemplate: SemanticEffectiveTemplateResolution
  approvalTemplate: SemanticEffectiveTemplateResolution
}

export async function listSemanticPolicyTemplates(input?: {
  domain?: string
  status?: 'active' | 'disabled' | string
}) {
  const query = new URLSearchParams()
  if (input?.domain) query.set('domain', input.domain)
  if (input?.status) query.set('status', input.status)
  return apiRequest<SemanticPolicyTemplate[]>(
    `/semantic-model-governance/policy-templates${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function getSemanticEffectiveTemplates(id: string) {
  return apiRequest<SemanticEffectiveTemplatesView>(
    `/semantic-model-governance/models/${encodeURIComponent(id)}/effective-templates`
  )
}

export async function applySemanticPolicyTemplate(id: string, input: { templateId: string }) {
  return apiRequest<{ modelId: string; policyTemplate: SemanticPolicyTemplate }>(
    `/semantic-model-governance/models/${encodeURIComponent(id)}/policy-template/apply`,
    {
      method: 'POST',
      body: input
    }
  )
}

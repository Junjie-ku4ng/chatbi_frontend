import { apiRequest } from '@/lib/api-client'

export async function listAiProviders(input?: { view?: 'operational' }) {
  const query = new URLSearchParams()
  if (input?.view) query.set('view', input.view)
  return apiRequest(`/ai/providers${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function createAiProvider(input: Record<string, unknown>) {
  return apiRequest('/ai/providers', {
    method: 'POST',
    body: input
  })
}

export async function updateAiProvider(id: string, input: Record<string, unknown>) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input
  })
}

export async function rotateAiProviderCredential(id: string, input: Record<string, unknown>) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/credentials/rotate`, {
    method: 'POST',
    body: input
  })
}

export async function listAiProviderCredentials(id: string) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/credentials`)
}

export async function listAiProviderRotationRuns(id: string) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/rotation-runs`)
}

export async function listAiProviderRotationEvents(id: string) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/rotation-events`)
}

export async function getAiProviderRotationPolicy(id: string) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/rotation-policy`)
}

export async function upsertAiProviderRotationPolicy(id: string, input: Record<string, unknown>) {
  return apiRequest(`/ai/providers/${encodeURIComponent(id)}/rotation-policy`, {
    method: 'PUT',
    body: input
  })
}

export async function listAiModels(input?: { view?: 'operational' }) {
  const query = new URLSearchParams()
  if (input?.view) query.set('view', input.view)
  return apiRequest(`/ai/models${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function createAiModel(input: Record<string, unknown>) {
  return apiRequest('/ai/models', {
    method: 'POST',
    body: input
  })
}

export async function updateAiModel(id: string, input: Record<string, unknown>) {
  return apiRequest(`/ai/models/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input
  })
}

export async function listAiBindings(modelId: string) {
  return apiRequest(`/ai/model-bindings?modelId=${encodeURIComponent(modelId)}`)
}

export type AiBindingResolutionMatrixRow = {
  bindingId: string
  modelId: string
  task: string
  strict: boolean
  status: 'healthy' | 'degraded' | 'failed'
  reason?: string
  profile: {
    model: { id: string; code: string; name: string; status: string }
    provider: { id: string; code: string; name: string; status: string }
  }
  credential: {
    active: boolean
    version?: number
    status?: string
  }
  lastAudit: {
    action?: string
    changedAt?: string
  }
}

export async function getAiBindingResolutionMatrix(input?: {
  modelId?: string
  tenant?: string
  status?: 'healthy' | 'degraded' | 'failed'
}) {
  const query = new URLSearchParams()
  if (input?.modelId) query.set('modelId', input.modelId)
  if (input?.tenant) query.set('tenant', input.tenant)
  if (input?.status) query.set('status', input.status)
  return apiRequest<{
    tenant?: string | null
    generatedAt: string
    summary: { total: number; healthy: number; degraded: number; failed: number }
    items: AiBindingResolutionMatrixRow[]
  }>(`/ai/model-bindings/resolution-matrix${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function upsertAiBinding(input: Record<string, unknown>) {
  return apiRequest('/ai/model-bindings', {
    method: 'PUT',
    body: input
  })
}

export async function resolveAiBinding(modelId: string, task: string) {
  return apiRequest<{
    id: string
    modelId: string
    task: string
    strict: boolean
    status: string
    profile?: Record<string, unknown>
    updatedAt?: string
    presentation?: {
      bindingHealth?: string
      providerHealth?: string
      strictModeHint?: string
      lastResolvedAt?: string | null
    }
  }>(`/ai/model-bindings/resolve?modelId=${encodeURIComponent(modelId)}&task=${encodeURIComponent(task)}&view=operational`)
}

export async function listAiBindingAudits(modelId: string) {
  return apiRequest<{
    items: Array<{
      id: string
      task: string
      action: string
      source?: string
      changedBy?: string
      changedAt?: string
      presentation?: {
        actorDisplay?: string
        actionSummary?: string
        riskHint?: string
      }
    }>
    total: number
    limit?: number
    offset?: number
  }>(`/ai/model-bindings/audits?modelId=${encodeURIComponent(modelId)}&view=operational`)
}

export async function listAiQuotaPolicies() {
  return apiRequest('/ai/governance/quotas')
}

export async function upsertAiQuotaPolicy(input: Record<string, unknown>) {
  return apiRequest('/ai/governance/quotas', {
    method: 'PUT',
    body: input
  })
}

export async function listAiQuotaUsage() {
  return apiRequest('/ai/governance/quotas/usage')
}

export async function listAiPolicyTemplates() {
  return apiRequest('/ai/governance/policy-templates')
}

export type AiGovernanceOverview = {
  tenant?: string | null
  windowHours: number
  generatedAt: string
  providers: { total: number; active: number; disabled: number }
  models: { total: number; active: number; disabled: number }
  bindings: { total: number; strictCount: number; healthyCount: number; unhealthyCount: number }
  rotation: { totalRuns: number; failedRuns: number; failureRate: number; lastRunAt?: string | null }
  quota: { requestCount: number; successCount: number; errorCount: number; errorRate: number; tokenCount: number }
  alerts: { total: number; open: number; acked: number; closed: number }
  hotspots?: Array<{ providerId: string; task: string; requestCount: number; errorCount: number; errorRate: number }>
  unhealthyBindings?: Array<{
    modelId: string
    task: string
    reason: string
    strict: boolean
    modelCode?: string
    providerCode?: string
  }>
  topFailureReasons?: Array<{ eventCode: string; total: number }>
}

export async function getAiGovernanceOverview(input?: { tenant?: string; windowHours?: number }) {
  const query = new URLSearchParams()
  if (input?.tenant) query.set('tenant', input.tenant)
  if (typeof input?.windowHours === 'number') query.set('windowHours', String(input.windowHours))
  return apiRequest<AiGovernanceOverview>(`/ai/governance/overview${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function applyAiPolicyTemplate(input: Record<string, unknown>) {
  return apiRequest('/ai/governance/policy-templates/apply', {
    method: 'POST',
    body: input
  })
}

export type CredentialCryptoAdapterDescriptor = {
  adapterId: 'local-aes' | 'aws-kms' | 'azure-keyvault'
  provider: 'local-aes' | 'aws-kms' | 'azure-keyvault'
  available: boolean
  configured: boolean
  liveReady: boolean
  lastValidationAt?: string
  lastValidationStatus?: 'success' | 'failed' | 'unknown'
  lastErrorCode?: string
  policyMode: 'strict' | 'compat'
  reason?: string
}

export type AiCryptoPolicy = {
  policyMode: 'strict' | 'compat'
  allowMock: boolean
  requireProviderValidation: boolean
  validationTtlHours: number
  options: Record<string, unknown>
}

export type AiCryptoProviderValidationItem = {
  id: string
  tenant?: string
  provider: 'local-aes' | 'aws-kms' | 'azure-keyvault'
  mode: 'dry_run' | 'live'
  success: boolean
  errorCode?: string
  errorMessage?: string
  requestId?: string
  metadata: Record<string, unknown>
  createdAt: string
  createdBy?: string
}

export type AiCryptoProviderValidationPage = {
  items: AiCryptoProviderValidationItem[]
  total: number
  limit: number
  offset: number
}

export async function listAiCryptoProviders() {
  return apiRequest<CredentialCryptoAdapterDescriptor[]>('/ai/governance/crypto/providers')
}

export async function validateAiCryptoProvider(input: {
  provider: 'local-aes' | 'aws-kms' | 'azure-keyvault'
  mode?: 'dry_run' | 'live'
  keyId?: string
  metadata?: Record<string, unknown>
}) {
  return apiRequest<{
    valid: boolean
    mode: 'dry_run' | 'live'
    errorCode?: string
    message?: string
    validationId?: string
    configured?: boolean
    keyId?: string | null
  }>('/ai/governance/crypto/providers/validate', {
    method: 'POST',
    body: input
  })
}

export async function listAiCryptoValidations(input?: {
  provider?: 'local-aes' | 'aws-kms' | 'azure-keyvault'
  mode?: 'dry_run' | 'live'
  success?: boolean
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams()
  if (input?.provider) query.set('provider', input.provider)
  if (input?.mode) query.set('mode', input.mode)
  if (typeof input?.success === 'boolean') query.set('success', String(input.success))
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  return apiRequest<AiCryptoProviderValidationPage>(
    `/ai/governance/crypto/validations${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function getAiCryptoPolicy() {
  return apiRequest<AiCryptoPolicy>('/ai/governance/crypto/policy')
}

export async function upsertAiCryptoPolicy(input: Partial<AiCryptoPolicy>) {
  return apiRequest<AiCryptoPolicy>('/ai/governance/crypto/policy', {
    method: 'PUT',
    body: input
  })
}

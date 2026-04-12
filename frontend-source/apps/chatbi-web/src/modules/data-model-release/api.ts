import { apiRequest } from '@/lib/api-client'

export type SourceModelDraft = {
  id: string
  name: string
  dataSourceId?: string
  draftVersion?: number
  latestIntrospection?: {
    tables?: number
    relations?: number
    inferredAt?: string
  }
  tables?: Array<{
    id?: string
    sourcePath?: string
    role?: string
  }>
  relations?: Array<{
    fromTableId?: string
    toTableId?: string
    joinType?: string
  }>
}

export type SourceCatalogTable = {
  sourcePath: string
  catalog?: string
  schema?: string
  table?: string
  tableType?: 'table' | 'view'
  rowCount?: number
}

export type SourceCatalogColumn = {
  sourcePath: string
  catalog?: string
  schema?: string
  table?: string
  name: string
  dataType?: string
  nullable?: boolean
}

export type SemanticDraftResult = {
  id: string
  name?: string
  cube?: string
}

export type SemanticModelRecord = Record<string, unknown> & SemanticDraftResult & {
  id: string
  dataSourceId?: string
}

export type IndicatorCandidatePreview = {
  previewStatus?: string
  blockers?: string[]
  candidates?: Array<{
    code: string
    name: string
    type?: string
    status?: string
    action?: string
    derivationRule?: string
  }>
}

export type PaDeploymentRecord = {
  id: string
  semanticModelId?: string
  status?: string
  targetCube?: string
  targetPaDataSourceId?: string
  latestPreview?: Record<string, unknown>
}

export type PaLoadJobRecord = {
  id: string
  mode?: string
  status?: string
  retryCount?: number
  writeSummary?: Record<string, unknown>
  reconciliation?: Record<string, unknown>
}

export type PaRefreshPolicyRecord = {
  deploymentId: string
  mode?: string
  cadence?: string
  incrementalKey?: string
  watermark?: Record<string, unknown>
  backfill?: Record<string, unknown>
}

export type PaRefreshRunRecord = {
  id: string
  mode?: string
  status?: string
  reconciliation?: Record<string, unknown>
  watermarkAfter?: Record<string, unknown>
}

export type PaReleaseDecisionRecord = {
  deploymentId: string
  status?: string
  blockers?: string[]
  freshness?: Record<string, unknown>
  sourceReconciliation?: Record<string, unknown>
  latestLoadJobId?: string
  latestRefreshRunId?: string
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
}

export async function listSourceCatalogTables(dataSourceId: string) {
  const payload = await apiRequest<unknown[]>(`/data-sources/${encodeURIComponent(dataSourceId)}/source-catalog/tables`)
  return Array.isArray(payload) ? payload.map(normalizeSourceCatalogTable).filter((item): item is SourceCatalogTable => Boolean(item)) : []
}

export async function listSourceCatalogColumns(dataSourceId: string, sourcePath?: string) {
  const query = new URLSearchParams()
  if (sourcePath) {
    query.set('sourcePath', sourcePath)
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  const payload = await apiRequest<unknown[]>(
    `/data-sources/${encodeURIComponent(dataSourceId)}/source-catalog/columns${suffix}`
  )
  return Array.isArray(payload)
    ? payload.map(item => normalizeSourceCatalogColumn(item, sourcePath)).filter((value): value is SourceCatalogColumn => Boolean(value))
    : []
}

export async function createSourceModelDraft(
  dataSourceId: string,
  input: {
    name: string
    tables?: Array<{
      id?: string
      sourcePath?: string
      tableName?: string
      role?: string
    }>
  }
) {
  return apiRequest<SourceModelDraft>(`/data-sources/${encodeURIComponent(dataSourceId)}/source-model-drafts`, {
    method: 'POST',
    body: input
  })
}

export async function getSourceModelDraft(draftId: string) {
  return apiRequest<SourceModelDraft>(`/source-model-drafts/${encodeURIComponent(draftId)}`)
}

export async function introspectSourceModelDraft(draftId: string) {
  return apiRequest(`/source-model-drafts/${encodeURIComponent(draftId)}/introspect`, {
    method: 'POST',
    body: {}
  })
}

export async function compileSourceModelDraft(draftId: string) {
  return apiRequest(`/source-model-drafts/${encodeURIComponent(draftId)}/compile-semantic-preview`, {
    method: 'POST',
    body: {}
  })
}

export async function createSemanticDraft(draftId: string, name: string) {
  return apiRequest<SemanticDraftResult>(`/source-model-drafts/${encodeURIComponent(draftId)}/semantic-model-drafts`, {
    method: 'POST',
    body: { name }
  })
}

export async function getSemanticModel(id: string) {
  return apiRequest<SemanticModelRecord>(`/semantic-model/${encodeURIComponent(id)}`)
}

export async function previewIndicatorCandidates(semanticModelId: string) {
  return apiRequest<IndicatorCandidatePreview>(
    `/semantic-models/${encodeURIComponent(semanticModelId)}/indicator-candidates/preview`,
    {
      method: 'POST',
      body: {}
    }
  )
}

export async function applyIndicatorCandidates(semanticModelId: string, codes: string[]) {
  return apiRequest(`/semantic-models/${encodeURIComponent(semanticModelId)}/indicator-candidates/apply`, {
    method: 'POST',
    body: { codes }
  })
}

export async function previewPaDeployment(semanticModelId: string) {
  return apiRequest(`/semantic-models/${encodeURIComponent(semanticModelId)}/pa-deployments/preview`, {
    method: 'POST',
    body: {}
  })
}

export async function createPaDeployment(semanticModelId: string) {
  return apiRequest<PaDeploymentRecord>(`/semantic-models/${encodeURIComponent(semanticModelId)}/pa-deployments`, {
    method: 'POST',
    body: {}
  })
}

export async function getPaDeployment(deploymentId: string) {
  return apiRequest<PaDeploymentRecord>(`/pa-deployments/${encodeURIComponent(deploymentId)}`)
}

export async function createPaLoadJob(deploymentId: string) {
  return apiRequest<PaLoadJobRecord>(`/pa-deployments/${encodeURIComponent(deploymentId)}/load-jobs`, {
    method: 'POST',
    body: {}
  })
}

export async function getPaLoadJobItems(jobId: string) {
  return apiRequest(`/pa-load-jobs/${encodeURIComponent(jobId)}/items`)
}

export async function getPaLoadJobReconciliation(jobId: string) {
  return apiRequest(`/pa-load-jobs/${encodeURIComponent(jobId)}/reconciliation`)
}

export async function listPaDeploymentLoadJobs(deploymentId: string) {
  return apiRequest<PaginatedResult<PaLoadJobRecord>>(`/pa-deployments/${encodeURIComponent(deploymentId)}/load-jobs`)
}

export async function getPaDeploymentRefreshPolicy(deploymentId: string) {
  return apiRequest<PaRefreshPolicyRecord>(`/pa-deployments/${encodeURIComponent(deploymentId)}/refresh-policies`)
}

export async function listPaDeploymentRefreshRuns(deploymentId: string) {
  return apiRequest<PaginatedResult<PaRefreshRunRecord>>(`/pa-deployments/${encodeURIComponent(deploymentId)}/refresh-runs`)
}

export async function getPaDeploymentReleaseDecision(deploymentId: string) {
  return apiRequest<PaReleaseDecisionRecord>(`/pa-deployments/${encodeURIComponent(deploymentId)}/release`)
}

export async function getAskReadiness(semanticModelId: string) {
  return apiRequest(`/semantic-model/${encodeURIComponent(semanticModelId)}/ask-readiness`)
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function normalizeSourceCatalogTable(value: unknown): SourceCatalogTable | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }
  const sourcePath =
    asString(record.sourcePath) ??
    asString(record.label) ??
    asString(record.name) ??
    [asString(record.schema), asString(record.table)].filter(Boolean).join('.')
  if (!sourcePath) {
    return null
  }
  const table = asString(record.table) ?? sourcePath.split('.').at(-1)
  const tableType = asString(record.tableType)
  return {
    sourcePath,
    catalog: asString(record.catalog),
    schema: asString(record.schema),
    table,
    tableType: tableType === 'view' ? 'view' : 'table',
    rowCount: typeof record.rowCount === 'number' ? record.rowCount : undefined
  }
}

function normalizeSourceCatalogColumn(value: unknown, fallbackSourcePath?: string): SourceCatalogColumn | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }
  const name = asString(record.name)
  if (!name) {
    return null
  }
  return {
    sourcePath:
      asString(record.sourcePath) ??
      asString(record.label) ??
      asString(record.table) ??
      fallbackSourcePath ??
      name,
    catalog: asString(record.catalog),
    schema: asString(record.schema),
    table: asString(record.table),
    name,
    dataType: asString(record.dataType) ?? asString(record.type),
    nullable: typeof record.nullable === 'boolean' ? record.nullable : undefined
  }
}

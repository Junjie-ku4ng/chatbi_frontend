import { ApiRequestError, apiRequest, buildAuthHeaders, resolveApiBaseUrl } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const semanticEditorStateAccess = frontendResourceAccessRegistry.semanticEditorState
const semanticEditorGraphAccess = frontendResourceAccessRegistry.semanticEditorGraph
const semanticEditorGraphNeighborsAccess = frontendResourceAccessRegistry.semanticEditorGraphNeighbors
const semanticEditorOperationsAccess = frontendResourceAccessRegistry.semanticEditorOperations
const semanticEditorValidateAccess = frontendResourceAccessRegistry.semanticEditorValidate
const semanticEditorPreviewAccess = frontendResourceAccessRegistry.semanticEditorPreview
const semanticEditorImpactAccess = frontendResourceAccessRegistry.semanticEditorImpact
const semanticRelationTemplatesAccess = frontendResourceAccessRegistry.semanticRelationTemplates
const semanticRelationTemplateDetailAccess = frontendResourceAccessRegistry.semanticRelationTemplateDetail
const semanticRelationTemplateApplyAccess = frontendResourceAccessRegistry.semanticRelationTemplateApply
const semanticAuthoringTrack = semanticEditorStateAccess.track

function withModelPath(pathTemplate: string, modelId: string) {
  return pathTemplate.replace(':modelId', encodeURIComponent(modelId))
}

function withModelAndTemplatePath(pathTemplate: string, modelId: string, templateId: string) {
  return withModelPath(pathTemplate, modelId).replace(':templateId', encodeURIComponent(templateId))
}

export type SemanticEditorOperationInput = {
  operationType: string
  targetType: string
  targetKey: string
  payload: Record<string, unknown>
}

export type SemanticRelationEdge = {
  id: string
  sourceDimension: string
  sourceNodeId?: string
  sourceKey: string
  targetDimension: string
  targetNodeId?: string
  targetKey: string
  joinType: 'inner' | 'left' | 'right'
  cardinality: '1:1' | '1:n' | 'n:1' | 'n:n'
  active: boolean
  label?: string
  options?: Record<string, unknown>
  status?: string
}

export type SemanticEditorGraphState = {
  nodes: Array<{
    id: string
    nodeType: string
    key: string
    label: string
  }>
  edges: SemanticRelationEdge[]
  constraints?: Record<string, unknown>
}

export type SemanticGraphFetchMode = 'full' | 'window' | 'auto'

export type SemanticEditorGraphMeta = {
  modeApplied: 'full' | 'window' | 'auto' | 'neighbors'
  totalNodes: number
  totalEdges: number
  returnedNodes: number
  returnedEdges: number
  truncated: boolean
  nodeOffset?: number
  edgeOffset?: number
  nodeLimit?: number
  edgeLimit?: number
  nextNodeOffset?: number
  nextEdgeOffset?: number
  centerNodeKey?: string
  hops?: number
  thresholds?: {
    fullMaxNodes: number
    fullMaxEdges: number
    windowNodeLimit: number
    windowEdgeLimit: number
  }
}

export type SemanticEditorGraphPage = {
  draftKey?: string | null
  graph: SemanticEditorGraphState
  meta: SemanticEditorGraphMeta
}

export type SemanticEditorGraphNeighborResult = {
  draftKey?: string | null
  graph: SemanticEditorGraphState
  meta: SemanticEditorGraphMeta
}

export type SemanticEditorOperationRecord = {
  id: string
  modelId: string
  draftId?: string
  operationType: string
  targetType: string
  targetKey: string
  payload: Record<string, unknown>
  status: string
  errorMessage?: string
  createdAt?: string
  createdBy?: string
}

export type SemanticCatalogMeasure = {
  code: string
  name: string
  description?: string
  formula?: string
  unit?: string
  type?: string
  aliases: string[]
  editableFields: string[]
}

export type SemanticCatalogHierarchy = {
  dimension: string
  name: string
  caption?: string
  levels: string[]
  order: number
  editableFields: string[]
}

export type SemanticCatalogDimension = {
  name: string
  caption?: string
  description?: string
  levels: string[]
  hierarchies: Array<{
    name: string
    caption?: string
    levels: string[]
  }>
  editableFields: string[]
}

export type SemanticEditorOperationHint = {
  measure: Array<'add' | 'update' | 'remove'>
  dimension: Array<'add' | 'update' | 'remove'>
  hierarchy: Array<'add' | 'update' | 'remove'>
  relation?: Array<'add' | 'update' | 'remove'>
}

export type SemanticEditorFieldSpec = {
  field: string
  type: string
  required: boolean
  example?: string
}

export type SemanticEditorCatalog = {
  operationHints?: SemanticEditorOperationHint
  fieldSpecs?: {
    measure: SemanticEditorFieldSpec[]
    dimension: SemanticEditorFieldSpec[]
    hierarchy: SemanticEditorFieldSpec[]
    relation?: SemanticEditorFieldSpec[]
  }
  relationFieldSpecs?: SemanticEditorFieldSpec[]
  measures: SemanticCatalogMeasure[]
  dimensions: SemanticCatalogDimension[]
  hierarchies: SemanticCatalogHierarchy[]
  relations?: Array<SemanticRelationEdge & { editableFields?: string[] }>
  stats: {
    measureCount: number
    dimensionCount: number
    hierarchyCount: number
    relationCount?: number
  }
}

export type SemanticEditorImpactSummary = {
  riskLevel: 'low' | 'medium' | 'high'
  blockers: string[]
  gateBlockerDetails?: SemanticPublishGateBlockerDetail[]
  affectedQueries: number
  affectedStories: number
  affectedIndicators: number
  windowHours: number
}

export type SemanticPublishGateBlockerDetail = {
  code: string
  severity: 'error' | 'warning'
  ownerHint: string
  resolutionGuide: string
  retryable: boolean
}

export type SemanticRelationTemplate = {
  id: string
  modelId: string
  name: string
  description?: string
  status: 'active' | 'disabled'
  relations: SemanticRelationEdge[]
  metadata?: Record<string, unknown>
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

export type SemanticRelationTimelineItem = {
  id: string
  relationId: string
  operationType: string
  status: string
  actor?: string
  createdAt: string
  summary: {
    changedFields?: string[]
    code?: string
  }
  payload: Record<string, unknown>
}

export type SemanticEditorState = {
  modelId: string
  model?: {
    id: string
    name: string
    cube?: string
    schemaVersion?: number
    workflowStatus?: string
    riskLevel?: string
  }
  draft?: {
    id: string | null
    draftKey: string | null
    status: string
    schemaSnapshot: Record<string, unknown>
    metadata?: Record<string, unknown>
    updatedAt?: string
    updatedBy?: string
  }
  draftKey: string | null
  schemaSnapshot: Record<string, unknown>
  catalog: SemanticEditorCatalog
  graph?: SemanticEditorGraphState
  graphMeta?: SemanticEditorGraphMeta
  latestValidation?: SemanticEditorValidationResult | null
  operations?: SemanticEditorOperationRecord[]
  retriever?: {
    totalMembers: number
    status: string
  }
}

export type SemanticValidationIssue = {
  scope?: 'relation' | 'field' | 'schema'
  fieldPath: string
  fieldSegments?: string[]
  severity: 'error' | 'warning'
  code: string
  message: string
  suggestion?: string
  retryable?: boolean
}

export type SemanticEditorValidationResult = {
  id: string
  modelId: string
  status: 'passed' | 'failed'
  summary: Record<string, unknown>
  issues: SemanticValidationIssue[]
  catalog?: SemanticEditorCatalog
}

export type SemanticPreviewChange = {
  targetType: 'measure' | 'dimension' | 'hierarchy' | 'relation'
  targetKey: string
  action: 'added' | 'removed' | 'updated'
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changedFields?: string[]
}

export type SemanticEditorPreviewResult = {
  modelId: string
  preview: {
    schemaSnapshot: Record<string, unknown>
    diff: Record<string, unknown>
    changes: SemanticPreviewChange[]
    summary?: {
      added: number
      removed: number
      updated: number
    }
    riskLevel?: 'low' | 'medium' | 'high'
    impact?: SemanticEditorImpactSummary
  }
}

export type SemanticEditorApplyResult = {
  modelId: string
  draft: {
    id: string
    draftKey: string
    status: string
    schemaSnapshot: Record<string, unknown>
    metadata?: Record<string, unknown>
    updatedAt?: string
    updatedBy?: string
  }
  operations: SemanticEditorOperationRecord[]
  issues: Array<{
    operationType: string
    targetKey: string
    message: string
  }>
}

export async function getSemanticEditorState(
  modelId: string,
  options: {
    graphMode?: SemanticGraphFetchMode
    graphNodeLimit?: number
    graphEdgeLimit?: number
    graphNodeOffset?: number
    graphEdgeOffset?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.graphMode) {
    query.set('graphMode', options.graphMode)
  }
  if (typeof options.graphNodeLimit === 'number') {
    query.set('graphNodeLimit', String(options.graphNodeLimit))
  }
  if (typeof options.graphEdgeLimit === 'number') {
    query.set('graphEdgeLimit', String(options.graphEdgeLimit))
  }
  if (typeof options.graphNodeOffset === 'number') {
    query.set('graphNodeOffset', String(options.graphNodeOffset))
  }
  if (typeof options.graphEdgeOffset === 'number') {
    query.set('graphEdgeOffset', String(options.graphEdgeOffset))
  }
  return apiRequest<SemanticEditorState>(
    `${withModelPath(semanticEditorStateAccess.path, modelId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: semanticAuthoringTrack
    }
  )
}

export async function getSemanticEditorGraphPage(
  modelId: string,
  options: {
    draftKey?: string
    mode?: Exclude<SemanticGraphFetchMode, 'full'> | SemanticGraphFetchMode
    nodeLimit?: number
    edgeLimit?: number
    nodeOffset?: number
    edgeOffset?: number
    relationStatus?: string
    q?: string
  } = {}
) {
  const query = new URLSearchParams()
  if (options.draftKey) {
    query.set('draftKey', options.draftKey)
  }
  if (options.mode) {
    query.set('mode', options.mode)
  }
  if (typeof options.nodeLimit === 'number') {
    query.set('nodeLimit', String(options.nodeLimit))
  }
  if (typeof options.edgeLimit === 'number') {
    query.set('edgeLimit', String(options.edgeLimit))
  }
  if (typeof options.nodeOffset === 'number') {
    query.set('nodeOffset', String(options.nodeOffset))
  }
  if (typeof options.edgeOffset === 'number') {
    query.set('edgeOffset', String(options.edgeOffset))
  }
  if (options.relationStatus) {
    query.set('relationStatus', options.relationStatus)
  }
  if (options.q) {
    query.set('q', options.q)
  }
  return apiRequest<SemanticEditorGraphPage>(
    `${withModelPath(semanticEditorGraphAccess.path, modelId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: semanticAuthoringTrack
    }
  )
}

export async function getSemanticEditorGraphNeighbors(
  modelId: string,
  options: {
    draftKey?: string
    centerNodeKey: string
    hops?: number
    edgeLimit?: number
  }
) {
  const query = new URLSearchParams()
  if (options.draftKey) {
    query.set('draftKey', options.draftKey)
  }
  query.set('centerNodeKey', options.centerNodeKey)
  if (typeof options.hops === 'number') {
    query.set('hops', String(options.hops))
  }
  if (typeof options.edgeLimit === 'number') {
    query.set('edgeLimit', String(options.edgeLimit))
  }
  return apiRequest<SemanticEditorGraphNeighborResult>(
    `${withModelPath(semanticEditorGraphNeighborsAccess.path, modelId)}?${query.toString()}`,
    {
      track: semanticAuthoringTrack
    }
  )
}

export async function listSemanticEditorOperations(
  modelId: string,
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (typeof options.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  return apiRequest<{ items?: SemanticEditorOperationRecord[]; total?: number; limit?: number; offset?: number }>(
    `${withModelPath(semanticEditorOperationsAccess.path, modelId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: semanticAuthoringTrack
    }
  )
}

export async function applySemanticEditorOperations(
  modelId: string,
  payload: {
    draftKey?: string
    operations: SemanticEditorOperationInput[]
  }
) {
  return apiRequest<SemanticEditorApplyResult>(withModelPath(semanticEditorOperationsAccess.path, modelId), {
    method: 'POST',
    track: semanticAuthoringTrack,
    body: payload
  })
}

export async function validateSemanticEditorDraft(
  modelId: string,
  payload: {
    draftKey?: string
    schemaSnapshot?: Record<string, unknown>
  } = {}
) {
  return apiRequest<SemanticEditorValidationResult>(withModelPath(semanticEditorValidateAccess.path, modelId), {
    method: 'POST',
    track: semanticAuthoringTrack,
    body: payload
  })
}

export async function previewSemanticEditorDraft(
  modelId: string,
  payload: {
    draftKey?: string
    schemaSnapshot?: Record<string, unknown>
  } = {}
) {
  return apiRequest<SemanticEditorPreviewResult>(withModelPath(semanticEditorPreviewAccess.path, modelId), {
    method: 'POST',
    track: semanticAuthoringTrack,
    body: payload
  })
}

export async function getSemanticEditorImpact(
  modelId: string,
  options: {
    draftKey?: string
    windowHours?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.draftKey) {
    query.set('draftKey', options.draftKey)
  }
  if (typeof options.windowHours === 'number') {
    query.set('windowHours', String(options.windowHours))
  }
  return apiRequest<SemanticEditorImpactSummary>(
    `${withModelPath(semanticEditorImpactAccess.path, modelId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: semanticAuthoringTrack
    }
  )
}

export type SemanticPublishResult = {
  modelId?: string
  schemaVersion?: number
  status?: string
  gateBlockers?: string[]
  gateBlockerDetails?: SemanticPublishGateBlockerDetail[]
  syncRunId?: string
  syncStatus?: string
  syncPreviewSummary?: Partial<SemanticSyncPreviewSummary>
}

export async function publishSemanticEditorModel(
  modelId: string,
  schemaVersion: number,
  options: {
    syncDeleteConfirmationToken?: string
  } = {}
) {
  const headers = new Headers({
    'content-type': 'application/json',
    ...buildAuthHeaders()
  })
  const response = await fetch(`${resolveApiBaseUrl()}/semantic-model/${encodeURIComponent(modelId)}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      schemaVersion,
      syncDeleteConfirmationToken: options.syncDeleteConfirmationToken
    }),
    cache: 'no-store'
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const gateBlockers = resolveGateBlockers(payload)
    const gateBlockerDetails = resolveGateBlockerDetails(payload)
    throw new ApiRequestError({
      message: typeof payload?.message === 'string' ? payload.message : `Request failed: ${response.status}`,
      status: response.status,
      code: typeof payload?.code === 'string' ? payload.code : undefined,
      requestId: response.headers.get('x-request-id') ?? undefined,
      details: {
        payload,
        gateBlockers,
        gateBlockerDetails
      }
    })
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as SemanticPublishResult
  }
  return payload as SemanticPublishResult
}

export function resolveGateBlockers(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [] as string[]
  }
  const record = payload as Record<string, unknown>
  const candidates = [
    record.gateBlockers,
    (record.data as Record<string, unknown> | undefined)?.gateBlockers,
    (record.details as Record<string, unknown> | undefined)?.gateBlockers,
    (record.response as Record<string, unknown> | undefined)?.gateBlockers
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(item => String(item))
    }
  }
  return []
}

export function resolveGateBlockerDetails(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [] as SemanticPublishGateBlockerDetail[]
  }
  const record = payload as Record<string, unknown>
  const candidates = [
    record.gateBlockerDetails,
    (record.data as Record<string, unknown> | undefined)?.gateBlockerDetails,
    (record.details as Record<string, unknown> | undefined)?.gateBlockerDetails,
    (record.response as Record<string, unknown> | undefined)?.gateBlockerDetails
  ]
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue
    }
    return candidate
      .map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null
        }
        const value = item as Record<string, unknown>
        const code = typeof value.code === 'string' ? value.code : undefined
        const severity = value.severity === 'error' || value.severity === 'warning' ? value.severity : 'warning'
        const ownerHint = typeof value.ownerHint === 'string' ? value.ownerHint : ''
        const resolutionGuide = typeof value.resolutionGuide === 'string' ? value.resolutionGuide : ''
        const retryable = value.retryable !== false
        if (!code) return null
        return {
          code,
          severity,
          ownerHint,
          resolutionGuide,
          retryable
        } satisfies SemanticPublishGateBlockerDetail
      })
      .filter((item): item is SemanticPublishGateBlockerDetail => Boolean(item))
  }
  return []
}

export async function listSemanticRelationTemplates(
  modelId: string,
  options: {
    status?: 'active' | 'disabled'
    q?: string
    limit?: number
    offset?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.status) {
    query.set('status', options.status)
  }
  if (options.q) {
    query.set('q', options.q)
  }
  if (typeof options.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  return apiRequest<{
    items: SemanticRelationTemplate[]
    total: number
    limit: number
    offset: number
  }>(`${withModelPath(semanticRelationTemplatesAccess.path, modelId)}${query.toString() ? `?${query.toString()}` : ''}`, {
    track: semanticAuthoringTrack
  })
}

export async function createSemanticRelationTemplate(
  modelId: string,
  payload: {
    name: string
    description?: string
    status?: 'active' | 'disabled'
    relations: SemanticRelationEdge[]
    metadata?: Record<string, unknown>
  }
) {
  return apiRequest<{ template: SemanticRelationTemplate }>(withModelPath(semanticRelationTemplatesAccess.path, modelId), {
    method: 'POST',
    track: semanticAuthoringTrack,
    body: payload
  })
}

export async function updateSemanticRelationTemplate(
  modelId: string,
  templateId: string,
  payload: {
    name?: string
    description?: string
    status?: 'active' | 'disabled'
    relations?: SemanticRelationEdge[]
    metadata?: Record<string, unknown>
  }
) {
  return apiRequest<{ template: SemanticRelationTemplate }>(
    withModelAndTemplatePath(semanticRelationTemplateDetailAccess.path, modelId, templateId),
    {
      method: 'PATCH',
      track: semanticAuthoringTrack,
      body: payload
    }
  )
}

export async function applySemanticRelationTemplate(
  modelId: string,
  templateId: string,
  payload: {
    mode?: 'append' | 'replace'
    draftKey?: string
    metadata?: Record<string, unknown>
  } = {}
) {
  return apiRequest<{
    template: SemanticRelationTemplate
    draft?: {
      id: string
      draftKey: string
      status: string
      schemaSnapshot: Record<string, unknown>
    }
    draftKey?: string
    mode: 'append' | 'replace'
    applied: number
    issues: Array<{ operationType: string; targetKey: string; message: string }>
  }>(withModelAndTemplatePath(semanticRelationTemplateApplyAccess.path, modelId, templateId), {
    method: 'POST',
    track: semanticAuthoringTrack,
    body: payload
  })
}

export async function listSemanticRelationTimeline(
  modelId: string,
  options: {
    relationId?: string
    actor?: string
    limit?: number
    offset?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.relationId) {
    query.set('relationId', options.relationId)
  }
  if (options.actor) {
    query.set('actor', options.actor)
  }
  if (typeof options.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  return apiRequest<{
    items: SemanticRelationTimelineItem[]
    total: number
    limit: number
    offset: number
  }>(`/semantic-model/${encodeURIComponent(modelId)}/editor/relations/timeline${query.toString() ? `?${query.toString()}` : ''}`)
}

export type SemanticSyncMode = 'readonly_binding' | 'managed_sync'

export type SemanticSyncPreviewSummary = {
  create: number
  update: number
  delete: number
  relationMeta: number
  hierarchyWrites: number
  namedLevelWrites: number
  relationMetadataWrites: number
}

export type SemanticSyncRunMetadata = {
  mode?: SemanticSyncMode | string
  previewDigest?: string
  bridgeOwner?: string
  bridgeState?: string
  skipped?: boolean
  skipReason?: string
  [key: string]: unknown
}

export type SemanticSyncProfile = {
  id: string
  modelId: string
  mode: SemanticSyncMode
  paDataSourceId?: string
  targetCube?: string
  namespace?: string
  deletePolicy: 'hard_delete' | 'soft_delete' | 'no_delete'
  relationMaterialization: 'metadata_cube' | 'none'
  enabled: boolean
  updatedAt?: string
  updatedBy?: string
}

export type SemanticSyncPreview = {
  modelId: string
  mode: SemanticSyncMode
  dataSourceId: string
  targetCube: string
  summary: SemanticSyncPreviewSummary
  riskLevel: 'low' | 'medium' | 'high'
  blockers: string[]
  operations: Array<{
    opType: 'create' | 'update' | 'delete' | 'relation_meta_upsert'
    objectType: 'cube' | 'dimension' | 'hierarchy' | 'element' | 'relation_meta'
    objectKey: string
    payload?: Record<string, unknown>
  }>
  previewDigest: string
}

export type SemanticSyncRunItem = {
  id: string
  opType: string
  objectType: string
  objectKey: string
  status: string
  errorCode?: string
  errorMessage?: string
  payload?: Record<string, unknown>
  createdAt?: string
}

export type SemanticSyncRun = {
  id: string
  modelId: string
  schemaVersion: number
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | string
  trigger: 'publish' | 'manual' | 'retry' | string
  startedAt?: string
  finishedAt?: string
  errorCode?: string
  errorMessage?: string
  metadata?: SemanticSyncRunMetadata
  items?: SemanticSyncRunItem[]
}

export type PaCubeDiscoveryItem = {
  name: string
  dimensions: string[]
}

export type PaCubeMetadataProfile = {
  cube: string
  metricDimension: string
  dimensions: string[]
  measures: string[]
  synthesizedLevels?: Array<{
    dimension: string
    hierarchy: string
    executionLevel: string
    semanticLevelName: string
  }>
  schemaSnapshot: Record<string, unknown>
}

export async function getSemanticSyncProfile(modelId: string) {
  return apiRequest<SemanticSyncProfile>(`/semantic-model/${encodeURIComponent(modelId)}/sync/profile`)
}

export async function updateSemanticSyncProfile(
  modelId: string,
  payload: {
    mode?: SemanticSyncMode
    paDataSourceId?: string
    targetCube?: string
    namespace?: string
    deletePolicy?: 'hard_delete' | 'soft_delete' | 'no_delete'
    relationMaterialization?: 'metadata_cube' | 'none'
    enabled?: boolean
  }
) {
  return apiRequest<SemanticSyncProfile>(`/semantic-model/${encodeURIComponent(modelId)}/sync/profile`, {
    method: 'PUT',
    body: payload
  })
}

export async function previewSemanticSync(
  modelId: string,
  payload: {
    schemaVersion?: number
    schemaSnapshot?: Record<string, unknown>
    draft?: Record<string, unknown>
    options?: Record<string, unknown>
  } = {}
) {
  return apiRequest<SemanticSyncPreview>(`/semantic-model/${encodeURIComponent(modelId)}/sync/preview`, {
    method: 'POST',
    body: payload
  })
}

export async function createSemanticSyncDeleteConfirmation(
  modelId: string,
  payload: {
    schemaVersion: number
    previewDigest: string
  }
) {
  return apiRequest<{ token: string; expiresAt: string }>(`/semantic-model/${encodeURIComponent(modelId)}/sync/delete-confirmation`, {
    method: 'POST',
    body: payload
  })
}

export async function createSemanticSyncRun(
  modelId: string,
  payload: {
    trigger?: 'manual' | 'retry' | 'publish'
    schemaVersion?: number
    deleteConfirmationToken?: string
    wait?: boolean
    draft?: Record<string, unknown>
    schemaSnapshot?: Record<string, unknown>
    options?: Record<string, unknown>
    metadata?: Record<string, unknown>
  } = {}
) {
  return apiRequest<SemanticSyncRun>(`/semantic-model/${encodeURIComponent(modelId)}/sync/runs`, {
    method: 'POST',
    body: payload
  })
}

export async function listSemanticSyncRuns(
  modelId: string,
  options: {
    limit?: number
    offset?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (typeof options.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number') {
    query.set('offset', String(options.offset))
  }
  return apiRequest<{ items: SemanticSyncRun[]; total: number; limit: number; offset: number }>(
    `/semantic-model/${encodeURIComponent(modelId)}/sync/runs${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function retrySemanticSyncRun(
  modelId: string,
  runId: string,
  payload: {
    deleteConfirmationToken?: string
  } = {}
) {
  return apiRequest<SemanticSyncRun>(
    `/semantic-model/${encodeURIComponent(modelId)}/sync/runs/${encodeURIComponent(runId)}/retry`,
    {
      method: 'POST',
      body: payload
    }
  )
}

export async function listDataSourcePACubes(
  dataSourceId: string,
  options: {
    query?: string
    limit?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.query) {
    query.set('query', options.query)
  }
  if (typeof options.limit === 'number') {
    query.set('limit', String(options.limit))
  }
  return apiRequest<{ items: PaCubeDiscoveryItem[]; total: number; limit: number }>(
    `/data-sources/${encodeURIComponent(dataSourceId)}/pa/cubes${query.toString() ? `?${query.toString()}` : ''}`
  )
}

export async function getDataSourcePACubeMetadata(
  dataSourceId: string,
  cube: string,
  options: {
    metricDimension?: string
  } = {}
) {
  const query = new URLSearchParams()
  if (options.metricDimension) {
    query.set('metricDimension', options.metricDimension)
  }
  return apiRequest<PaCubeMetadataProfile>(
    `/data-sources/${encodeURIComponent(dataSourceId)}/pa/cubes/${encodeURIComponent(cube)}/metadata${
      query.toString() ? `?${query.toString()}` : ''
    }`
  )
}

export async function onboardSemanticModelFromPA(payload: {
  dataSourceId: string
  cube: string
  name?: string
  description?: string
  metricDimension?: string
}) {
  return apiRequest<{
    model: {
      id: string
      name: string
      cube: string
      dataSourceId: string
    }
    syncProfile: SemanticSyncProfile
    metadata: PaCubeMetadataProfile
  }>('/semantic-model/onboard-from-pa', {
    method: 'POST',
    body: payload
  })
}

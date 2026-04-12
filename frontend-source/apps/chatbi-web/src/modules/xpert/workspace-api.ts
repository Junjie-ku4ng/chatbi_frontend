import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const xpertWorkspacesAccess = frontendResourceAccessRegistry.xpertWorkspaces
const xpertWorkspaceArchiveAccess = frontendResourceAccessRegistry.xpertWorkspaceArchive
const xpertByWorkspaceAccess = frontendResourceAccessRegistry.xpertByWorkspace
const copilotKnowledgeByWorkspaceAccess = frontendResourceAccessRegistry.copilotKnowledgeByWorkspace
const xpertToolsetByWorkspaceAccess = frontendResourceAccessRegistry.xpertToolsetByWorkspace
const workspaceSemanticModelsAccess = frontendResourceAccessRegistry.workspaceSemanticModels
const workspaceMembersAccess = frontendResourceAccessRegistry.workspaceMembers
const xpertTaskMyAccess = frontendResourceAccessRegistry.xpertTaskMy
const xpertExecutionsAccess = frontendResourceAccessRegistry.xpertExecutions
const xpertAgentExecutionLogAccess = frontendResourceAccessRegistry.xpertAgentExecutionLog
const xpertAgentExecutionStateAccess = frontendResourceAccessRegistry.xpertAgentExecutionState

function withWorkspacePath(pathTemplate: string, workspaceId: string) {
  return pathTemplate.replace(':workspaceId', encodeURIComponent(workspaceId))
}

function withExpertPath(pathTemplate: string, expertId: string) {
  return pathTemplate.replace(':expertId', encodeURIComponent(expertId))
}

function withExecutionPath(pathTemplate: string, executionId: string) {
  return pathTemplate.replace(':executionId', encodeURIComponent(executionId))
}

export type XpertWorkspaceSummary = {
  id: string
  name?: string
  code?: string
  description?: string
  archivedAt?: string | null
}

export type WorkspaceResourceRecord = {
  id?: string
  name?: string
  title?: string
  category?: string
  runtime?: string
  [key: string]: unknown
}

export type WorkspaceMemberRecord = {
  id?: string
  name?: string
  email?: string
}

export type WorkspaceTaskRecord = {
  id: string
  name?: string
  status?: string
}

export type ExpertExecutionRecord = {
  id: string
  category?: string
  type?: string
  title?: string
  agentKey?: string
  status?: string
  error?: string
  tokens?: number
  totalTokens?: number
  elapsedTime?: number
  createdAt?: string
  updatedAt?: string
  subExecutions?: ExpertExecutionRecord[]
}

export type ExpertExecutionLogRecord = ExpertExecutionRecord & {
  messages?: unknown[]
  metadata?: Record<string, unknown>
}

type WorkspaceListPayload = {
  items?: XpertWorkspaceSummary[]
  total?: number
}

function toWorkspaceListPayload(value: unknown): WorkspaceListPayload {
  if (Array.isArray(value)) {
    return { items: value as XpertWorkspaceSummary[], total: value.length }
  }
  if (!value || typeof value !== 'object') {
    return {}
  }
  const payload = value as WorkspaceListPayload
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: typeof payload.total === 'number' ? payload.total : undefined
  }
}

export async function listMyXpertWorkspaces() {
  const payload = await apiRequest<WorkspaceListPayload | XpertWorkspaceSummary[]>(xpertWorkspacesAccess.path, {
    track: xpertWorkspacesAccess.track
  })
  const normalized = toWorkspaceListPayload(payload)
  const items = normalized.items ?? []
  return {
    items,
    total: normalized.total ?? items.length
  }
}

export async function archiveXpertWorkspace(id: string) {
  return apiRequest<XpertWorkspaceSummary>(withWorkspacePath(xpertWorkspaceArchiveAccess.path, id), {
    method: 'POST',
    body: {},
    track: xpertWorkspaceArchiveAccess.track
  })
}

type ResourceListPayload = {
  items?: WorkspaceResourceRecord[]
  total?: number
}

function asResourceListPayload(value: unknown): ResourceListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const payload = value as ResourceListPayload
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: typeof payload.total === 'number' ? payload.total : undefined
  }
}

export async function listWorkspaceXperts(workspaceId: string) {
  const payload = await apiRequest<ResourceListPayload>(withWorkspacePath(xpertByWorkspaceAccess.path, workspaceId), {
    track: xpertByWorkspaceAccess.track
  })
  const normalized = asResourceListPayload(payload)
  return {
    items: normalized.items ?? [],
    total: normalized.total ?? (normalized.items?.length ?? 0)
  }
}

export async function listWorkspaceKnowledges(workspaceId: string) {
  const payload = await apiRequest<ResourceListPayload>(
    withWorkspacePath(copilotKnowledgeByWorkspaceAccess.path, workspaceId),
    {
      track: copilotKnowledgeByWorkspaceAccess.track
    }
  )
  const normalized = asResourceListPayload(payload)
  return {
    items: normalized.items ?? [],
    total: normalized.total ?? (normalized.items?.length ?? 0)
  }
}

export async function listWorkspaceToolsets(workspaceId: string, options?: { category?: string }) {
  const query = new URLSearchParams()
  if (options?.category) {
    query.set('category', options.category)
  }
  const payload = await apiRequest<ResourceListPayload>(
    `${withWorkspacePath(xpertToolsetByWorkspaceAccess.path, workspaceId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: xpertToolsetByWorkspaceAccess.track
    }
  )
  const normalized = asResourceListPayload(payload)
  return {
    items: normalized.items ?? [],
    total: normalized.total ?? (normalized.items?.length ?? 0)
  }
}

export async function listWorkspaceSemanticModels() {
  const query = new URLSearchParams({
    runtime: 'chatbi'
  })
  const payload = await apiRequest<ResourceListPayload>(`${workspaceSemanticModelsAccess.path}?${query.toString()}`, {
    track: workspaceSemanticModelsAccess.track
  })
  const normalized = asResourceListPayload(payload)
  return {
    items: normalized.items ?? [],
    total: normalized.total ?? (normalized.items?.length ?? 0)
  }
}

export async function listWorkspaceMembers(workspaceId: string) {
  const payload = await apiRequest<WorkspaceMemberRecord[] | { items?: WorkspaceMemberRecord[] }>(
    withWorkspacePath(workspaceMembersAccess.path, workspaceId),
    {
      track: workspaceMembersAccess.track
    }
  )

  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: WorkspaceMemberRecord[] }).items)
      ? (payload as { items: WorkspaceMemberRecord[] }).items
      : []

  return {
    items,
    total: items.length
  }
}

type WorkspaceTaskListPayload = {
  items?: Array<Record<string, unknown>>
  total?: number
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeExecutionRecord(value: unknown): ExpertExecutionRecord | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }
  const id = asString(record.id)
  if (!id) {
    return null
  }

  const titleValue = asString(record.title)
  const subExecutions =
    Array.isArray(record.subExecutions) || Array.isArray(record.children)
      ? ((Array.isArray(record.subExecutions) ? record.subExecutions : record.children) as unknown[])
          .map(item => normalizeExecutionRecord(item))
          .filter((item): item is ExpertExecutionRecord => item !== null)
      : undefined

  return {
    id,
    category: asString(record.category),
    type: asString(record.type),
    title: titleValue,
    agentKey: asString(record.agentKey),
    status: asString(record.status),
    error: asString(record.error),
    tokens: asNumber(record.tokens),
    totalTokens: asNumber(record.totalTokens),
    elapsedTime: asNumber(record.elapsedTime),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
    subExecutions: subExecutions && subExecutions.length > 0 ? subExecutions : undefined
  }
}

export async function listWorkspaceRecentTasks(workspaceId: string) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        xpertId: workspaceId
      },
      take: 5,
      skip: 0,
      order: {
        updatedAt: 'DESC'
      }
    })
  })

  const payload = await apiRequest<WorkspaceTaskListPayload>(`${xpertTaskMyAccess.path}?${query.toString()}`, {
    track: xpertTaskMyAccess.track
  })
  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  const items = rawItems.map(item => {
    const options = asRecord(item.options)
    return {
      id: asString(item.id) ?? 'task-unknown',
      name: asString(item.name) ?? asString(options?.title) ?? asString(options?.prompt) ?? 'Untitled task',
      status: asString(options?.runtimeStatus) ?? asString(item.status)
    } satisfies WorkspaceTaskRecord
  })
  return {
    items,
    total: typeof payload?.total === 'number' ? payload.total : items.length
  }
}

export async function listExpertExecutions(expertId: string) {
  const query = new URLSearchParams({
    $order: JSON.stringify({
      createdAt: 'DESC'
    })
  })

  const payload = await apiRequest<unknown>(`${withExpertPath(xpertExecutionsAccess.path, expertId)}?${query.toString()}`, {
    track: xpertExecutionsAccess.track
  })

  const rawItems = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  const items = rawItems
    .map(item => normalizeExecutionRecord(item))
    .filter((item): item is ExpertExecutionRecord => item !== null)

  return {
    items,
    total: items.length
  }
}

export async function getExpertExecutionLog(executionId: string) {
  const payload = await apiRequest<unknown>(withExecutionPath(xpertAgentExecutionLogAccess.path, executionId), {
    track: xpertAgentExecutionLogAccess.track
  })

  const normalized = normalizeExecutionRecord(payload)
  if (!normalized) {
    return null
  }

  const record = asRecord(payload)
  return {
    ...normalized,
    messages: Array.isArray(record?.messages) ? record.messages : [],
    metadata: asRecord(record?.metadata)
  } satisfies ExpertExecutionLogRecord
}

export async function getExpertExecutionState(executionId: string) {
  const payload = await apiRequest<unknown>(withExecutionPath(xpertAgentExecutionStateAccess.path, executionId), {
    track: xpertAgentExecutionStateAccess.track
  })
  return asRecord(payload) ?? {}
}

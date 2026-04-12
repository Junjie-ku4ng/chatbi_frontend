import { ApiRequestError, apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const insightsAccess = frontendResourceAccessRegistry.insights
const insightDetailAccess = frontendResourceAccessRegistry.insightDetail
const insightVersionsAccess = frontendResourceAccessRegistry.insightVersions
const insightResourceTrack = insightsAccess.track

function buildInsightPath(insightId: string, suffix = '') {
  return `${insightDetailAccess.path.replace(':insightId', encodeURIComponent(insightId))}${suffix}`
}

function buildInsightVersionsPath(insightId: string, suffix = '') {
  return `${insightVersionsAccess.path.replace(':insightId', encodeURIComponent(insightId))}${suffix}`
}

export type InsightItem = {
  id: string
  modelId: string
  title: string
  summary?: string
  tags: string[]
  status: string
  answer?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt?: string
  conversationId?: string
  queryLogId?: string
  latestVersion?: number
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
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

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function isNotFoundError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404
}

function normalizeInsight(item: Record<string, unknown>, modelIdHint?: string): InsightItem {
  const options = asRecord(item.options)
  const metadata = asRecord(item.metadata) ?? asRecord(options?.metadata)

  return {
    id: asString(item.id) ?? '',
    modelId: asString(item.modelId) ?? asString(options?.modelId) ?? modelIdHint ?? 'unknown-model',
    title: asString(item.title) ?? asString(item.name) ?? 'Untitled Insight',
    summary: asString(item.summary) ?? asString(options?.summary) ?? asString(item.description),
    tags: asStringList(item.tags ?? options?.tags),
    status: asString(item.status) ?? asString(options?.status) ?? 'active',
    answer: asRecord(item.answer) ?? asRecord(options?.answer),
    metadata,
    createdAt: asString(item.createdAt),
    conversationId: asString(item.conversationId) ?? asString(metadata?.conversationId),
    queryLogId: asString(item.queryLogId) ?? asString(metadata?.queryLogId),
    latestVersion: asNumber(item.latestVersion) ?? asNumber(metadata?.latestVersion) ?? asNumber(options?.latestVersion) ?? 1
  }
}

function normalizeInsightVersion(item: Record<string, unknown>, insightId: string): InsightVersion {
  const presentation = asRecord(item.presentation)
  return {
    id: asString(item.id) ?? `${insightId}-v${asNumber(item.version) ?? 1}`,
    insightId: asString(item.insightId) ?? insightId,
    version: asNumber(item.version) ?? 1,
    snapshot: asRecord(item.snapshot) ?? {},
    createdAt: asString(item.createdAt),
    presentation: presentation
      ? {
          snapshotSummary: asRecord(presentation.snapshotSummary),
          changeSummary: asRecord(presentation.changeSummary),
          relatedRefs: asStringList(presentation.relatedRefs)
        }
      : undefined
  }
}

export async function listInsights(
  modelId: string,
  input?: {
    q?: string
    statuses?: string[]
    tags?: string[]
    limit?: number
    offset?: number
    cursor?: number
  }
) {
  const query = new URLSearchParams({
    modelId
  })

  if (input?.q) query.set('q', input.q)
  if (input?.statuses?.length) query.set('statuses', input.statuses.join(','))
  if (input?.tags?.length) query.set('tags', input.tags.join(','))
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  if (typeof input?.cursor === 'number' && input?.offset === undefined) query.set('cursor', String(input.cursor))

  const payload = await apiRequest<{
    items?: Array<Record<string, unknown>>
    total?: number
    limit?: number
    offset?: number
    nextCursor?: number | string | null
  }>(`${insightsAccess.path}?${query.toString()}`, {
    track: insightResourceTrack
  })

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeInsight(item, modelId))
  const nextCursorRaw = payload?.nextCursor
  const nextCursor =
    typeof nextCursorRaw === 'number'
      ? nextCursorRaw
      : typeof nextCursorRaw === 'string' && nextCursorRaw.trim() !== '' && Number.isFinite(Number(nextCursorRaw))
        ? Number(nextCursorRaw)
        : undefined

  return {
    items,
    total: asNumber(payload?.total) ?? items.length,
    limit: asNumber(payload?.limit) ?? input?.limit,
    offset: asNumber(payload?.offset) ?? input?.offset ?? input?.cursor ?? 0,
    nextCursor
  } satisfies Page<InsightItem> & { nextCursor?: number | null }
}

export async function getInsight(id: string, options: { fallbackToDefault?: boolean } = {}) {
  const fallbackToDefault = options.fallbackToDefault !== false
  try {
    const payload = await apiRequest<{ insight?: Record<string, unknown> }>(buildInsightPath(id), {
      track: insightResourceTrack
    })
    return normalizeInsight(asRecord(payload.insight) ?? asRecord(payload) ?? { id }, 'unknown-model')
  } catch (error) {
    if (!fallbackToDefault) {
      if (isNotFoundError(error)) {
        return null
      }
      throw error
    }
    return {
      id,
      modelId: 'unknown-model',
      title: 'Insight Detail',
      summary: undefined,
      tags: [],
      status: 'active',
      latestVersion: 1
    }
  }
}

export type InsightVersion = {
  id: string
  insightId: string
  version: number
  snapshot: Record<string, unknown>
  createdAt?: string
  presentation?: {
    snapshotSummary?: Record<string, unknown>
    changeSummary?: Record<string, unknown>
    relatedRefs?: string[]
  }
}

export async function listInsightVersions(insightId: string, input?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams({
    view: 'operational'
  })
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))

  const payload = await apiRequest<{
    items?: Array<Record<string, unknown>>
    total?: number
    limit?: number
    offset?: number
  }>(`${buildInsightVersionsPath(insightId)}?${query.toString()}`, {
    track: insightResourceTrack
  })

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeInsightVersion(item, insightId))

  return {
    items,
    total: asNumber(payload?.total) ?? items.length,
    limit: asNumber(payload?.limit) ?? input?.limit,
    offset: asNumber(payload?.offset) ?? input?.offset
  } satisfies Page<InsightVersion>
}

export async function createInsight(input: {
  modelId: string
  title: string
  summary?: string
  queryLogId?: string
  conversationId?: string
  answer?: Record<string, unknown>
  tags?: string[]
}) {
  const created = await apiRequest<{ insight?: Record<string, unknown> }>(insightsAccess.path, {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      modelId: input.modelId,
      title: input.title,
      summary: input.summary,
      queryLogId: input.queryLogId,
      conversationId: input.conversationId,
      answer: input.answer,
      tags: input.tags ?? []
    }
  })

  return normalizeInsight(asRecord(created.insight) ?? asRecord(created) ?? {}, input.modelId)
}

export type InsightComment = {
  id: string
  insightId: string
  author: string
  body: string
  status: string
  createdAt?: string
}

function normalizeComment(item: Record<string, unknown>, insightId: string): InsightComment {
  const options = asRecord(item.options)
  return {
    id: asString(item.id) ?? `${Date.now()}`,
    insightId,
    author: asString(item.author) ?? asString(asRecord(item.createdBy)?.name) ?? asString(item.createdById) ?? 'anonymous',
    body: asString(item.body) ?? asString(item.content) ?? '',
    status: asString(item.status) ?? asString(options?.status) ?? 'active',
    createdAt: asString(item.createdAt)
  }
}

export async function listInsightComments(id: string) {
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    `${buildInsightPath(id, '/comments')}?limit=200&offset=0`,
    {
      track: insightResourceTrack
    }
  )

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeComment(item, id))

  return {
    items,
    total: asNumber(payload?.total) ?? items.length
  } satisfies Page<InsightComment>
}

export async function addInsightComment(id: string, body: string) {
  const created = await apiRequest<{ comment?: Record<string, unknown> }>(buildInsightPath(id, '/comments'), {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      body
    }
  })

  return normalizeComment(asRecord(created.comment) ?? asRecord(created) ?? {}, id)
}

export type InsightSubscription = {
  id: string
  insightId: string
  consumerSystem: string
  channel: 'webhook' | 'email'
  status: 'active' | 'paused'
  targetUrl?: string
  schedule?: string
  subscriptionName?: string
}

function normalizeSubscription(item: Record<string, unknown>, insightId: string): InsightSubscription {
  return {
    id: asString(item.id) ?? `${insightId}-subscription-${Date.now()}`,
    insightId: asString(item.insightId) ?? insightId,
    consumerSystem: asString(item.consumerSystem) ?? 'xpert-subscription',
    channel: item.channel === 'email' ? 'email' : 'webhook',
    status: item.status === 'paused' ? 'paused' : 'active',
    targetUrl: asString(item.targetUrl),
    schedule: asString(item.schedule),
    subscriptionName: asString(item.subscriptionName)
  }
}

export async function listInsightSubscriptions(insightId: string) {
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    buildInsightPath(insightId, '/subscriptions'),
    { track: insightResourceTrack }
  )

  return (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeSubscription(item, insightId))
}

export async function createInsightSubscription(insightId: string, input: Partial<InsightSubscription> & { consumerSystem: string }) {
  const payload = await apiRequest<{ subscription?: Record<string, unknown> }>(
    buildInsightPath(insightId, '/subscriptions'),
    {
      method: 'POST',
      track: insightResourceTrack,
      body: {
        consumerSystem: input.consumerSystem,
        channel: input.channel,
        status: input.status,
        targetUrl: input.targetUrl,
        schedule: input.schedule,
        subscriptionName: input.subscriptionName
      }
    }
  )

  return normalizeSubscription(asRecord(payload.subscription) ?? asRecord(payload) ?? {}, insightId)
}

export async function setInsightSubscriptionStatus(insightId: string, subscriptionId: string, status: 'active' | 'paused') {
  const action = status === 'paused' ? 'pause' : 'resume'
  const payload = await apiRequest<{ subscription?: Record<string, unknown> }>(
    buildInsightPath(insightId, `/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`),
    {
      method: 'POST',
      track: insightResourceTrack,
      body: {}
    }
  )

  return normalizeSubscription(asRecord(payload.subscription) ?? asRecord(payload) ?? { id: subscriptionId, status }, insightId)
}

export async function submitInsightFeedback(
  insightId: string,
  rating: 'correct' | 'incorrect' | 'needs_clarification',
  reason?: string
) {
  return apiRequest(buildInsightPath(insightId, '/feedback'), {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      rating,
      reason
    }
  })
}

export type InsightCollection = {
  id: string
  modelId: string
  name: string
  description?: string
  owner?: string
  visibility?: string
  status?: string
}

function normalizeCollection(item: Record<string, unknown>, modelId: string): InsightCollection {
  const options = asRecord(item.options)
  return {
    id: asString(item.id) ?? '',
    modelId: asString(item.modelId) ?? modelId,
    name: asString(item.name) ?? 'Collection',
    description: asString(item.description) ?? asString(options?.description),
    owner: asString(item.owner) ?? asString(item.createdById),
    visibility: asString(item.visibility) ?? asString(options?.visibility) ?? 'private',
    status: asString(item.status) ?? asString(options?.status) ?? 'active'
  }
}

export async function listCollections(modelId: string) {
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    `/collections?${new URLSearchParams({
      modelId,
      limit: '200',
      offset: '0'
    }).toString()}`,
    {
      track: insightResourceTrack
    }
  )

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeCollection(item, modelId))
  return {
    items,
    total: items.length
  } satisfies Page<InsightCollection>
}

export async function createCollection(modelId: string, name: string, description?: string) {
  const payload = await apiRequest<{ collection?: Record<string, unknown> }>('/collections', {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      modelId,
      name,
      description
    }
  })
  return normalizeCollection(asRecord(payload.collection) ?? asRecord(payload) ?? {}, modelId)
}

export async function addCollectionItem(collectionId: string, insightId: string) {
  return apiRequest(`/collections/${encodeURIComponent(collectionId)}/items`, {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      insightId
    }
  })
}

export type FavoriteItem = {
  id: string
  modelId: string
  userId: string
  resourceType: 'insight' | 'collection'
  resourceId: string
}

function normalizeFavorite(item: Record<string, unknown>): FavoriteItem | null {
  const modelId = asString(item.modelId)
  const resourceId = asString(item.storyId) ?? asString(item.indicatorId)
  if (!modelId || !resourceId) {
    return null
  }

  return {
    id: asString(item.id) ?? `${modelId}-${resourceId}`,
    modelId,
    userId: asString(item.createdById) ?? 'xpert-user',
    resourceType: 'insight',
    resourceId
  }
}

export async function listFavorites(modelId: string) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        modelId
      },
      take: 200,
      skip: 0
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(`/favorite/my?${query.toString()}`, {
    track: insightResourceTrack
  })

  const items = (Array.isArray(payload?.items) ? payload.items : [])
    .map(item => normalizeFavorite(item))
    .filter((item): item is FavoriteItem => Boolean(item))

  return {
    items,
    total: items.length
  } satisfies Page<FavoriteItem>
}

export async function addFavorite(modelId: string, resourceType: 'insight' | 'collection', resourceId: string) {
  const payload = await apiRequest<Record<string, unknown>>('/favorite', {
    method: 'POST',
    track: insightResourceTrack,
    body: {
      type: 'STORY',
      modelId,
      storyId: resourceId,
      options: {
        resourceType
      }
    }
  })

  const normalized = normalizeFavorite(payload)
  if (!normalized) {
    return {
      id: `${modelId}-${resourceId}`,
      modelId,
      userId: 'xpert-user',
      resourceType,
      resourceId
    } satisfies FavoriteItem
  }

  return {
    ...normalized,
    resourceType
  } satisfies FavoriteItem
}

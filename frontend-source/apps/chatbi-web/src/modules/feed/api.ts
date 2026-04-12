import { ApiRequestError, apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const feedsAccess = frontendResourceAccessRegistry.feeds
const feedUnreadSummaryAccess = frontendResourceAccessRegistry.feedUnreadSummary
const feedEventReadAccess = frontendResourceAccessRegistry.feedEventRead
const feedEventsBatchReadAccess = frontendResourceAccessRegistry.feedEventsBatchRead
const feedResourceTrack = feedsAccess.track

function buildFeedEventReadPath(eventId: string) {
  return feedEventReadAccess.path.replace(':eventId', encodeURIComponent(eventId))
}

export type FeedResourceType = 'insight' | 'story' | 'trace' | 'query_log'

export type FeedEvent = {
  id: string
  modelId: string
  tenant?: string
  eventType: string
  actor?: string
  resourceType: FeedResourceType
  resourceId: string
  traceKey?: string
  payload: Record<string, unknown>
  createdAt?: string
  presentation?: {
    eventSummary?: string
    actorDisplay?: string
    resourceLabel?: string
    payloadHighlights?: Array<{ key: string; value: unknown }>
    actionHint?: string
  }
}

export type FeedBatchReadResultItem = {
  eventId: string
  status: 'read' | 'not_found' | 'forbidden' | 'invalid'
  readId?: string
  error?: string
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
  nextCursor?: number | null
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

function isNotFoundError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404
}

function toFeedEvent(item: Record<string, unknown>, modelId: string): FeedEvent {
  const options = asRecord(item.options)
  const directPayload = asRecord(item.payload)
  const payload = asRecord(options?.payload) ?? options ?? {}
  const eventType = asString(item.eventType) ?? asString(options?.eventType) ?? 'updated'
  const resourceType = (asString(item.resourceType) ?? asString(options?.resourceType) ?? 'trace') as FeedResourceType
  const resourceId = asString(item.resourceId) ?? asString(options?.resourceId) ?? asString(item.id) ?? ''
  const normalizedPayload = directPayload ?? payload
  const presentation = asRecord(item.presentation)

  return {
    id: asString(item.id) ?? `${Date.now()}`,
    modelId,
    eventType,
    actor: asString(asRecord(item.createdBy)?.name) ?? asString(item.createdById),
    resourceType,
    resourceId,
    traceKey: asString(item.traceKey) ?? asString(options?.traceKey),
    payload: normalizedPayload,
    createdAt: asString(item.createdAt),
    presentation: presentation
      ? {
          eventSummary: asString(presentation.eventSummary) ?? eventType,
          actorDisplay: asString(presentation.actorDisplay) ?? asString(asRecord(item.createdBy)?.name),
          resourceLabel: asString(presentation.resourceLabel) ?? asString(options?.resourceLabel) ?? resourceId,
          payloadHighlights: Array.isArray(presentation.payloadHighlights)
            ? (presentation.payloadHighlights as Array<{ key: string; value: unknown }>)
            : undefined,
          actionHint: asString(presentation.actionHint)
        }
      : {
          eventSummary: asString(options?.eventSummary) ?? eventType,
          actorDisplay: asString(asRecord(item.createdBy)?.name),
          resourceLabel: asString(options?.resourceLabel) ?? resourceId
        }
  }
}

export async function listFeed(
  modelId: string,
  input?: {
    eventType?: string
    resourceType?: FeedResourceType
    q?: string
    cursor?: number
    limit?: number
    offset?: number
  }
) {
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    `${feedsAccess.path}?${new URLSearchParams({
      modelId,
      ...(input?.eventType ? { eventType: input.eventType } : {}),
      ...(input?.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input?.q ? { q: input.q } : {}),
      ...(input?.limit !== undefined ? { limit: String(input.limit) } : {}),
      ...(input?.offset !== undefined ? { offset: String(input.offset) } : {}),
      ...(input?.cursor !== undefined ? { cursor: String(input.cursor) } : {}),
      view: 'operational'
    }).toString()}`,
    { track: feedResourceTrack }
  )

  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  let mapped = rawItems.map(item => toFeedEvent(item, modelId))

  if (input?.eventType) {
    mapped = mapped.filter(item => item.eventType === input.eventType)
  }
  if (input?.resourceType) {
    mapped = mapped.filter(item => item.resourceType === input.resourceType)
  }
  if (input?.q) {
    const keyword = input.q.toLowerCase()
    mapped = mapped.filter(item => {
      const haystack = `${item.eventType} ${item.resourceId} ${JSON.stringify(item.payload)}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }

  return {
    items: mapped,
    total: mapped.length,
    limit: input?.limit,
    offset: input?.offset,
    nextCursor: null
  } satisfies Page<FeedEvent>
}

export async function getFeedUnreadSummary(modelId: string) {
  try {
    return await apiRequest<{ modelId: string; readerId: string; unreadCount: number }>(
      `${feedUnreadSummaryAccess.path}?${new URLSearchParams({ modelId }).toString()}`,
      { track: feedUnreadSummaryAccess.track }
    )
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
    const feed = await listFeed(modelId, { limit: 200, offset: 0 })
    const unreadCount = feed.items.filter(item => !Boolean(asRecord(item.payload)?.hidden)).length
    return {
      modelId,
      readerId: 'xpert-user',
      unreadCount
    }
  }
}

export async function markFeedEventRead(eventId: string, input: { modelId: string; readerId?: string }) {
  await apiRequest(buildFeedEventReadPath(eventId), {
    method: 'POST',
    track: feedEventReadAccess.track,
    body: {
      modelId: input.modelId,
      readerId: input.readerId ?? 'xpert-user'
    }
  })

  return {
    ok: true,
    read: {
      id: `${eventId}-read`,
      eventId,
      modelId: input.modelId,
      readerId: input.readerId ?? 'xpert-user',
      readAt: new Date().toISOString()
    }
  }
}

export async function batchReadFeedEvents(input: {
  modelId: string
  eventIds: string[]
  readerId?: string
}) {
  try {
    return await apiRequest<{
      ok: boolean
      summary: { total: number; succeeded: number; failed: number }
      items: FeedBatchReadResultItem[]
    }>(feedEventsBatchReadAccess.path, {
      method: 'POST',
      track: feedEventsBatchReadAccess.track,
      body: {
        modelId: input.modelId,
        eventIds: input.eventIds,
        readerId: input.readerId ?? 'xpert-user'
      }
    })
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  const results = await Promise.all(
    input.eventIds.map(async eventId => {
      try {
        await markFeedEventRead(eventId, { modelId: input.modelId, readerId: input.readerId })
        return {
          eventId,
          status: 'read'
        } satisfies FeedBatchReadResultItem
      } catch (error) {
        return {
          eventId,
          status: 'invalid',
          error: error instanceof Error ? error.message : 'batch read failed'
        } satisfies FeedBatchReadResultItem
      }
    })
  )

  return {
    ok: true,
    summary: {
      total: results.length,
      succeeded: results.filter(item => item.status === 'read').length,
      failed: results.filter(item => item.status !== 'read').length
    },
    items: results
  }
}

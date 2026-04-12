import { ApiRequestError, apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'
import { appendPagingQuery } from '@/modules/shared/paging/paging'

const storiesAccess = frontendResourceAccessRegistry.stories
const storyDetailAccess = frontendResourceAccessRegistry.storyDetail
const storyTemplatesAccess = frontendResourceAccessRegistry.storyTemplates
const storyVersionsAccess = frontendResourceAccessRegistry.storyVersions
const storyDesignerStateAccess = frontendResourceAccessRegistry.storyDesignerState
const storyResourceTrack = storiesAccess.track

function buildStoryPath(storyId: string, suffix = '') {
  return `${storyDetailAccess.path.replace(':storyId', encodeURIComponent(storyId))}${suffix}`
}

function buildStoryVersionsPath(storyId: string, suffix = '') {
  return `${storyVersionsAccess.path.replace(':storyId', encodeURIComponent(storyId))}${suffix}`
}

function buildStoryDesignerStatePath(storyId: string) {
  return storyDesignerStateAccess.path.replace(':storyId', encodeURIComponent(storyId))
}

export type StoryStatus = 'draft' | 'published' | 'archived'
export type StoryItemType = 'insight' | 'query_log' | 'trace'

export type StoryItem = {
  id: string
  storyId: string
  itemType: StoryItemType
  refId: string
  sortOrder: number
  caption?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type Story = {
  id: string
  modelId: string
  tenant?: string
  title: string
  summary?: string
  status: StoryStatus
  latestVersion: number
  metadata?: Record<string, unknown>
  items: StoryItem[]
  createdAt?: string
  updatedAt?: string
}

export type StoryTemplateSummary = {
  storyId: string
  modelId: string
  title: string
  status: StoryStatus
  isTemplate: true
  promotedAt: string
  promotedBy?: string
  sourceStoryId: string
  reason?: string
}

export type StoryVersion = {
  id: string
  storyId: string
  version: number
  snapshot: Record<string, unknown>
  createdAt?: string
  createdBy?: string
  presentation?: {
    snapshotSummary?: Record<string, unknown>
    itemStats?: Record<string, unknown>
    changeSummary?: Record<string, unknown>
  }
}

export type StoryWidgetType = 'table' | 'kpi' | 'chart' | 'text'

export type StoryWidget = {
  id: string
  storyId: string
  widgetKey: string
  widgetType: StoryWidgetType
  title?: string
  payload: Record<string, unknown>
  layout: Record<string, unknown>
  sortOrder: number
  status: 'active' | 'deleted'
  createdAt?: string
  updatedAt?: string
}

export type StoryCanvas = {
  storyId: string
  version: number
  canvas: Record<string, unknown>
  metadata: Record<string, unknown>
  widgets: StoryWidget[]
  createdAt?: string
  createdBy?: string
}

export type StoryShareLink = {
  id: string
  storyId: string
  token: string
  status: 'active' | 'revoked' | 'expired'
  expiresAt?: string
  options?: Record<string, unknown>
  createdAt?: string
  revokedAt?: string
}

export type StoryWidgetValidationIssue = {
  fieldPath: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export type StoryVersionDiff = {
  fromVersion: number
  toVersion: number
  added: Array<{ field: string; value: unknown }>
  removed: Array<{ field: string; value: unknown }>
  updated: Array<{ field: string; before: unknown; after: unknown }>
  changedFields: string[]
}

export type StoryShareUsageSummary = {
  storyId: string
  linkId: string
  totalVisits: number
  uniqueVisitors: number
  lastVisitedAt?: string
  windowDays: number
  byDay: Array<{ day: string; visits: number }>
}

export type StoryDesignerState = {
  story: Story
  canvas: StoryCanvas | null
  widgets: StoryWidget[]
  versions: Page<StoryVersion>
  shareLinks: Page<StoryShareLink>
  templateMeta: Record<string, unknown>
  capabilities: Record<string, boolean>
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

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeStoryStatus(value: unknown): StoryStatus {
  const status = asString(value)?.toUpperCase()
  if (status === 'RELEASED' || status === 'APPROVED' || status === 'PUBLISHED') return 'published'
  if (status === 'ARCHIVED') return 'archived'
  return 'draft'
}

function isNotFoundApiError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404
}


function parseStoryItems(storyId: string, source: Record<string, unknown> | undefined): StoryItem[] {
  const options = asRecord(source?.options)
  const raw = Array.isArray(source?.items) ? source.items : Array.isArray(options?.items) ? options.items : []
  const items: StoryItem[] = []

  for (const item of raw) {
    const row = asRecord(item)
    if (!row) {
      continue
    }
    const itemTypeRaw = asString(row.itemType)
    const itemType: StoryItemType =
      itemTypeRaw === 'query_log' || itemTypeRaw === 'trace' || itemTypeRaw === 'insight' ? itemTypeRaw : 'insight'

    items.push({
      id: asString(row.id) ?? `${storyId}-${itemType}-${asString(row.refId) ?? Date.now()}`,
      storyId,
      itemType,
      refId: asString(row.refId) ?? '',
      sortOrder: asNumber(row.sortOrder, 0),
      caption: asString(row.caption),
      metadata: asRecord(row.metadata),
      createdAt: asString(row.createdAt),
      updatedAt: asString(row.updatedAt)
    })
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

function normalizeStory(item: Record<string, unknown>): Story {
  const id = asString(item.id) ?? ''
  const options = asRecord(item.options)
  const metadata = asRecord(item.metadata) ?? asRecord(options?.metadata)

  return {
    id,
    modelId: asString(item.modelId) ?? asString(options?.modelId) ?? 'unknown-model',
    tenant: asString(item.tenantId),
    title: asString(item.title) ?? asString(item.name) ?? 'Untitled Story',
    summary: asString(item.summary) ?? asString(item.description) ?? asString(options?.summary),
    status: normalizeStoryStatus(item.status),
    latestVersion: asNumber(item.latestVersion, asNumber(options?.latestVersion, 1)),
    metadata,
    items: parseStoryItems(id, item),
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt)
  }
}

function normalizeStoryVersion(item: Record<string, unknown>, storyId: string): StoryVersion {
  return {
    id: asString(item.id) ?? `${storyId}-v${asNumber(item.version, 1)}`,
    storyId: asString(item.storyId) ?? storyId,
    version: asNumber(item.version, 1),
    snapshot: asRecord(item.snapshot) ?? {},
    createdAt: asString(item.createdAt),
    createdBy: asString(item.createdBy),
    presentation: asRecord(item.presentation)
      ? {
          snapshotSummary: asRecord(asRecord(item.presentation)?.snapshotSummary),
          itemStats: asRecord(asRecord(item.presentation)?.itemStats),
          changeSummary: asRecord(asRecord(item.presentation)?.changeSummary)
        }
      : undefined
  }
}

function normalizeStoryCanvasRecord(item: Record<string, unknown>, storyId: string): StoryCanvas {
  return {
    storyId: asString(item.storyId) ?? storyId,
    version: asNumber(item.version, 0),
    canvas: asRecord(item.canvas) ?? {},
    metadata: asRecord(item.metadata) ?? {},
    widgets: (Array.isArray(item.widgets) ? item.widgets : []).map(widget => normalizeWidget(asRecord(widget) ?? {})),
    createdAt: asString(item.createdAt),
    createdBy: asString(item.createdBy)
  }
}

function normalizeWidget(item: Record<string, unknown>): StoryWidget {
  const options = asRecord(item.options)
  const widgetTypeRaw = asString(item.widgetType) ?? asString(options?.widgetType)
  const widgetType: StoryWidgetType =
    widgetTypeRaw === 'table' || widgetTypeRaw === 'kpi' || widgetTypeRaw === 'chart' || widgetTypeRaw === 'text'
      ? widgetTypeRaw
      : 'chart'

  return {
    id: asString(item.id) ?? `${Date.now()}`,
    storyId: asString(item.storyId) ?? '',
    widgetKey: asString(item.widgetKey) ?? asString(item.key) ?? asString(options?.widgetKey) ?? `widget_${Date.now()}`,
    widgetType,
    title: asString(item.title) ?? asString(item.name) ?? asString(options?.title),
    payload: asRecord(item.payload) ?? asRecord(options?.payload) ?? {},
    layout: asRecord(item.layout) ?? asRecord(options?.layout) ?? {},
    sortOrder: asNumber(item.sortOrder, asNumber(options?.sortOrder, 0)),
    status: asString(item.status) === 'deleted' || asString(options?.status) === 'deleted' ? 'deleted' : 'active',
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt)
  }
}

function normalizeShareLink(item: Record<string, unknown>, storyIdHint?: string): StoryShareLink {
  return {
    id: asString(item.id) ?? `${storyIdHint ?? 'story'}-${Date.now()}`,
    storyId: asString(item.storyId) ?? storyIdHint ?? '',
    token: asString(item.token) ?? asString(item.id) ?? `${Date.now()}`,
    status: (asString(item.status) as StoryShareLink['status']) ?? 'active',
    expiresAt: asString(item.expiresAt),
    options: asRecord(item.options),
    createdAt: asString(item.createdAt),
    revokedAt: asString(item.revokedAt)
  }
}

async function getRawStory(storyId: string) {
  const payload = await apiRequest<{ story?: Record<string, unknown> }>(buildStoryPath(storyId), {
    track: storyResourceTrack
  })
  return asRecord(payload.story) ?? asRecord(payload) ?? { id: storyId }
}

export async function listStories(
  modelId: string,
  input?: {
    q?: string
    status?: StoryStatus
    limit?: number
    offset?: number
    cursor?: number
  }
) {
  const query = new URLSearchParams({
    modelId,
    ...(input?.q ? { q: input.q } : {}),
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.limit !== undefined ? { limit: String(input.limit) } : {}),
    ...(input?.offset !== undefined ? { offset: String(input.offset) } : {}),
    ...(input?.cursor !== undefined ? { cursor: String(input.cursor) } : {})
  })
  appendPagingQuery(query, input)

  const payload = await apiRequest<{
    items?: Array<Record<string, unknown>>
    total?: number
    limit?: number
    offset?: number
    nextCursor?: number | null
  }>(`${storiesAccess.path}?${query.toString()}`, { track: storyResourceTrack })

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => normalizeStory(asRecord(item) ?? {}))

  return {
    items,
    total: asNumber(payload?.total, items.length),
    limit: payload?.limit ?? input?.limit,
    offset: payload?.offset ?? input?.offset,
    nextCursor: payload?.nextCursor ?? null
  } satisfies Page<Story>
}

export async function listStoryTemplates(
  modelId: string,
  input?: {
    q?: string
    status?: StoryStatus
    limit?: number
    offset?: number
  }
) {
  const query = new URLSearchParams({
    modelId,
    ...(input?.q ? { q: input.q } : {}),
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.limit !== undefined ? { limit: String(input.limit) } : {}),
    ...(input?.offset !== undefined ? { offset: String(input.offset) } : {})
  })

  const payload = await apiRequest<{
    items?: Array<Record<string, unknown>>
    total?: number
    limit?: number
    offset?: number
    nextCursor?: number | null
  }>(`${storyTemplatesAccess.path}?${query.toString()}`, { track: storyResourceTrack })

  const items = (Array.isArray(payload?.items) ? payload.items : []).map(item => {
    const row = asRecord(item) ?? {}
    return {
      storyId: asString(row.storyId) ?? asString(row.id) ?? '',
      modelId: asString(row.modelId) ?? modelId,
      title: asString(row.title) ?? asString(row.name) ?? 'Template',
      status: normalizeStoryStatus(row.status),
      isTemplate: true as const,
      promotedAt: asString(row.promotedAt) ?? asString(row.updatedAt) ?? asString(row.createdAt) ?? new Date().toISOString(),
      promotedBy: asString(row.promotedBy) ?? asString(row.updatedById),
      sourceStoryId: asString(row.sourceStoryId) ?? asString(row.storyId) ?? asString(row.id) ?? '',
      reason: asString(row.reason)
    } satisfies StoryTemplateSummary
  })

  return {
    items,
    total: asNumber(payload?.total, items.length),
    limit: payload?.limit ?? input?.limit,
    offset: payload?.offset ?? input?.offset,
    nextCursor: payload?.nextCursor ?? null
  } satisfies Page<StoryTemplateSummary>
}

export async function getStory(storyId: string, options: { fallbackToDefault?: boolean } = {}) {
  const fallbackToDefault = options.fallbackToDefault === true

  try {
    return normalizeStory(await getRawStory(storyId))
  } catch (error) {
    if (isNotFoundApiError(error)) {
      if (!fallbackToDefault) {
        return null
      }

      return {
        id: storyId,
        modelId: 'unknown-model',
        title: 'Story Detail',
        summary: undefined,
        status: 'draft',
        latestVersion: 1,
        items: []
      } satisfies Story
    }

    throw error
  }
}

export async function getStoryDesignerState(storyId: string, input?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams()
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit))
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset))
  const payload = await apiRequest<Record<string, unknown>>(
    `${buildStoryDesignerStatePath(storyId)}${query.toString() ? `?${query.toString()}` : ''}`,
    {
      track: storyResourceTrack
    }
  )

  const story = normalizeStory(asRecord(payload.story) ?? {})
  const widgets = (Array.isArray(payload.widgets) ? payload.widgets : []).map(item => normalizeWidget(asRecord(item) ?? {}))
  const canvasRaw = asRecord(payload.canvas)
  const versionsRaw = asRecord(payload.versions)
  const shareLinksRaw = asRecord(payload.shareLinks)

  return {
    story,
    canvas: canvasRaw ? normalizeStoryCanvasRecord(canvasRaw, story.id) : null,
    widgets,
    versions: {
      items: (Array.isArray(versionsRaw?.items) ? versionsRaw?.items : []).map(item =>
        normalizeStoryVersion(asRecord(item) ?? {}, story.id)
      ),
      total: asNumber(versionsRaw?.total, 0),
      limit: typeof versionsRaw?.limit === 'number' ? versionsRaw.limit : input?.limit,
      offset: typeof versionsRaw?.offset === 'number' ? versionsRaw.offset : input?.offset,
      nextCursor: typeof versionsRaw?.nextCursor === 'number' ? versionsRaw.nextCursor : null
    },
    shareLinks: {
      items: (Array.isArray(shareLinksRaw?.items) ? shareLinksRaw?.items : []).map(item =>
        normalizeShareLink(asRecord(item) ?? {}, story.id)
      ),
      total: asNumber(shareLinksRaw?.total, 0),
      limit: typeof shareLinksRaw?.limit === 'number' ? shareLinksRaw.limit : undefined,
      offset: typeof shareLinksRaw?.offset === 'number' ? shareLinksRaw.offset : undefined,
      nextCursor: typeof shareLinksRaw?.nextCursor === 'number' ? shareLinksRaw.nextCursor : null
    },
    templateMeta: asRecord(payload.templateMeta) ?? {},
    capabilities: (asRecord(payload.capabilities) ?? {}) as Record<string, boolean>
  } satisfies StoryDesignerState
}

export async function createStory(input: {
  modelId: string
  title: string
  summary?: string
  status?: StoryStatus
  metadata?: Record<string, unknown>
  traceKey?: string
}) {
  const payload = await apiRequest<{ story?: Record<string, unknown>; feedEventId?: string }>(storiesAccess.path, {
    method: 'POST',
    track: storyResourceTrack,
    body: {
      modelId: input.modelId,
      title: input.title,
      summary: input.summary,
      status: input.status,
      metadata: input.metadata,
      traceKey: input.traceKey
    }
  })

  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    feedEventId: asString(payload.feedEventId)
  }
}

export async function updateStory(storyId: string, input: {
  title?: string
  summary?: string
  status?: StoryStatus
  metadata?: Record<string, unknown>
  traceKey?: string
}) {
  const payload = await apiRequest<{ story?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId),
    {
      method: 'PATCH',
      track: storyResourceTrack,
      body: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.traceKey !== undefined ? { traceKey: input.traceKey } : {})
      }
    }
  )

  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    feedEventId: asString(payload.feedEventId)
  }
}

export async function addStoryItem(
  storyId: string,
  input: {
    itemType: StoryItemType
    refId: string
    sortOrder?: number
    caption?: string
    metadata?: Record<string, unknown>
    traceKey?: string
  }
) {
  const payload = await apiRequest<{ item?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId, '/items'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: {
        itemType: input.itemType,
        refId: input.refId,
        sortOrder: input.sortOrder,
        caption: input.caption,
        metadata: input.metadata,
        traceKey: input.traceKey
      }
    }
  )

  return {
    item: normalizeStoryItem(asRecord(payload.item) ?? {}, storyId),
    feedEventId: asString(payload.feedEventId)
  }
}

function normalizeStoryItem(item: Record<string, unknown>, storyId: string): StoryItem {
  const itemTypeRaw = asString(item.itemType)
  const itemType: StoryItemType =
    itemTypeRaw === 'query_log' || itemTypeRaw === 'trace' || itemTypeRaw === 'insight' ? itemTypeRaw : 'insight'
  return {
    id: asString(item.id) ?? `${storyId}-${itemType}-${Date.now()}`,
    storyId: asString(item.storyId) ?? storyId,
    itemType,
    refId: asString(item.refId) ?? '',
    sortOrder: asNumber(item.sortOrder, 0),
    caption: asString(item.caption),
    metadata: asRecord(item.metadata),
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt)
  }
}

export async function updateStoryItem(
  storyId: string,
  itemId: string,
  input: {
    sortOrder?: number
    caption?: string
    metadata?: Record<string, unknown>
    traceKey?: string
  }
) {
  const payload = await apiRequest<{ item?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId, `/items/${encodeURIComponent(itemId)}`),
    {
      method: 'PATCH',
      track: storyResourceTrack,
      body: {
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.traceKey !== undefined ? { traceKey: input.traceKey } : {})
      }
    }
  )

  return {
    item: normalizeStoryItem(asRecord(payload.item) ?? { id: itemId }, storyId),
    feedEventId: asString(payload.feedEventId)
  }
}

export async function publishStory(storyId: string, input?: { traceKey?: string }) {
  const payload = await apiRequest<{ story?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId, '/publish'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: input?.traceKey ? { traceKey: input.traceKey } : {}
    }
  )
  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    feedEventId: asString(payload.feedEventId)
  }
}

export async function cloneStory(
  storyId: string,
  input?: {
    title?: string
    summary?: string
    status?: StoryStatus
    includeItems?: boolean
    metadata?: Record<string, unknown>
    traceKey?: string
  }
) {
  const payload = await apiRequest<{ story?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId, '/clone'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: {
        ...(input?.title !== undefined ? { title: input.title } : {}),
        ...(input?.summary !== undefined ? { summary: input.summary } : {}),
        ...(input?.status !== undefined ? { status: input.status } : {}),
        ...(input?.includeItems !== undefined ? { includeItems: input.includeItems } : {}),
        ...(input?.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input?.traceKey !== undefined ? { traceKey: input.traceKey } : {})
      }
    }
  )

  const story = normalizeStory(asRecord(payload.story) ?? {})
  return {
    story,
    sourceStoryId: storyId,
    feedEventId: asString(payload.feedEventId)
  }
}

export async function promoteStoryTemplate(
  storyId: string,
  input?: {
    reason?: string
    sourceStoryId?: string
    traceKey?: string
  }
) {
  const payload = await apiRequest<{ story?: Record<string, unknown>; template?: Record<string, unknown>; feedEventId?: string }>(
    buildStoryPath(storyId, '/templates/promote'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: {
        ...(input?.reason !== undefined ? { reason: input.reason } : {}),
        ...(input?.sourceStoryId !== undefined ? { sourceStoryId: input.sourceStoryId } : {}),
        ...(input?.traceKey !== undefined ? { traceKey: input.traceKey } : {})
      }
    }
  )

  const template = asRecord(payload.template) ?? {}
  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    template: {
      storyId: asString(template.storyId) ?? storyId,
      modelId: asString(template.modelId) ?? 'unknown-model',
      title: asString(template.title) ?? 'Template',
      status: normalizeStoryStatus(template.status),
      isTemplate: true as const,
      promotedAt: asString(template.promotedAt) ?? new Date().toISOString(),
      promotedBy: asString(template.promotedBy),
      sourceStoryId: asString(template.sourceStoryId) ?? input?.sourceStoryId ?? storyId,
      reason: asString(template.reason)
    },
    feedEventId: asString(payload.feedEventId)
  }
}

export async function listStoryVersions(storyId: string, input?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams({
    view: 'operational',
    ...(input?.limit !== undefined ? { limit: String(input.limit) } : {}),
    ...(input?.offset !== undefined ? { offset: String(input.offset) } : {})
  })
  const payload = await apiRequest<{
    items?: Array<Record<string, unknown>>
    total?: number
    limit?: number
    offset?: number
    nextCursor?: number | null
  }>(`${buildStoryVersionsPath(storyId)}?${query.toString()}`, { track: storyResourceTrack })

  const items = (Array.isArray(payload.items) ? payload.items : []).map(item => normalizeStoryVersion(asRecord(item) ?? {}, storyId))
  return {
    items,
    total: asNumber(payload.total, items.length),
    limit: payload.limit ?? input?.limit,
    offset: payload.offset ?? input?.offset,
    nextCursor: payload.nextCursor ?? null
  } satisfies Page<StoryVersion>
}

export async function diffStoryVersion(storyId: string, version: number, toVersion: number) {
  return apiRequest<StoryVersionDiff>(
    `${buildStoryVersionsPath(storyId, `/${version}/diff`)}?${new URLSearchParams({
      toVersion: String(toVersion)
    }).toString()}`,
    { track: storyResourceTrack }
  )
}

export async function restoreStoryVersion(storyId: string, version: number, input?: { traceKey?: string }) {
  const payload = await apiRequest<{ story?: Record<string, unknown> }>(
    buildStoryVersionsPath(storyId, `/${version}/restore`),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: input?.traceKey ? { traceKey: input.traceKey } : {}
    }
  )
  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    feedEventId: undefined
  }
}

export async function getStoryCanvas(storyId: string) {
  const payload = await apiRequest<{ canvas?: Record<string, unknown> }>(buildStoryPath(storyId, '/canvas'), {
    track: storyResourceTrack
  })
  return normalizeStoryCanvasRecord(asRecord(payload.canvas) ?? {}, storyId)
}

export async function putStoryCanvas(
  storyId: string,
  input: {
    canvas: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
) {
  const payload = await apiRequest<{ canvas?: Record<string, unknown> }>(buildStoryPath(storyId, '/canvas'), {
    method: 'PUT',
    track: storyResourceTrack,
    body: {
      canvas: input.canvas,
      metadata: input.metadata
    }
  })
  return normalizeStoryCanvasRecord(asRecord(payload.canvas) ?? {}, storyId)
}

export async function addStoryWidget(
  storyId: string,
  input: {
    widgetType: StoryWidgetType
    widgetKey?: string
    title?: string
    payload?: Record<string, unknown>
    layout?: Record<string, unknown>
    sortOrder?: number
  }
) {
  const payload = await apiRequest<{ widget?: Record<string, unknown> }>(buildStoryPath(storyId, '/widgets'), {
    method: 'POST',
    track: storyResourceTrack,
    body: {
      widgetType: input.widgetType,
      widgetKey: input.widgetKey,
      title: input.title,
      payload: input.payload ?? {},
      layout: input.layout ?? {},
      sortOrder: input.sortOrder ?? 0
    }
  })
  return normalizeWidget(asRecord(payload.widget) ?? {})
}

export function buildStoryDesignerHref(storyId: string) {
  return `/project/${encodeURIComponent(storyId)}/designer`
}

export async function reorderStoryWidgetsBatch(
  storyId: string,
  input: {
    items: Array<{ widgetId: string; sortOrder: number }>
  }
) {
  return apiRequest<{
    items: Array<{ widgetId: string; sortOrder?: number; status: 'updated' | 'not_found' | 'error'; error?: string }>
    summary: { total: number; succeeded: number; failed: number }
  }>(buildStoryPath(storyId, '/widgets/reorder-batch'), {
    method: 'POST',
    track: storyResourceTrack,
    body: input
  })
}

export async function duplicateStoryWidget(
  storyId: string,
  input: {
    widgetId: string
    title?: string
    offset?: { x?: number; y?: number }
  }
) {
  const payload = await apiRequest<{ widget?: Record<string, unknown> }>(
    buildStoryPath(storyId, '/widgets/duplicate'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: {
        widgetId: input.widgetId,
        title: input.title,
        offset: input.offset
      }
    }
  )
  return normalizeWidget(asRecord(payload.widget) ?? {})
}

export async function validateStoryWidget(
  storyId: string,
  input: {
    widgetType: StoryWidgetType
    payload?: Record<string, unknown>
    layout?: Record<string, unknown>
  }
) {
  try {
    return await apiRequest<{ ok: boolean; issues: StoryWidgetValidationIssue[] }>(
      buildStoryPath(storyId, '/widgets/validate'),
      {
        method: 'POST',
        track: storyResourceTrack,
        body: input
      }
    )
  } catch (error) {
    if (!isNotFoundApiError(error)) {
      throw error
    }
  }

  const issues: StoryWidgetValidationIssue[] = []

  if (!input.payload || Object.keys(input.payload).length === 0) {
    issues.push({
      fieldPath: 'payload',
      code: 'payload_empty',
      message: 'payload cannot be empty',
      severity: 'warning'
    })
  }

  if (!input.layout || Object.keys(input.layout).length === 0) {
    issues.push({
      fieldPath: 'layout',
      code: 'layout_empty',
      message: 'layout is empty, default grid placement will be used',
      severity: 'warning'
    })
  }

  return {
    ok: issues.length === 0,
    issues
  }
}

export async function patchStoryWidget(
  storyId: string,
  widgetId: string,
  input: {
    title?: string
    payload?: Record<string, unknown>
    layout?: Record<string, unknown>
    sortOrder?: number
    status?: 'active' | 'deleted'
  }
) {
  const payload = await apiRequest<{ widget?: Record<string, unknown> }>(
    buildStoryPath(storyId, `/widgets/${encodeURIComponent(widgetId)}`),
    {
      method: 'PATCH',
      track: storyResourceTrack,
      body: input
    }
  )
  return normalizeWidget(asRecord(payload.widget) ?? {})
}

export async function deleteStoryWidget(storyId: string, widgetId: string) {
  await apiRequest(buildStoryPath(storyId, `/widgets/${encodeURIComponent(widgetId)}`), {
    method: 'DELETE',
    track: storyResourceTrack
  })
  return true
}

async function readShareLinks(storyId: string) {
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    buildStoryPath(storyId, '/share-links'),
    {
      track: storyResourceTrack
    }
  )
  return (Array.isArray(payload.items) ? payload.items : []).map(item => normalizeShareLink(asRecord(item) ?? {}, storyId))
}

export async function createStoryShareLink(
  storyId: string,
  input?: {
    expiresAt?: string
    options?: Record<string, unknown>
  }
) {
  const payload = await apiRequest<{ shareLink?: Record<string, unknown> }>(
    buildStoryPath(storyId, '/share-links'),
    {
      method: 'POST',
      track: storyResourceTrack,
      body: {
        expiresAt: input?.expiresAt,
        options: input?.options
      }
    }
  )
  return normalizeShareLink(asRecord(payload.shareLink) ?? {}, storyId)
}

export async function listStoryShareLinks(storyId: string) {
  try {
    const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
      buildStoryPath(storyId, '/share-links'),
      {
        track: storyResourceTrack
      }
    )
    return (Array.isArray(payload.items) ? payload.items : []).map(item => normalizeShareLink(asRecord(item) ?? {}, storyId))
  } catch {
    // fallback for environments where share-link routes are unavailable for synthetic story ids
  }

  return readShareLinks(storyId)
}

export async function patchStoryShareLink(
  storyId: string,
  linkId: string,
  input: {
    status?: 'active' | 'revoked'
    expiresAt?: string | null
    options?: Record<string, unknown>
    traceKey?: string
  }
) {
  const payload = await apiRequest<{ shareLink?: Record<string, unknown> }>(
    buildStoryPath(storyId, `/share-links/${encodeURIComponent(linkId)}`),
    {
      method: 'PATCH',
      track: storyResourceTrack,
      body: input
    }
  )
  return normalizeShareLink(asRecord(payload.shareLink) ?? {}, storyId)
}

export async function getStoryShareUsage(storyId: string, linkId: string, input?: { windowDays?: number }) {
  try {
    const query = new URLSearchParams()
    if (typeof input?.windowDays === 'number') query.set('windowDays', String(input.windowDays))
    return await apiRequest<StoryShareUsageSummary>(
      `${buildStoryPath(storyId, `/share-links/${encodeURIComponent(linkId)}/usage`)}${
        query.toString() ? `?${query.toString()}` : ''
      }`,
      {
        track: storyResourceTrack
      }
    )
  } catch (error) {
    if (!isNotFoundApiError(error)) {
      throw error
    }
  }

  return {
    storyId,
    linkId,
    totalVisits: 0,
    uniqueVisitors: 0,
    lastVisitedAt: undefined,
    windowDays: input?.windowDays ?? 30,
    byDay: []
  } satisfies StoryShareUsageSummary
}

export async function revokeStoryShareLink(storyId: string, linkId: string) {
  const payload = await apiRequest<{ shareLink?: Record<string, unknown> }>(
    buildStoryPath(storyId, `/share-links/${encodeURIComponent(linkId)}`),
    {
      method: 'DELETE',
      track: storyResourceTrack
    }
  )
  return normalizeShareLink(asRecord(payload.shareLink) ?? {}, storyId)
}

export async function applyStoryTemplate(
  storyId: string,
  input: {
    templateStoryId: string
    mode?: 'append' | 'replace'
    traceKey?: string
  }
) {
  const payload = await apiRequest<{
    story?: Record<string, unknown>
    mode?: 'append' | 'replace'
    summary?: Record<string, unknown>
    feedEventId?: string
  }>(buildStoryPath(storyId, '/template/apply'), {
    method: 'POST',
    track: storyResourceTrack,
    body: {
      templateStoryId: input.templateStoryId,
      mode: input.mode,
      traceKey: input.traceKey
    }
  })
  return {
    story: normalizeStory(asRecord(payload.story) ?? {}),
    mode: payload.mode ?? input.mode ?? 'append',
    summary: asRecord(payload.summary) ?? { appended: 0, replaced: 0, skipped: 0 },
    feedEventId: asString(payload.feedEventId)
  }
}

export async function getPublicStory(token: string) {
  try {
    const payload = await apiRequest<Record<string, unknown>>(`/public/stories/${encodeURIComponent(token)}`, {
      track: storyResourceTrack
    })
    const story = normalizeStory(asRecord(payload.story) ?? {})
    const canvasRaw = asRecord(payload.canvas)
    const canvas = normalizeStoryCanvasRecord(canvasRaw ?? {}, story.id)

    return {
      story,
      canvas,
      shareLink: normalizeShareLink(asRecord(payload.shareLink) ?? { token }, story.id)
    }
  } catch (error) {
    if (!isNotFoundApiError(error)) {
      throw error
    }
  }

  const storyIdFallback = token.split('-')[0] ?? token
  const story = await getStory(storyIdFallback)
  if (!story) {
    return {
      story: null,
      canvas: null,
      shareLink: {
        id: `${storyIdFallback}-public-${token}`,
        storyId: storyIdFallback,
        token,
        status: 'active'
      } satisfies StoryShareLink
    }
  }
  const canvas = await getStoryCanvas(story.id)

  return {
    story,
    canvas,
    shareLink: {
      id: `${story.id}-public-${token}`,
      storyId: story.id,
      token,
      status: 'active',
      createdAt: story.createdAt
    } satisfies StoryShareLink
  }
}

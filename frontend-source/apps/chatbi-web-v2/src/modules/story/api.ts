'use client'

import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/platform/frontend-platform-contract'

type StoryStatus = 'draft' | 'published' | 'archived'
type StoryWidgetType = 'table' | 'kpi' | 'chart' | 'text'

type Story = {
  id: string
  modelId: string
  title: string
  summary?: string
  status: StoryStatus
  latestVersion: number
  metadata?: Record<string, unknown>
  items: Array<Record<string, unknown>>
}

type StoryWidget = {
  id: string
  storyId: string
  widgetKey: string
  widgetType: StoryWidgetType
  title?: string
  payload: Record<string, unknown>
  layout: Record<string, unknown>
  sortOrder: number
  status: 'active' | 'deleted'
}

const storiesAccess = frontendResourceAccessRegistry.stories
const storyDetailAccess = frontendResourceAccessRegistry.storyDetail
const storyTrack = storiesAccess.track

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
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeStoryStatus(value: unknown): StoryStatus {
  const status = asString(value)?.toUpperCase()
  if (status === 'RELEASED' || status === 'APPROVED' || status === 'PUBLISHED') {
    return 'published'
  }
  if (status === 'ARCHIVED') {
    return 'archived'
  }
  return 'draft'
}

function normalizeStory(input: Record<string, unknown>): Story {
  return {
    id: asString(input.id) ?? '',
    modelId: asString(input.modelId) ?? '',
    title: asString(input.title) ?? 'Untitled story',
    summary: asString(input.summary),
    status: normalizeStoryStatus(input.status),
    latestVersion: asNumber(input.latestVersion, 1),
    metadata: asRecord(input.metadata),
    items: Array.isArray(input.items) ? input.items.filter((item): item is Record<string, unknown> => Boolean(asRecord(item))) : []
  }
}

function normalizeWidget(input: Record<string, unknown>): StoryWidget {
  return {
    id: asString(input.id) ?? '',
    storyId: asString(input.storyId) ?? '',
    widgetKey: asString(input.widgetKey) ?? '',
    widgetType: (asString(input.widgetType) as StoryWidgetType | undefined) ?? 'chart',
    title: asString(input.title),
    payload: asRecord(input.payload) ?? {},
    layout: asRecord(input.layout) ?? {},
    sortOrder: asNumber(input.sortOrder, 0),
    status: asString(input.status) === 'deleted' ? 'deleted' : 'active'
  }
}

function buildStoryPath(storyId: string, suffix = '') {
  return `${storyDetailAccess.path.replace(':storyId', encodeURIComponent(storyId))}${suffix}`
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
    track: storyTrack,
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
    track: storyTrack,
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

type SearchParamReader = {
  get(name: string): string | null
}

export const frontendHandoffKeys = ['modelId', 'conversationId', 'queryLogId', 'traceKey', 'analysisDraft'] as const

export type FrontendHandoffKey = (typeof frontendHandoffKeys)[number]

export type AskHandoff = Partial<Record<FrontendHandoffKey, string | undefined>>

export const frontendContractAnchors = {
  askSidebarPanel: 'ask.sidebar.panel',
  askMainHeader: 'ask.header.main',
  askThreadStage: 'ask.thread.stage',
  askComposerDock: 'ask.composer.dock',
  askDiagnosticsDrawer: 'ask.diagnostics.drawer'
} as const

export const frontendPlatformRouteRegistry = {
  askWorkspace: {
    href: '/chat',
    owner: 'conversation-runtime',
    track: 'chat'
  }
} as const

export const frontendResourceAccessRegistry = {
  askConversations: {
    id: 'ask-conversations',
    path: '/xpert/:xpertId/conversations',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  askTurns: {
    id: 'ask-turns',
    path: '/chat-message/my',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  askMessageFeedback: {
    id: 'ask-message-feedback',
    path: '/chat-message-feedback',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  analysisConversations: {
    id: 'analysis-conversations',
    path: '/analysis-conversations/:conversationId',
    owner: 'ops-resource',
    track: 'xpert'
  },
  traceDetail: {
    id: 'trace-detail',
    path: '/ops/traces/:traceKey',
    owner: 'ops-resource',
    track: 'xpert'
  },
  stories: {
    id: 'stories',
    path: '/stories',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  storyDetail: {
    id: 'story-detail',
    path: '/stories/:storyId',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  xpertToolsetByWorkspace: {
    id: 'xpert-toolset-by-workspace',
    path: '/api/xpert-toolset/by-workspace/:workspaceId',
    owner: 'pa-operational-resource',
    track: 'pa'
  }
} as const

export type FrontendResourceAccessId = (typeof frontendResourceAccessRegistry)[keyof typeof frontendResourceAccessRegistry]['id']

function normalizeText(value: string | undefined | null) {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildAskHref(input?: AskHandoff) {
  const query = new URLSearchParams()

  for (const key of frontendHandoffKeys) {
    const value = normalizeText(input?.[key])
    if (value) {
      query.set(key, value)
    }
  }

  const href = frontendPlatformRouteRegistry.askWorkspace.href
  return query.size > 0 ? `${href}?${query.toString()}` : href
}

export type StoryItemPrefill = {
  refId: string
  itemType: 'insight' | 'query_log' | 'trace'
}

export function resolveStoryItemPrefill(searchParams: SearchParamReader): StoryItemPrefill {
  const insightId = normalizeText(searchParams.get('insightId'))
  if (insightId) {
    return { refId: insightId, itemType: 'insight' }
  }

  const traceKey = normalizeText(searchParams.get('traceKey'))
  if (traceKey) {
    return { refId: traceKey, itemType: 'trace' }
  }

  const queryLogId = normalizeText(searchParams.get('queryLogId'))
  if (queryLogId) {
    return { refId: queryLogId, itemType: 'query_log' }
  }

  return { refId: '', itemType: 'insight' }
}

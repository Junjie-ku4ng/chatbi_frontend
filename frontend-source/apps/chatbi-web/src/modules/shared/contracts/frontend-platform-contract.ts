type SearchParamReader = {
  get(name: string): string | null
}

export const frontendPlatformTracks = ['chat', 'xpert-resource', 'pa-platform'] as const

export type FrontendPlatformTrack = (typeof frontendPlatformTracks)[number]

export const frontendApiTracks = ['xpert', 'pa'] as const

export type FrontendApiTrack = (typeof frontendApiTracks)[number]

export const frontendResourceOwners = [
  'conversation-runtime',
  'xpert-resource',
  'governance-resource',
  'semantic-authoring-resource',
  'ops-resource',
  'story-feed-insight-resource',
  'pa-operational-resource'
] as const

export type FrontendResourceOwner = (typeof frontendResourceOwners)[number]

export const frontendResourceAccessMatrix = [
  {
    id: 'ask-conversations',
    path: '/:xpertId/conversations',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  {
    id: 'ask-turns',
    path: '/chat-message/my',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  {
    id: 'ask-message-feedback',
    path: '/chat-message-feedback',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  {
    id: 'ask-suggested-questions',
    path: '/chat-message/:messageId/suggested-questions',
    owner: 'conversation-runtime',
    track: 'xpert'
  },
  {
    id: 'ops-traces',
    path: '/ops/traces',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'trace-detail',
    path: '/ops/traces/:traceKey',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'analysis-conversations',
    path: '/analysis-conversations/:conversationId',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'analysis-executions',
    path: '/analysis-executions',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'stories',
    path: '/stories',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'story-detail',
    path: '/stories/:storyId',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'story-templates',
    path: '/stories/templates',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'story-versions',
    path: '/stories/:storyId/versions',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'story-designer-state',
    path: '/stories/:storyId/designer/state',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'insights',
    path: '/insights',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'insight-detail',
    path: '/insights/:insightId',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'insight-versions',
    path: '/insights/:insightId/versions',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'toolset-registry',
    path: '/api/xpert-toolset',
    owner: 'pa-operational-resource',
    track: 'pa'
  },
  {
    id: 'feeds',
    path: '/feeds',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'feeds-unread-summary',
    path: '/feeds/unread-summary',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'feed-event-read',
    path: '/feeds/events/:eventId/read',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'feed-events-batch-read',
    path: '/feeds/events/batch-read',
    owner: 'story-feed-insight-resource',
    track: 'xpert'
  },
  {
    id: 'ops-alert-events',
    path: '/ops/alerts/events',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'ops-alert-events-batch-ack',
    path: '/ops/alerts/events/batch-ack',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'ops-alert-dispatch-logs',
    path: '/ops/alerts/events/:eventId/dispatch-logs',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'ask-review-lane-summary',
    path: '/ask-review/cases/:lane/summary',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'ask-certification-lane',
    path: '/ask-certifications/lanes/:lane',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'indicator-webhooks-dlq',
    path: '/indicator-webhooks/dlq',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'indicator-webhooks-dlq-replay-batch',
    path: '/indicator-webhooks/dlq/replay-batch',
    owner: 'ops-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-state',
    path: '/semantic-model/:modelId/editor/state',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-graph',
    path: '/semantic-model/:modelId/editor/graph',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-graph-neighbors',
    path: '/semantic-model/:modelId/editor/graph/neighbors',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-operations',
    path: '/semantic-model/:modelId/editor/operations',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-validate',
    path: '/semantic-model/:modelId/editor/validate',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-preview',
    path: '/semantic-model/:modelId/editor/preview',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-editor-impact',
    path: '/semantic-model/:modelId/editor/impact',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-relation-templates',
    path: '/semantic-model/:modelId/editor/relation-templates',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-relation-template-detail',
    path: '/semantic-model/:modelId/editor/relation-templates/:templateId',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'semantic-relation-template-apply',
    path: '/semantic-model/:modelId/editor/relation-templates/:templateId/apply',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-workspaces',
    path: '/xpert-workspace/my',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-workspace-archive',
    path: '/xpert-workspace/:workspaceId/archive',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-by-workspace',
    path: '/xpert/by-workspace/:workspaceId',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'copilot-knowledge-by-workspace',
    path: '/copilot-knowledge/by-workspace/:workspaceId',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-toolset-by-workspace',
    path: '/api/xpert-toolset/by-workspace/:workspaceId',
    owner: 'pa-operational-resource',
    track: 'pa'
  },
  {
    id: 'workspace-semantic-models',
    path: '/semantic-model',
    owner: 'semantic-authoring-resource',
    track: 'xpert'
  },
  {
    id: 'workspace-members',
    path: '/xpert-workspace/:workspaceId/members',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-task-my',
    path: '/xpert-task/my',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-executions',
    path: '/xpert/:expertId/executions',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-agent-execution-log',
    path: '/xpert-agent-execution/:executionId/log',
    owner: 'xpert-resource',
    track: 'xpert'
  },
  {
    id: 'xpert-agent-execution-state',
    path: '/xpert-agent-execution/:executionId/state',
    owner: 'xpert-resource',
    track: 'xpert'
  }
] as const satisfies ReadonlyArray<{
  id: string
  path: string
  owner: FrontendResourceOwner
  track: FrontendApiTrack
}>

export const frontendResourceAccessRegistry = {
  askConversations: frontendResourceAccessMatrix[0],
  askTurns: frontendResourceAccessMatrix[1],
  askMessageFeedback: frontendResourceAccessMatrix[2],
  askSuggestedQuestions: frontendResourceAccessMatrix[3],
  opsTraces: frontendResourceAccessMatrix[4],
  traceDetail: frontendResourceAccessMatrix[5],
  analysisConversations: frontendResourceAccessMatrix[6],
  analysisExecutions: frontendResourceAccessMatrix[7],
  stories: frontendResourceAccessMatrix[8],
  storyDetail: frontendResourceAccessMatrix[9],
  storyTemplates: frontendResourceAccessMatrix[10],
  storyVersions: frontendResourceAccessMatrix[11],
  storyDesignerState: frontendResourceAccessMatrix[12],
  insights: frontendResourceAccessMatrix[13],
  insightDetail: frontendResourceAccessMatrix[14],
  insightVersions: frontendResourceAccessMatrix[15],
  toolsetRegistry: frontendResourceAccessMatrix[16],
  feeds: frontendResourceAccessMatrix[17],
  feedUnreadSummary: frontendResourceAccessMatrix[18],
  feedEventRead: frontendResourceAccessMatrix[19],
  feedEventsBatchRead: frontendResourceAccessMatrix[20],
  opsAlertEvents: frontendResourceAccessMatrix[21],
  opsAlertEventsBatchAck: frontendResourceAccessMatrix[22],
  opsAlertDispatchLogs: frontendResourceAccessMatrix[23],
  askReviewLaneSummary: frontendResourceAccessMatrix[24],
  askCertificationLane: frontendResourceAccessMatrix[25],
  indicatorWebhookDlq: frontendResourceAccessMatrix[26],
  indicatorWebhookDlqReplayBatch: frontendResourceAccessMatrix[27],
  semanticEditorState: frontendResourceAccessMatrix[28],
  semanticEditorGraph: frontendResourceAccessMatrix[29],
  semanticEditorGraphNeighbors: frontendResourceAccessMatrix[30],
  semanticEditorOperations: frontendResourceAccessMatrix[31],
  semanticEditorValidate: frontendResourceAccessMatrix[32],
  semanticEditorPreview: frontendResourceAccessMatrix[33],
  semanticEditorImpact: frontendResourceAccessMatrix[34],
  semanticRelationTemplates: frontendResourceAccessMatrix[35],
  semanticRelationTemplateDetail: frontendResourceAccessMatrix[36],
  semanticRelationTemplateApply: frontendResourceAccessMatrix[37],
  xpertWorkspaces: frontendResourceAccessMatrix[38],
  xpertWorkspaceArchive: frontendResourceAccessMatrix[39],
  xpertByWorkspace: frontendResourceAccessMatrix[40],
  copilotKnowledgeByWorkspace: frontendResourceAccessMatrix[41],
  xpertToolsetByWorkspace: frontendResourceAccessMatrix[42],
  workspaceSemanticModels: frontendResourceAccessMatrix[43],
  workspaceMembers: frontendResourceAccessMatrix[44],
  xpertTaskMy: frontendResourceAccessMatrix[45],
  xpertExecutions: frontendResourceAccessMatrix[46],
  xpertAgentExecutionLog: frontendResourceAccessMatrix[47],
  xpertAgentExecutionState: frontendResourceAccessMatrix[48]
} as const

export const frontendHandoffKeys = ['modelId', 'conversationId', 'queryLogId', 'traceKey', 'analysisDraft'] as const

export type FrontendHandoffKey = (typeof frontendHandoffKeys)[number]

export const frontendPlatformRouteMatrix = [
  {
    id: 'ask-workspace',
    href: '/chat',
    owner: 'conversation-runtime',
    track: 'chat'
  },
  {
    id: 'trace-detail',
    href: '/ops/traces/[traceKey]',
    owner: 'ops-resource',
    track: 'xpert-resource'
  },
  {
    id: 'story-detail',
    href: '/stories/[id]',
    owner: 'story-feed-insight-resource',
    track: 'xpert-resource'
  },
  {
    id: 'insight-detail',
    href: '/insights/[id]',
    owner: 'story-feed-insight-resource',
    track: 'xpert-resource'
  }
] as const satisfies ReadonlyArray<{
  id: string
  href: string
  owner: FrontendResourceOwner
  track: FrontendPlatformTrack
}>

export const frontendPlatformRouteRegistry = {
  askWorkspace: {
    href: '/chat',
    owner: 'conversation-runtime',
    track: 'chat'
  },
  traceDetail: {
    href: '/ops/traces/[traceKey]',
    owner: 'ops-resource',
    track: 'xpert-resource'
  },
  storyDetail: {
    href: '/stories/[id]',
    owner: 'story-feed-insight-resource',
    track: 'xpert-resource'
  },
  insightDetail: {
    href: '/insights/[id]',
    owner: 'story-feed-insight-resource',
    track: 'xpert-resource'
  }
} as const satisfies Record<
  string,
  {
    href: string
    owner: FrontendResourceOwner
    track: FrontendPlatformTrack
  }
>

export const frontendPlatformHandoffRegistry = [
  { key: 'modelId', scope: 'ask-navigation' },
  { key: 'conversationId', scope: 'ask-navigation' },
  { key: 'queryLogId', scope: 'ask-analysis' },
  { key: 'traceKey', scope: 'ops-trace' },
  { key: 'analysisDraft', scope: 'ask-analysis' }
] as const satisfies ReadonlyArray<{
  key: FrontendHandoffKey
  scope: 'ask-navigation' | 'ask-analysis' | 'ops-trace'
}>

export const frontendContractAnchors = {
  askSidebarPanel: 'ask.sidebar.panel',
  askMainHeader: 'ask.header.main',
  askThreadStage: 'ask.thread.stage',
  askComposerDock: 'ask.composer.dock',
  askDiagnosticsDrawer: 'ask.diagnostics.drawer'
} as const

export type AskHandoff = Partial<Record<FrontendHandoffKey, string | undefined>>

export type StoryItemPrefill = {
  refId: string
  itemType: 'insight' | 'query_log' | 'trace'
}

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

export function resolveStoryItemPrefill(searchParams: SearchParamReader): StoryItemPrefill {
  const insightId = normalizeText(searchParams.get('insightId'))
  if (insightId) {
    return {
      refId: insightId,
      itemType: 'insight'
    }
  }

  const traceKey = normalizeText(searchParams.get('traceKey'))
  if (traceKey) {
    return {
      refId: traceKey,
      itemType: 'trace'
    }
  }

  const queryLogId = normalizeText(searchParams.get('queryLogId'))
  if (queryLogId) {
    return {
      refId: queryLogId,
      itemType: 'query_log'
    }
  }

  return {
    refId: '',
    itemType: 'insight'
  }
}

import { describe, expect, it } from 'vitest'
import {
  buildAskHref,
  frontendApiTracks,
  frontendContractAnchors,
  frontendPlatformHandoffRegistry,
  frontendPlatformRouteRegistry,
  frontendPlatformRouteMatrix,
  frontendResourceAccessMatrix,
  frontendResourceAccessRegistry,
  frontendPlatformTracks,
  frontendResourceOwners,
  resolveStoryItemPrefill
} from '@/modules/shared/contracts/frontend-platform-contract'

describe('frontend platform contract', () => {
  it('freezes platform tracks and resource owners', () => {
    expect(frontendPlatformTracks).toEqual(['chat', 'xpert-resource', 'pa-platform'])
    expect(frontendApiTracks).toEqual(['xpert', 'pa'])
    expect(frontendResourceOwners).toEqual([
      'conversation-runtime',
      'xpert-resource',
      'governance-resource',
      'semantic-authoring-resource',
      'ops-resource',
      'story-feed-insight-resource',
      'pa-operational-resource'
    ])
  })

  it('publishes a resource access matrix for canonical frontend API surfaces', () => {
    expect(frontendResourceAccessMatrix).toEqual(
      expect.arrayContaining([
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
        id: 'ops-alert-events',
        path: '/ops/alerts/events',
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
        id: 'xpert-toolset-by-workspace',
        path: '/api/xpert-toolset/by-workspace/:workspaceId',
        owner: 'pa-operational-resource',
        track: 'pa'
      }
      ])
    )

    expect(frontendResourceAccessRegistry.askConversations).toMatchObject({
      path: '/:xpertId/conversations',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.traceDetail).toMatchObject({
      path: '/ops/traces/:traceKey',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.storyDesignerState).toMatchObject({
      path: '/stories/:storyId/designer/state',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.insightVersions).toMatchObject({
      path: '/insights/:insightId/versions',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.feeds).toMatchObject({
      path: '/feeds',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.opsAlertEvents).toMatchObject({
      path: '/ops/alerts/events',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.semanticEditorState).toMatchObject({
      path: '/semantic-model/:modelId/editor/state',
      track: 'xpert'
    })
    expect(frontendResourceAccessRegistry.xpertToolsetByWorkspace).toMatchObject({
      path: '/api/xpert-toolset/by-workspace/:workspaceId',
      track: 'pa'
    })
    expect(frontendResourceAccessRegistry.toolsetRegistry).toMatchObject({
      path: '/api/xpert-toolset',
      track: 'pa'
    })
  })

  it('declares canonical route owners for ask, trace, story, and insight surfaces', () => {
    expect(frontendPlatformRouteRegistry.askWorkspace).toMatchObject({
      href: '/chat',
      owner: 'conversation-runtime',
      track: 'chat'
    })
    expect(frontendPlatformRouteRegistry.traceDetail).toMatchObject({
      href: '/ops/traces/[traceKey]',
      owner: 'ops-resource',
      track: 'xpert-resource'
    })
    expect(frontendPlatformRouteRegistry.storyDetail).toMatchObject({
      href: '/stories/[id]',
      owner: 'story-feed-insight-resource',
      track: 'xpert-resource'
    })
    expect(frontendPlatformRouteRegistry.insightDetail).toMatchObject({
      href: '/insights/[id]',
      owner: 'story-feed-insight-resource',
      track: 'xpert-resource'
    })
  })

  it('publishes a route-owner matrix for platform surfaces', () => {
    expect(frontendPlatformRouteMatrix).toEqual([
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
    ])
  })

  it('publishes a handoff registry for cross-surface navigation semantics', () => {
    expect(frontendPlatformHandoffRegistry).toEqual([
      { key: 'modelId', scope: 'ask-navigation' },
      { key: 'conversationId', scope: 'ask-navigation' },
      { key: 'queryLogId', scope: 'ask-analysis' },
      { key: 'traceKey', scope: 'ops-trace' },
      { key: 'analysisDraft', scope: 'ask-analysis' }
    ])
  })

  it('freezes ask shell contract anchors independently from test ids', () => {
    expect(frontendContractAnchors.askSidebarPanel).toBe('ask.sidebar.panel')
    expect(frontendContractAnchors.askMainHeader).toBe('ask.header.main')
    expect(frontendContractAnchors.askThreadStage).toBe('ask.thread.stage')
    expect(frontendContractAnchors.askComposerDock).toBe('ask.composer.dock')
    expect(frontendContractAnchors.askDiagnosticsDrawer).toBe('ask.diagnostics.drawer')
  })

  it('builds canonical ask hrefs with stable query ordering', () => {
    expect(
      buildAskHref({
        modelId: 'model-1',
        conversationId: 'conv-1',
        queryLogId: 'log-1',
        traceKey: 'trace-1',
        analysisDraft: 'draft-1'
      })
    ).toBe('/chat?modelId=model-1&conversationId=conv-1&queryLogId=log-1&traceKey=trace-1&analysisDraft=draft-1')
  })

  it('omits empty ask handoff values', () => {
    expect(
      buildAskHref({
        modelId: '  ',
        conversationId: 'conv-1',
        queryLogId: '',
        traceKey: undefined
      })
    ).toBe('/chat?conversationId=conv-1')
    expect(buildAskHref()).toBe('/chat')
  })

  it('resolves story prefill from canonical handoff keys with explicit precedence', () => {
    expect(resolveStoryItemPrefill(new URLSearchParams('insightId=ins-1&traceKey=trace-1&queryLogId=log-1'))).toEqual({
      refId: 'ins-1',
      itemType: 'insight'
    })
    expect(resolveStoryItemPrefill(new URLSearchParams('traceKey=trace-1&queryLogId=log-1'))).toEqual({
      refId: 'trace-1',
      itemType: 'trace'
    })
    expect(resolveStoryItemPrefill(new URLSearchParams('queryLogId=log-1'))).toEqual({
      refId: 'log-1',
      itemType: 'query_log'
    })
    expect(resolveStoryItemPrefill(new URLSearchParams(''))).toEqual({
      refId: '',
      itemType: 'insight'
    })
  })
})

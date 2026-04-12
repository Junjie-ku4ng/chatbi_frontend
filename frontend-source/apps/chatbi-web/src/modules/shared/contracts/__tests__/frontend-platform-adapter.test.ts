import { describe, expect, it } from 'vitest'
import {
  buildPlatformResourceRequest,
  frontendPlatformAdapter,
  getPlatformResourceAccess,
  getPlatformRouteSurface,
  resolveAskShellContract
} from '@/modules/shared/contracts/frontend-platform-adapter'

describe('frontend platform adapter', () => {
  it('publishes ask workspace navigation and shell contract through a single adapter surface', () => {
    expect(frontendPlatformAdapter.ask.buildHref({ conversationId: 'conv-1', traceKey: 'trace-1' })).toBe(
      '/chat?conversationId=conv-1&traceKey=trace-1'
    )
    expect(resolveAskShellContract()).toEqual({
      anchors: {
        askSidebarPanel: 'ask.sidebar.panel',
        askMainHeader: 'ask.header.main',
        askThreadStage: 'ask.thread.stage',
        askComposerDock: 'ask.composer.dock',
        askDiagnosticsDrawer: 'ask.diagnostics.drawer'
      },
      route: {
        href: '/chat',
        owner: 'conversation-runtime',
        track: 'chat'
      },
      handoffKeys: ['modelId', 'conversationId', 'queryLogId', 'traceKey', 'analysisDraft']
    })
  })

  it('resolves platform routes and resources by stable ids', () => {
    expect(getPlatformRouteSurface('trace-detail')).toMatchObject({
      href: '/ops/traces/[traceKey]',
      owner: 'ops-resource',
      track: 'xpert-resource'
    })

    expect(getPlatformResourceAccess('xpert-toolset-by-workspace')).toMatchObject({
      path: '/api/xpert-toolset/by-workspace/:workspaceId',
      owner: 'pa-operational-resource',
      track: 'pa'
    })
  })

  it('builds resource requests from path templates and params', () => {
    expect(
      buildPlatformResourceRequest('trace-detail', {
        traceKey: 'trace-123'
      })
    ).toEqual({
      id: 'trace-detail',
      owner: 'ops-resource',
      track: 'xpert',
      path: '/ops/traces/trace-123'
    })

    expect(
      frontendPlatformAdapter.resources.build('xpert-toolset-by-workspace', {
        workspaceId: 'ws-alpha'
      })
    ).toEqual({
      id: 'xpert-toolset-by-workspace',
      owner: 'pa-operational-resource',
      track: 'pa',
      path: '/api/xpert-toolset/by-workspace/ws-alpha'
    })
  })

  it('projects ask runtime events through the adapter', () => {
    const groups = frontendPlatformAdapter.ask.groupRuntimeEvents([
      {
        id: 1,
        receivedAt: '2026-04-09T00:00:00.000Z',
        event: {
          event: 'progress',
          data: {
            phase: 'execute',
            category: 'tool',
            message: 'querying'
          }
        }
      }
    ])

    expect(groups).toEqual([
      {
        key: 'tool',
        label: 'Tool',
        items: [
          expect.objectContaining({
            id: 1
          })
        ]
      }
    ])

    expect(
      frontendPlatformAdapter.ask.formatRuntimeEventLabel({
        event: 'done',
        data: {}
      })
    ).toBe('会话完成')
  })
})

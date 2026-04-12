import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { vi } from 'vitest'
import { DEFAULT_DEV_ASK_HARNESS_XPERT_ID } from '@/modules/chat/runtime/ask-harness'
import { AskWorkspaceV2 } from '../ask-workspace-v2'

const { askWorkspaceClientMock } = vi.hoisted(() => ({
  askWorkspaceClientMock: vi.fn()
}))

const { analyticalCardRuntimeBootstrapMock } = vi.hoisted(() => ({
  analyticalCardRuntimeBootstrapMock: vi.fn()
}))

vi.mock('../ask-workspace-client-v2', () => ({
  AskWorkspaceClientV2: (props: {
    activeXpertId?: string
    modelId?: string
    initialConversationId?: string
    mockChatScenario?: string
    mockChatLatencyMs?: number
    handoff: {
      queryLogId?: string
      traceKey?: string
      analysisDraft?: string
    }
    shellAnchors: {
      askThreadStage: string
        askDiagnosticsDrawer: string
        askComposerDock: string
      }
    }) => {
    askWorkspaceClientMock(props)
    return React.createElement(
      'div',
      { 'data-testid': 'ask-workspace-client-v2', 'data-xpert-id': props.activeXpertId ?? '' },
      'workspace client'
    )
  }
}))

vi.mock('@/modules/chat/components/answer-components/analytical-card-runtime-bootstrap', () => ({
  AnalyticalCardRuntimeBootstrap: (props: { activeXpertId?: string; modelId?: string }) => {
    analyticalCardRuntimeBootstrapMock(props)
    return React.createElement('div', {
      'data-testid': 'analytical-card-runtime-bootstrap',
      'data-xpert-id': props.activeXpertId ?? '',
      'data-model-id': props.modelId ?? ''
    })
  }
}))

describe('AskWorkspaceV2', () => {
  it('mounts the runtime shell inside the v2 chat workspace with platform anchors', () => {
    const markup = renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{
          xpertId: 'workspace-alpha',
          conversationId: 'conv-123',
          queryLogId: 'query-demo-01',
          traceKey: 'trace-demo-01'
        }}
      />,
    )

    expect(markup).toContain('data-testid="ask-workspace-client-v2"')
    expect(markup).toContain('data-xpert-id="workspace-alpha"')
    expect(markup).toContain('data-testid="analytical-card-runtime-bootstrap"')
    expect(askWorkspaceClientMock).toHaveBeenCalledWith({
      activeXpertId: 'workspace-alpha',
      modelId: undefined,
      initialConversationId: 'conv-123',
      mockChatScenario: undefined,
      mockChatLatencyMs: undefined,
      handoff: {
        queryLogId: 'query-demo-01',
        traceKey: 'trace-demo-01',
        analysisDraft: undefined
      },
      shellAnchors: {
        askThreadStage: 'ask.thread.stage',
        askDiagnosticsDrawer: 'ask.diagnostics.drawer',
        askComposerDock: 'ask.composer.dock'
      }
    })
    expect(analyticalCardRuntimeBootstrapMock).toHaveBeenCalledWith({
      activeXpertId: 'workspace-alpha',
      modelId: undefined
    })
  })

  it('falls back to the repo-owned ask harness xpert when the route has no explicit xpertId', () => {
    const markup = renderToStaticMarkup(<AskWorkspaceV2 searchParams={{}} />)

    expect(markup).toContain(`data-xpert-id="${DEFAULT_DEV_ASK_HARNESS_XPERT_ID}"`)
    expect(askWorkspaceClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeXpertId: DEFAULT_DEV_ASK_HARNESS_XPERT_ID
      })
    )
    expect(analyticalCardRuntimeBootstrapMock).toHaveBeenCalledWith({
      activeXpertId: DEFAULT_DEV_ASK_HARNESS_XPERT_ID,
      modelId: undefined
    })
  })

  it('passes deterministic mock chat harness params through when the route enables them', () => {
    renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{
          xpertId: 'workspace-alpha',
          mockChatScenario: 'chart',
          mockChatLatencyMs: '180'
        }}
      />,
    )

    expect(askWorkspaceClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeXpertId: 'workspace-alpha',
        mockChatScenario: 'chart',
        mockChatLatencyMs: 180
      })
    )
  })
})

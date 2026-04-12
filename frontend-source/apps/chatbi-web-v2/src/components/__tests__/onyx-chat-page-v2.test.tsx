import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { OnyxChatPageV2 } from '../onyx/onyx-chat-page-v2'

const { askRuntimeShellMock } = vi.hoisted(() => ({
  askRuntimeShellMock: vi.fn()
}))

vi.mock('../ask-runtime-shell-v2', () => ({
  AskRuntimeShellV2: (props: {
    activeXpertId?: string
    initialConversationId?: string
    renderRail?: boolean
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
    askRuntimeShellMock(props)
    return React.createElement('div', { 'data-testid': 'onyx-chat-runtime-shell' }, '继续追问')
  }
}))

describe('OnyxChatPageV2', () => {
  it('renders a donor-style chat page and hides the legacy runtime framing', () => {
    const markup = renderToStaticMarkup(
      <OnyxChatPageV2
        activeXpertId="workspace-alpha"
        initialConversationId="conv-123"
        handoff={{ queryLogId: 'query-1' }}
        shellAnchors={{
          askThreadStage: 'ask.thread.stage',
          askDiagnosticsDrawer: 'ask.diagnostics.drawer',
          askComposerDock: 'ask.composer.dock'
        }}
      />,
    )

    expect(markup).toContain('对话')
    expect(markup).toContain('data-testid="onyx-chat-runtime-shell"')
    expect(markup).not.toContain('Live Ask Runtime')
    expect(markup).not.toContain('Streaming Diagnostics')
    expect(askRuntimeShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeXpertId: 'workspace-alpha',
        initialConversationId: 'conv-123',
        renderRail: false
      })
    )
  })
})

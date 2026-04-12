import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AskWorkspaceV2 } from '../ask-workspace-v2'

describe('Onyx shell parity', () => {
  it('renders an Onyx-native chat shell instead of the custom dashboard shell', () => {
    const markup = renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{
          xpertId: 'workspace-alpha'
        }}
      />,
    )

    expect(markup).toContain('新建会话')
    expect(markup).toContain('对话')
    expect(markup).toContain('智能体')
    expect(markup).toContain('销售助手')
    expect(markup).toContain('深度研究')
    expect(markup).toContain('全部来源')
    expect(markup).toContain('会话')
    expect(markup).toContain('用户')
    expect(markup).not.toContain('Onyx donor shell bound to the platform adapter.')
    expect(markup).not.toContain('Pinned Workflows')
    expect(markup).not.toContain('Streaming Diagnostics')
    expect(markup).not.toContain('Live Ask Runtime')
  })

  it('shows a loading placeholder while direct-open conversation history hydrates', () => {
    const markup = renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{
          xpertId: 'workspace-alpha',
          conversationId: 'conv-123'
        }}
      />,
    )

    expect(markup).toContain('正在加载会话历史...')
    expect(markup).toContain('全部来源')
    expect(markup).not.toContain('深度研究')
  })

  it('uses donor-style session placeholders instead of the old workspace placeholder', () => {
    const markup = renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{}}
      />,
    )

    expect(markup).toContain('最近三次对话摘要')
    expect(markup).toContain('镜元智算最新动态')
    expect(markup).toContain('data-testid="onyx-source-rail-card"')
    expect(markup).not.toContain('No workspace selected')
    expect(markup).not.toContain('Bind an xpertId to load saved conversations.')
    expect(markup).not.toContain('Try sending a message! Your chat history will appear here.')
  })
})

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

    expect(markup).toContain('New Session')
    expect(markup).toContain('Chat')
    expect(markup).toContain('Agents')
    expect(markup).toContain('Sales Assistant')
    expect(markup).toContain('Deep Research')
    expect(markup).toContain('All Sources')
    expect(markup).toContain('Sessions')
    expect(markup).toContain('Alice')
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

    expect(markup).toContain('Loading conversation history…')
    expect(markup).toContain('All Sources')
    expect(markup).not.toContain('Deep Research')
  })

  it('uses donor-style session placeholders instead of the old workspace placeholder', () => {
    const markup = renderToStaticMarkup(
      <AskWorkspaceV2
        searchParams={{}}
      />,
    )

    expect(markup).toContain('Summarize Most Recent 3...')
    expect(markup).toContain('Onyx AI Latest News')
    expect(markup).toContain('data-testid="onyx-source-rail-card"')
    expect(markup).not.toContain('No workspace selected')
    expect(markup).not.toContain('Bind an xpertId to load saved conversations.')
    expect(markup).not.toContain('Try sending a message! Your chat history will appear here.')
  })
})

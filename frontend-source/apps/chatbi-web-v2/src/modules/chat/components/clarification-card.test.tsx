import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClarificationCard } from './clarification-card'

describe('clarification card', () => {
  it('renders donor clarification semantic blocks', () => {
    const markup = renderToStaticMarkup(
      <ClarificationCard
        clarification={{
          required: true,
          message: 'Choose a region',
          missingSlots: ['region'],
          resolvedContext: {
            intent: 'Trend analysis'
          },
          candidateHints: {
            region: ['APAC', 'EMEA']
          }
        }}
      />
    )

    expect(markup).toContain('data-testid="ask-clarification-card"')
    expect(markup).toContain('chat-assistant-clarification-card')
    expect(markup).toContain('onyx-donor-clarification-card')
    expect(markup).toContain('onyx-donor-clarification-card-shell')
    expect(markup).toContain('data-testid="onyx-native-donor-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-clarification-card"')
    expect(markup).toContain('onyx-native-donor-card')
    expect(markup).toContain('onyx-native-donor-card-primary')
    expect(markup).toContain('data-testid="clarification-header-block"')
    expect(markup).toContain('data-testid="clarification-body-block"')
    expect(markup).toContain('class="chat-assistant-clarification-title onyx-donor-clarification-title"')
    expect(markup).toContain('class="chat-assistant-clarification-message onyx-donor-clarification-message"')
    expect(markup).toContain(
      'class="chat-assistant-clarification-context onyx-donor-clarification-context-block"'
    )
    expect(markup).toContain('data-testid="clarification-context-block"')
    expect(markup).toContain('data-testid="clarification-missing-block"')
    expect(markup).toContain('data-testid="clarification-hint-block"')
    expect(
      markup
    ).toContain(
      'class="chat-assistant-clarification-context-title onyx-donor-clarification-context-title"'
    )
    expect(markup).toContain(
      'class="chat-assistant-clarification-slots onyx-donor-clarification-slot-row"'
    )
    expect(markup).toContain(
      'class="chat-assistant-clarification-hints onyx-donor-clarification-hint-row"'
    )
    expect(
      markup
    ).toContain(
      'class="nx-badge chat-assistant-clarification-slot onyx-donor-clarification-slot-chip onyx-donor-clarification-slot-chip-resolved"'
    )
    expect(markup).toContain(
      'class="nx-badge nx-badge-warn chat-assistant-clarification-slot onyx-donor-clarification-slot-chip onyx-donor-clarification-slot-chip-missing"'
    )
    expect(
      markup
    ).toContain(
      'class="chat-assistant-clarification-hint onyx-donor-clarification-hint-chip onyx-donor-clarification-hint-chip-action"'
    )
  })
})

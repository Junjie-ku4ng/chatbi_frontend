import { describe, expect, it } from 'vitest'
import {
  buildDeterministicMockXpertChatEnvelopes,
  createDeterministicMockXpertChatResponse
} from '../xpert-chat-mock-stream'

describe('xpert deterministic mock chat stream', () => {
  it('builds a stable chart scenario envelope sequence that matches the current xpert stream contract', () => {
    const envelopes = buildDeterministicMockXpertChatEnvelopes({
      scenario: 'chart',
      question: 'Show a monthly revenue chart for the current workspace.'
    })

    expect(envelopes[0]).toMatchObject({
      type: 'event',
      event: 'on_conversation_start'
    })
    expect(envelopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'event',
          event: 'on_message_start'
        }),
        expect.objectContaining({
          type: 'message'
        }),
        expect.objectContaining({
          type: 'event',
          event: 'on_message_end'
        }),
        expect.objectContaining({
          type: 'event',
          event: 'on_conversation_end'
        })
      ])
    )

    const messageEnd = envelopes.find(
      envelope => envelope.type === 'event' && envelope.event === 'on_message_end'
    )
    expect(messageEnd).toMatchObject({
      data: {
        answer: {
          components: [
            expect.objectContaining({
              type: 'chart'
            })
          ]
        }
      }
    })
  })

  it('serializes deterministic envelopes into a text/event-stream response', async () => {
    const response = createDeterministicMockXpertChatResponse({
      scenario: 'clarification',
      question: 'Break down revenue by region.',
      latencyMs: 0
    })

    expect(response.headers.get('content-type')).toContain('text/event-stream')

    const payload = await response.text()
    expect(payload).toContain('"type":"event"')
    expect(payload).toContain('"event":"on_message_end"')
    expect(payload).toContain('"clarification"')
  })
})

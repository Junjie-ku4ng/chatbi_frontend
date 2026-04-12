import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMessageFeedback,
  getConversation,
  getMessageFeedback,
  listConversations,
  listSuggestedQuestions
} from '@/modules/chat/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('chat api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty page without requesting conversations when xpert is absent', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    const result = await listConversations(undefined, 25, 10)

    expect(result).toEqual({ items: [], total: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests canonical xpert conversation search endpoint when xpert is present', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0 }
      })
    )

    await listConversations('xpert-42', 25, 10)

    const [url] = fetchMock.mock.calls[0] ?? []
    const [, requestInit] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/xpert-42/conversations?')
    expect(String(url)).toContain('updatedAt')
    expect((requestInit as RequestInit).method ?? 'GET').toBe('GET')
  })

  it('returns null for conversation detail without xpert context', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          id: 'conv-1'
        }
      })
    )

    const result = await getConversation('conv-1')

    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests canonical xpert conversation detail endpoint with xpert-scoped search', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'conv-1'
            }
          ]
        }
      })
    )

    await getConversation('conv-1', 'xpert-42')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/xpert-42/conversations?')
    expect(String(url)).toContain('conv-1')
  })

  it('filters conversation results by xpert id when targeting a specific expert', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'conv-1',
              xpertId: 'xpert-42',
              messages: [],
              updatedAt: '2026-04-08T09:00:00.000Z'
            },
            {
              id: 'conv-2',
              xpertId: 'xpert-9',
              messages: [],
              updatedAt: '2026-04-08T10:00:00.000Z'
            }
          ],
          total: 2
        }
      })
    )

    const result = await listConversations('xpert-42', 25, 0)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.conversationId).toBe('conv-1')
  })

  it('requests suggested questions from xpert endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(['问题一', '问题二'])
    )

    await listSuggestedQuestions('msg-9')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/chat-message/msg-9/suggested-questions')
  })

  it('creates message feedback against xpert endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          id: 'feedback-1',
          conversationId: 'conv-9',
          messageId: 'msg-8',
          rating: 'LIKE'
        }
      })
    )

    await createMessageFeedback({
      conversationId: 'conv-9',
      messageId: 'msg-8',
      rating: 'LIKE'
    })

    const [url, requestInit] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/chat-message-feedback')
    expect((requestInit as RequestInit).method).toBe('POST')
    expect(String((requestInit as RequestInit).body)).toContain('\"rating\":\"LIKE\"')
  })

  it('queries message feedback by conversation and message', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'feedback-1',
              conversationId: 'conv-9',
              messageId: 'msg-8',
              rating: 'DISLIKE'
            }
          ]
        }
      })
    )

    await getMessageFeedback('conv-9', 'msg-8')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/chat-message-feedback/my?')
    expect(String(url)).toContain('conversationId')
    expect(String(url)).toContain('messageId')
  })
})

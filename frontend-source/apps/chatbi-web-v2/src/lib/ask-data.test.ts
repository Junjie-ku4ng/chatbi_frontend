import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn()
}))

vi.mock('@/lib/api-client', () => ({
  apiRequest: apiRequestMock
}))

vi.mock('@/modules/platform/frontend-platform-contract', () => ({
  frontendResourceAccessRegistry: {
    askConversations: {
      id: 'ask-conversations',
      path: '/xpert/:xpertId/conversations',
      owner: 'conversation-runtime',
      track: 'xpert'
    },
    askTurns: {
      id: 'ask-turns',
      path: '/chat-message/my',
      owner: 'conversation-runtime',
      track: 'xpert'
    },
    askMessageFeedback: {
      id: 'ask-message-feedback',
      path: '/chat-message-feedback',
      owner: 'conversation-runtime',
      track: 'xpert'
    }
  }
}))

import { listConversationThreadMessages, listConversations } from './ask-data'

describe('listConversations', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
    apiRequestMock.mockResolvedValue({ items: [], total: 0 })
  })

  it('requests xpert conversations through the proxied xpert namespace', async () => {
    await listConversations('workspace-alpha', 30, 0)

    expect(apiRequestMock).toHaveBeenCalledWith(
      expect.stringContaining('/xpert/workspace-alpha/conversations?'),
      { track: 'xpert' }
    )
  })

  it('projects persisted assistant messages into assistant-ui thread history parts for direct-open replay', async () => {
    apiRequestMock.mockResolvedValueOnce({
      items: [
        {
          id: 'msg-user-1',
          role: 'human',
          content: '今年按月看Sold Units趋势',
          createdAt: '2026-04-09T14:59:30.000Z'
        },
        {
          id: 'msg-assistant-1',
          role: 'ai',
          createdAt: '2026-04-09T14:59:55.000Z',
          content: [
            {
              type: 'component',
              data: {
                data: {
                  type: 'chart',
                  payload: {
                    option: {
                      xAxis: { type: 'category', data: ['2025-01'] },
                      yAxis: { type: 'value' },
                      series: [{ type: 'line', data: [1] }]
                    }
                  }
                },
                clarification: {
                  required: true,
                  message: '当前事实源最新完整年度是 2025 年。',
                  missingSlots: ['time'],
                  candidateHints: {
                    time: ['2025年']
                  }
                }
              }
            },
            {
              type: 'text',
              text: '当前事实源最新完整年度是 2025 年。'
            }
          ]
        }
      ],
      total: 2
    })

    const result = await listConversationThreadMessages('conv-direct-open')

    expect(apiRequestMock).toHaveBeenCalledWith(
      expect.stringContaining('/chat-message/my?'),
      { track: 'xpert' }
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'msg-user-1',
      role: 'user',
      content: '今年按月看Sold Units趋势'
    })
    expect(result[1]).toMatchObject({
      id: 'msg-assistant-1',
      role: 'assistant',
      status: { type: 'complete', reason: 'stop' }
    })

    const assistantContent = Array.isArray(result[1]?.content) ? result[1].content : []
    expect(assistantContent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: '当前事实源最新完整年度是 2025 年。' }),
        expect.objectContaining({ type: 'data', name: 'chatbi_component' }),
        expect.objectContaining({ type: 'data', name: 'chatbi_clarification' }),
        expect.objectContaining({
          type: 'data',
          name: 'chatbi_message_meta',
          data: { messageId: 'msg-assistant-1' }
        })
      ])
    )
  })
})

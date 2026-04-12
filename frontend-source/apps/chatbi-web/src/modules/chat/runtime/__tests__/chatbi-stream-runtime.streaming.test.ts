import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runSseTransportMock } = vi.hoisted(() => ({
  runSseTransportMock: vi.fn()
}))

vi.mock('../stream-transport', () => ({
  runSseTransport: runSseTransportMock,
  StreamTransportError: class StreamTransportError extends Error {
    status?: number
    retryable = false
  }
}))

describe('createChatbiStreamAdapter streaming output', () => {
  beforeEach(() => {
    runSseTransportMock.mockReset()
  })

  it('yields streamed assistant text chunks before the final done payload arrives', async () => {
    runSseTransportMock.mockImplementation(async (options: { onEvent?: (event: unknown) => void }) => {
      options.onEvent?.({
        type: 'message',
        data: {
          text: '第一段'
        }
      })
      options.onEvent?.({
        type: 'message',
        data: {
          text: '第二段'
        }
      })
      options.onEvent?.({
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-stream-1'
        }
      })
    })

    const { createChatbiStreamAdapter } = await import('../chatbi-stream-runtime')
    const adapter = createChatbiStreamAdapter({
      xpertId: 'xpert-42'
    })

    const result = adapter.run({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '对比 2024 和 2025 每个月 Revenue'
            }
          ]
        } as never
      ],
      runConfig: {},
      abortSignal: new AbortController().signal,
      context: {} as never,
      config: {} as never,
      unstable_getMessage: () => ({}) as never
    })

    const streamedTextSnapshots: string[] = []
    for await (const update of result as AsyncGenerator<{ content?: Array<{ type: string; text?: string }> }, void>) {
      const snapshot = (update.content ?? [])
        .filter(part => part.type === 'text')
        .map(part => part.text ?? '')
        .join('')
      streamedTextSnapshots.push(snapshot)
    }

    expect(streamedTextSnapshots).toEqual(['第一段', '第一段第二段', '第一段第二段'])
  })

  it('keeps accumulated streamed text in the final payload when completion metadata arrives', async () => {
    runSseTransportMock.mockImplementation(async (options: { onEvent?: (event: unknown) => void }) => {
      options.onEvent?.({
        type: 'event',
        event: 'on_message_start',
        data: {
          id: 'msg-stream-1'
        }
      })
      options.onEvent?.({
        type: 'message',
        data: {
          text: '第一段'
        }
      })
      options.onEvent?.({
        type: 'message',
        data: {
          text: '第二段'
        }
      })
      options.onEvent?.({
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-stream-1'
        }
      })
    })

    const { createChatbiStreamAdapter } = await import('../chatbi-stream-runtime')
    const adapter = createChatbiStreamAdapter({
      xpertId: 'xpert-42'
    })

    const result = adapter.run({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '2022全年各区域 Profit Rate 排名'
            }
          ]
        } as never
      ],
      runConfig: {},
      abortSignal: new AbortController().signal,
      context: {} as never,
      config: {} as never,
      unstable_getMessage: () => ({}) as never
    })

    const updates: Array<{ content?: Array<{ type: string; text?: string; name?: string }> }> = []
    for await (const update of result as AsyncGenerator<{ content?: Array<{ type: string; text?: string; name?: string }> }, void>) {
      updates.push(update)
    }

    const finalUpdate = updates[updates.length - 1]
    const finalText = (finalUpdate.content ?? [])
      .filter(part => part.type === 'text')
      .map(part => part.text ?? '')
      .join('')
    const finalMessageMeta = (finalUpdate.content ?? []).some(
      part => part.type === 'data' && part.name === 'chatbi_message_meta'
    )

    expect(finalText).toBe('第一段第二段')
    expect(finalMessageMeta).toBe(true)
  })

  it('emits message metadata as soon as the server message starts so runtime steps can bind before completion', async () => {
    runSseTransportMock.mockImplementation(async (options: { onEvent?: (event: unknown) => void }) => {
      options.onEvent?.({
        type: 'event',
        event: 'on_message_start',
        data: {
          id: 'msg-stream-early'
        }
      })
      options.onEvent?.({
        type: 'message',
        data: {
          text: '正在分析'
        }
      })
      options.onEvent?.({
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-stream-1'
        }
      })
    })

    const { createChatbiStreamAdapter } = await import('../chatbi-stream-runtime')
    const adapter = createChatbiStreamAdapter({
      xpertId: 'xpert-42'
    })

    const result = adapter.run({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '2022全年各区域 Profit Rate 排名'
            }
          ]
        } as never
      ],
      runConfig: {},
      abortSignal: new AbortController().signal,
      context: {} as never,
      config: {} as never,
      unstable_getMessage: () => ({}) as never
    })

    const updates: Array<{ content?: Array<{ type: string; name?: string; data?: { messageId?: string } }> }> = []
    for await (const update of result as AsyncGenerator<{ content?: Array<{ type: string; name?: string; data?: { messageId?: string } }> }, void>) {
      updates.push(update)
    }

    const firstUpdateWithMeta = updates.find(update =>
      (update.content ?? []).some(
        part => part.type === 'data' && part.name === 'chatbi_message_meta' && part.data?.messageId === 'msg-stream-early'
      )
    )

    expect(firstUpdateWithMeta).toBeDefined()
    expect(updates.indexOf(firstUpdateWithMeta as (typeof updates)[number])).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { appendThreadTextPart, upsertThreadMessageMetaPart } from '../chatbi-stream-runtime'

describe('upsertThreadMessageMetaPart', () => {
  it('updates the existing message meta data part in place without duplicating it', () => {
    const parts = [
      {
        type: 'text' as const,
        text: '正在分析'
      },
      {
        type: 'data' as const,
        name: 'chatbi_message_meta',
        data: {
          messageId: 'msg-old'
        }
      }
    ]

    upsertThreadMessageMetaPart(parts, 'msg-new')

    expect(parts).toHaveLength(2)
    expect(parts[1]).toMatchObject({
      type: 'data',
      name: 'chatbi_message_meta',
      data: {
        messageId: 'msg-new'
      }
    })
  })

  it('adds a message meta data part when one does not yet exist', () => {
    const parts = [
      {
        type: 'text' as const,
        text: '正在分析'
      }
    ]

    upsertThreadMessageMetaPart(parts, 'msg-created')

    expect(parts).toHaveLength(2)
    expect(parts[1]).toMatchObject({
      type: 'data',
      name: 'chatbi_message_meta',
      data: {
        messageId: 'msg-created'
      }
    })
  })

  it('appends streamed text by replacing the trailing text part instead of mutating a readonly field', () => {
    const parts = [
      {
        type: 'text' as const,
        text: '第一段'
      }
    ]

    appendThreadTextPart(parts, '第二段')

    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({
      type: 'text',
      text: '第一段第二段'
    })
  })
})

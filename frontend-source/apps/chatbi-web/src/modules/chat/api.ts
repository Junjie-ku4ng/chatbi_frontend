import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/shared/contracts/frontend-platform-contract'

const askConversationAccess = frontendResourceAccessRegistry.askConversations
const askTurnsAccess = frontendResourceAccessRegistry.askTurns
const askMessageFeedbackAccess = frontendResourceAccessRegistry.askMessageFeedback
const askSuggestedQuestionsAccess = frontendResourceAccessRegistry.askSuggestedQuestions

function xpertConversationPath(xpertId: string, path = '') {
  return `/${encodeURIComponent(xpertId)}/conversations${path}`
}

type Page<T> = {
  items: T[]
  total: number
  limit?: number
  offset?: number
}

export type ConversationSummary = {
  conversationId: string
  xpertId?: string
  modelId?: string
  turnCount: number
  lastTurnAt?: string
  memorySummary?: string
  latestCheckpointId?: number
}

export type ConversationTurn = {
  id: string | number
  turnId: string
  turnIndex: number
  role: 'user' | 'assistant' | 'system' | 'unknown'
  status: 'success' | 'clarification' | 'failed'
  userQuestion: string
  resolvedQuestion?: string
  createdAt?: string
}

export type MessageFeedbackRating = 'LIKE' | 'DISLIKE'

export type MessageFeedback = {
  id: string
  conversationId: string
  messageId: string
  rating: MessageFeedbackRating
  createdAt?: string
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map(item => {
        const record = asRecord(item)
        if (!record) return ''
        return asString(record.text) ?? asString(record.content) ?? ''
      })
      .join('')
  }
  const record = asRecord(content)
  if (!record) return ''
  return asString(record.text) ?? asString(record.content) ?? ''
}

function normalizeRole(value: unknown): ConversationTurn['role'] {
  const role = asString(value)?.toLowerCase()
  if (role === 'user' || role === 'human') return 'user'
  if (role === 'assistant' || role === 'ai') return 'assistant'
  if (role === 'system') return 'system'
  return 'unknown'
}

function normalizeConversationSummary(item: Record<string, unknown>): ConversationSummary {
  const options = asRecord(item.options)
  const params = asRecord(options?.parameters)
  const messages = Array.isArray(item.messages) ? item.messages : []
  const xpertId =
    asString(item.xpertId) ??
    asString(options?.xpertId) ??
    asString(params?.xpertId) ??
    asString(params?.modelId)
  return {
    conversationId: asString(item.id) ?? '',
    xpertId,
    modelId: asString(params?.modelId) ?? xpertId,
    turnCount: messages.length,
    lastTurnAt: asString(item.updatedAt),
    memorySummary: asString(item.title) ?? asString(params?.input),
    latestCheckpointId: undefined
  }
}

export async function listConversations(xpertId?: string, limit = 20, offset = 0) {
  if (!xpertId) {
    return {
      items: [],
      total: 0
    } satisfies Page<ConversationSummary>
  }

  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        xpertId
      },
      order: {
        updatedAt: 'DESC'
      },
      take: limit,
      skip: offset
    })
  })
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    xpertConversationPath(xpertId, `?${query.toString()}`),
    {
      track: askConversationAccess.track
    }
  )

  const items = Array.isArray(payload?.items) ? payload.items.map(normalizeConversationSummary) : []
  const filtered = items.filter(item => item.xpertId === xpertId || item.modelId === xpertId)
  return {
    items: filtered,
    total: filtered.length
  } satisfies Page<ConversationSummary>
}

export async function getConversation(conversationId: string, xpertId?: string) {
  if (!xpertId) {
    return null
  }

  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        id: conversationId
      },
      take: 1,
      skip: 0,
      order: {
        updatedAt: 'DESC'
      }
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(xpertConversationPath(xpertId, `?${query}`), {
    track: askConversationAccess.track
  })

  return Array.isArray(payload?.items) ? (payload.items[0] ?? null) : null
}

export async function listConversationTurns(conversationId: string, limit = 50, offset = 0) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        conversationId
      },
      take: limit,
      skip: offset,
      order: {
        createdAt: 'DESC'
      }
    })
  })
  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    `${askTurnsAccess.path}?${query.toString()}`,
    { track: askTurnsAccess.track }
  )

  const items = (Array.isArray(payload?.items) ? payload.items : []).map((item, index) => {
    const statusRaw = asString(item.status)?.toLowerCase()
    const status: ConversationTurn['status'] =
      statusRaw === 'failed' || statusRaw === 'error'
        ? 'failed'
        : statusRaw === 'clarification'
          ? 'clarification'
          : 'success'
    const role = normalizeRole(item.role)
    return {
      id: asString(item.id) ?? `${offset + index + 1}`,
      turnId: asString(item.id) ?? `${offset + index + 1}`,
      turnIndex: offset + index + 1,
      role,
      status,
      userQuestion: extractMessageText(item.content),
      resolvedQuestion: undefined,
      createdAt: asString(item.createdAt)
    } satisfies ConversationTurn
  })

  return {
    items,
    total: typeof payload?.total === 'number' ? payload.total : items.length
  } satisfies Page<ConversationTurn>
}

function normalizeFeedback(item: Record<string, unknown>): MessageFeedback | null {
  const id = asString(item.id)
  const conversationId = asString(item.conversationId)
  const messageId = asString(item.messageId)
  const rating = asString(item.rating)?.toUpperCase()

  if (!id || !conversationId || !messageId) {
    return null
  }
  if (rating !== 'LIKE' && rating !== 'DISLIKE') {
    return null
  }

  return {
    id,
    conversationId,
    messageId,
    rating,
    createdAt: asString(item.createdAt)
  }
}

export async function getMessageFeedback(conversationId: string, messageId: string) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: {
        conversationId,
        messageId
      },
      take: 1,
      skip: 0,
      order: {
        createdAt: 'DESC'
      }
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    `${askMessageFeedbackAccess.path}/my?${query.toString()}`,
    {
      track: askMessageFeedbackAccess.track
    }
  )
  const first = Array.isArray(payload?.items) ? payload.items[0] : undefined
  return first ? normalizeFeedback(first) : null
}

export async function createMessageFeedback(input: {
  conversationId: string
  messageId: string
  rating: MessageFeedbackRating
}) {
  const payload = await apiRequest<Record<string, unknown>>(askMessageFeedbackAccess.path, {
    method: 'POST',
    track: askMessageFeedbackAccess.track,
    body: {
      conversationId: input.conversationId,
      messageId: input.messageId,
      rating: input.rating
    }
  })
  const normalized = normalizeFeedback(payload)
  if (!normalized) {
    throw new Error('反馈接口返回了无效数据')
  }
  return normalized
}

export async function deleteMessageFeedback(feedbackId: string) {
  return apiRequest(`${askMessageFeedbackAccess.path}/${encodeURIComponent(feedbackId)}`, {
    method: 'DELETE',
    track: askMessageFeedbackAccess.track
  })
}

export async function listSuggestedQuestions(messageId: string) {
  const payload = await apiRequest<unknown>(
    askSuggestedQuestionsAccess.path.replace(':messageId', encodeURIComponent(messageId)),
    {
      track: askSuggestedQuestionsAccess.track
    }
  )
  if (Array.isArray(payload)) {
    return payload
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  }

  const payloadRecord = asRecord(payload)
  if (Array.isArray(payloadRecord?.items)) {
    return payloadRecord.items
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

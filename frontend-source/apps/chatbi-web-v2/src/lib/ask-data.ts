'use client'

import type { ThreadAssistantMessagePart, ThreadMessageLike } from '@assistant-ui/react'
import { apiRequest } from '@/lib/api-client'
import { frontendResourceAccessRegistry } from '@/modules/platform/frontend-platform-contract'
import { deriveChatSourceItems } from '@/modules/chat/runtime/chat-source-items'
import { toChatComponentEvent } from '@/modules/chat/runtime/chatbi-stream-runtime'

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
}

export type ConversationTurn = {
  id: string | number
  turnId: string
  turnIndex?: number
  role: 'user' | 'assistant' | 'system' | 'unknown'
  status?: 'success' | 'clarification' | 'failed'
  userQuestion: string
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

const askConversationAccess = frontendResourceAccessRegistry.askConversations
const askTurnsAccess = frontendResourceAccessRegistry.askTurns
const askMessageFeedbackAccess = frontendResourceAccessRegistry.askMessageFeedback

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function xpertConversationPath(xpertId: string, path = '') {
  return `/xpert/${encodeURIComponent(xpertId)}/conversations${path}`
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

function parseDate(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function appendAssistantTextPart(parts: ThreadAssistantMessagePart[], text: string | undefined) {
  if (typeof text !== 'string') {
    return
  }

  const normalized = text.trim()
  if (!normalized) {
    return
  }

  parts.push({
    type: 'text',
    text: normalized
  })
}

function extractClarificationPart(value: unknown) {
  const record = asRecord(value)
  if (!record) {
    return undefined
  }

  const candidates = [
    record,
    asRecord(record.data),
    asRecord(record.artifact),
    asRecord(asRecord(record.artifact)?.queryResult),
    asRecord(asRecord(record.data)?.artifact),
    asRecord(asRecord(asRecord(record.data)?.artifact)?.queryResult)
  ].filter(Boolean) as Record<string, unknown>[]

  for (const candidate of candidates) {
    const clarification = asRecord(candidate.clarification)
    if (!clarification || clarification.required !== true) {
      continue
    }

    const message = asString(clarification.message)
    if (!message) {
      continue
    }

    return {
      type: 'data' as const,
      name: 'chatbi_clarification',
      data: clarification
    }
  }

  return undefined
}

function extractSourcePart(value: unknown) {
  const record = asRecord(value)
  if (!record) {
    return undefined
  }

  const candidates = [
    record,
    asRecord(record.artifact),
    asRecord(asRecord(record.artifact)?.queryResult),
    asRecord(record.data),
    asRecord(asRecord(record.data)?.artifact),
    asRecord(asRecord(asRecord(record.data)?.artifact)?.queryResult)
  ].filter(Boolean) as Record<string, unknown>[]

  for (const candidate of candidates) {
    const items = deriveChatSourceItems(candidate)
    if (items.length === 0) {
      continue
    }

    return {
      type: 'data' as const,
      name: 'chatbi_sources',
      data: { items }
    }
  }

  return undefined
}

function normalizeAssistantThreadMessage(item: Record<string, unknown>): ThreadMessageLike {
  const messageId = asString(item.id) ?? crypto.randomUUID()
  const rawParts = Array.isArray(item.content) ? item.content : [item.content]
  const content: ThreadAssistantMessagePart[] = []

  for (const rawPart of rawParts) {
    const record = asRecord(rawPart)
    if (!record) {
      appendAssistantTextPart(content, typeof rawPart === 'string' ? rawPart : undefined)
      continue
    }

    if (record.type === 'text') {
      appendAssistantTextPart(content, asString(record.text))
      continue
    }

    const component = toChatComponentEvent(record, { messageId, sourceEvent: 'history' })
    if (component) {
      content.push({
        type: 'data',
        name: 'chatbi_component',
        data: component
      })
    }

    const clarificationPart = extractClarificationPart(record)
    if (clarificationPart) {
      content.push(clarificationPart)
    }

    const sourcePart = extractSourcePart(record)
    if (sourcePart) {
      content.push(sourcePart)
    }

    appendAssistantTextPart(content, asString(record.text) ?? asString(record.content))
  }

  content.push({
    type: 'data',
    name: 'chatbi_message_meta',
    data: {
      messageId
    }
  })

  return {
    id: messageId,
    role: 'assistant',
    createdAt: parseDate(item.createdAt),
    status: {
      type: 'complete',
      reason: 'stop'
    },
    content,
    metadata: {
      custom: {}
    }
  } satisfies ThreadMessageLike
}

function normalizeThreadMessage(item: Record<string, unknown>, index: number): ThreadMessageLike {
  const role = normalizeRole(item.role)
  const messageId = asString(item.id) ?? `message-${index + 1}`

  if (role === 'assistant') {
    return normalizeAssistantThreadMessage(item)
  }

  return {
    id: messageId,
    role: role === 'system' ? 'system' : 'user',
    createdAt: parseDate(item.createdAt),
    content: extractMessageText(item.content),
    metadata: {
      custom: {}
    }
  } satisfies ThreadMessageLike
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
    memorySummary: asString(item.title) ?? asString(params?.input)
  }
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

export async function listConversations(xpertId?: string, limit = 20, offset = 0) {
  if (!xpertId) {
    return { items: [], total: 0 } satisfies Page<ConversationSummary>
  }

  const query = new URLSearchParams({
    data: JSON.stringify({
      where: { xpertId },
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    xpertConversationPath(xpertId, `?${query.toString()}`),
    { track: askConversationAccess.track }
  )

  const items = Array.isArray(payload?.items) ? payload.items.map(normalizeConversationSummary) : []
  const filtered = items.filter(item => item.xpertId === xpertId || item.modelId === xpertId)

  return {
    items: filtered,
    total: filtered.length
  } satisfies Page<ConversationSummary>
}

export async function listConversationTurns(conversationId: string, limit = 50, offset = 0) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: { conversationId },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' }
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>>; total?: number }>(
    `${askTurnsAccess.path}?${query.toString()}`,
    { track: askTurnsAccess.track }
  )

  const items = (Array.isArray(payload?.items) ? payload.items : []).map((item, index) => ({
    id: asString(item.id) ?? `${offset + index + 1}`,
    turnId: asString(item.id) ?? `${offset + index + 1}`,
    turnIndex: offset + index + 1,
    role: normalizeRole(item.role),
    status: 'success' as const,
    userQuestion: extractMessageText(item.content),
    createdAt: asString(item.createdAt)
  }))

  return {
    items,
    total: typeof payload?.total === 'number' ? payload.total : items.length
  } satisfies Page<ConversationTurn>
}

export async function listConversationThreadMessages(conversationId: string, limit = 50, offset = 0) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: { conversationId },
      take: limit,
      skip: offset,
      order: { createdAt: 'ASC' }
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    `${askTurnsAccess.path}?${query.toString()}`,
    { track: askTurnsAccess.track }
  )

  return (Array.isArray(payload?.items) ? payload.items : []).map((item, index) => normalizeThreadMessage(item, index))
}

export async function getMessageFeedback(conversationId: string, messageId: string) {
  const query = new URLSearchParams({
    data: JSON.stringify({
      where: { conversationId, messageId },
      take: 1,
      skip: 0,
      order: { createdAt: 'DESC' }
    })
  })

  const payload = await apiRequest<{ items?: Array<Record<string, unknown>> }>(
    `${askMessageFeedbackAccess.path}/my?${query.toString()}`,
    { track: askMessageFeedbackAccess.track }
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
    body: input
  })

  const normalized = normalizeFeedback(payload)
  if (!normalized) {
    throw new Error('feedback api returned invalid payload')
  }

  return normalized
}

export async function deleteMessageFeedback(feedbackId: string) {
  return apiRequest(`${askMessageFeedbackAccess.path}/${encodeURIComponent(feedbackId)}`, {
    method: 'DELETE',
    track: askMessageFeedbackAccess.track
  })
}

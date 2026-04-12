'use client'

import { useMessage } from '@assistant-ui/react'
import { useMemo } from 'react'
import { buildAssistantThreadTimeline } from '../runtime/chat-thread-timeline'
import { selectMessageStepsByMessageId, useChatRuntimeStore } from '../runtime/chat-runtime-store'
import { ThreadTimelineMessage } from './thread/thread-timeline-message'

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function renderTextParts(parts: ReadonlyArray<{ type: string; text?: string }>) {
  const text = parts
    .filter(part => part.type === 'text')
    .map(part => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()
  return text || ''
}

function resolveServerMessageId(parts: ReadonlyArray<{ type: string; name?: string; data?: unknown }>) {
  for (const part of parts) {
    if (part.type !== 'data' || part.name !== 'chatbi_message_meta') {
      continue
    }
    const meta = asRecord(part.data)
    const messageId = meta && typeof meta.messageId === 'string' ? meta.messageId : undefined
    if (messageId) {
      return messageId
    }
  }
  return undefined
}

export function UserMessageCard() {
  const message = useMessage()
  const text = renderTextParts(message.content)
  const localMessageId = typeof (message as { id?: unknown }).id === 'string' ? ((message as { id: string }).id) : undefined

  return (
    <article data-testid="ask-user-message" data-message-id={localMessageId} className="chat-message-row chat-assistant-message-row is-user">
      <div className="chat-message-main chat-assistant-message-main is-user">
        <div className="chat-message-meta chat-assistant-message-meta is-user">
          <span className="chat-message-author chat-assistant-message-author">你</span>
        </div>
        <div data-testid="ask-user-bubble" className="chat-message-bubble chat-assistant-message-bubble is-user">
          <p className="chat-assistant-message-text">{text}</p>
        </div>
      </div>
    </article>
  )
}

export function AssistantMessageCard() {
  const message = useMessage()
  const serverMessageId = resolveServerMessageId(message.content)
  const localMessageId = typeof (message as { id?: unknown }).id === 'string' ? ((message as { id: string }).id) : undefined
  const hasClarification = message.content.some(part => part.type === 'data' && part.name === 'chatbi_clarification')
  const hasComponent = message.content.some(part => part.type === 'data' && part.name === 'chatbi_component')
  const messageStepsByMessageId = useChatRuntimeStore(state => state.messageStepsByMessageId)
  const runtimeSteps = useMemo(
    () =>
      selectMessageStepsByMessageId(
        {
          messageStepsByMessageId
        } as Parameters<typeof selectMessageStepsByMessageId>[0],
        serverMessageId ?? (message.status?.type === 'running' ? null : undefined)
      ),
    [messageStepsByMessageId, message.status?.type, serverMessageId]
  )
  const timelineItems = buildAssistantThreadTimeline({
    parts: message.content,
    runtimeSteps
  })
  const assistantTone = hasClarification ? 'clarification' : hasComponent || runtimeSteps.length > 0 ? 'analysis' : 'chat'
  const assistantToneLabel =
    assistantTone === 'clarification' ? '澄清' : assistantTone === 'analysis' ? '分析' : '对话'

  return (
    <article
      data-testid="ask-assistant-message"
      data-message-id={localMessageId}
      data-server-message-id={serverMessageId}
      className={`chat-message-row chat-assistant-message-row is-assistant is-${assistantTone}`}
    >
      <div className="chat-message-avatar chat-assistant-message-avatar" aria-hidden="true">
        PA
      </div>
      <div className="chat-message-main chat-assistant-message-main is-assistant">
        <div className="chat-message-meta chat-assistant-message-meta is-assistant">
          <span className="chat-message-author chat-assistant-message-author">PA Nexus</span>
          <span className={`chat-assistant-message-tone tone-${assistantTone}`}>{assistantToneLabel}</span>
        </div>
        <div
          data-testid="ask-assistant-bubble"
          className={`chat-message-bubble chat-assistant-message-bubble is-assistant tone-${assistantTone}`}
        >
          <ThreadTimelineMessage items={timelineItems} />
        </div>
        {message.status?.type === 'running' ? (
          <span data-testid="ask-assistant-running" className="nx-badge nx-badge-warn chat-assistant-running-badge">
            生成中...
          </span>
        ) : null}
      </div>
    </article>
  )
}

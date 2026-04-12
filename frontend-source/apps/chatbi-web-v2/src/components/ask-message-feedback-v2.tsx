'use client'

import { useEffect, useState } from 'react'
import type { MessageFeedback, MessageFeedbackRating } from '@/lib/ask-data'
import { createMessageFeedback, deleteMessageFeedback, getMessageFeedback } from '@/lib/ask-data'
import type { ChatSourceItem } from '@/modules/chat/runtime/chat-source-items'
import { useChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'
import { copyDonorAnswerV2 } from './ask-donor-copy-utils-v2'
import { SvgCopyV2, SvgRotateV2, SvgThumbDownV2, SvgThumbUpV2 } from './onyx/icons'
import { OnyxSelectButtonV2 } from './onyx/onyx-select-button-v2'

type AskMessageFeedbackV2Props = {
  conversationId?: string
  messageId?: string
  sources?: ChatSourceItem[]
  getCopyText?: () => string
  getCopyHtml?: () => string
}

export function AskMessageFeedbackV2({
  conversationId,
  messageId,
  sources = [],
  getCopyText,
  getCopyHtml
}: AskMessageFeedbackV2Props) {
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null)
  const [pending, setPending] = useState(false)
  const selectedMessageId = useChatSourceRailStore(state => state.selectedMessageId)
  const toggleMessageSources = useChatSourceRailStore(state => state.toggleMessageSources)

  useEffect(() => {
    let cancelled = false

    if (!conversationId || !messageId) {
      setFeedback(null)
      return
    }

    void getMessageFeedback(conversationId, messageId).then(result => {
      if (!cancelled) {
        setFeedback(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [conversationId, messageId])

  if (!conversationId || !messageId) {
    return null
  }

  const isSourceSelected = sources.length > 0 && selectedMessageId === messageId

  async function toggleRating(nextRating: MessageFeedbackRating) {
    if (pending || !conversationId || !messageId) {
      return
    }

    setPending(true)
    try {
      if (feedback && feedback.rating === nextRating) {
        await deleteMessageFeedback(feedback.id)
        setFeedback(null)
        return
      }

      if (feedback) {
        await deleteMessageFeedback(feedback.id)
      }

      const created = await createMessageFeedback({
        conversationId,
        messageId,
        rating: nextRating
      })
      setFeedback(created)
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="onyx-donor-toolbar flex md:flex-row justify-between items-center w-full transition-transform duration-300 ease-in-out transform opacity-100 pl-1"
      data-testid="AgentMessage/toolbar"
    >
      <div className="onyx-donor-toolbar-actions flex items-center gap-1" data-testid="onyx-donor-toolbar-actions">
        <OnyxSelectButtonV2
          aria-label="复制回答"
          data-testid="AgentMessage/copy-button"
          icon={SvgCopyV2}
          onClick={() => {
            void copyDonorAnswerV2({
              text: getCopyText?.() ?? '',
              html: getCopyHtml?.()
            })
          }}
          size="sm"
          state="empty"
          variant="select-light"
        />
        <OnyxSelectButtonV2
          data-rating="LIKE"
          data-testid="AgentMessage/like-button"
          aria-label="有帮助"
          disabled={pending}
          icon={SvgThumbUpV2}
          onClick={() => {
            void toggleRating('LIKE')
          }}
          size="sm"
          state={feedback?.rating === 'LIKE' ? 'selected' : 'empty'}
          variant="select-light"
        />
        <OnyxSelectButtonV2
          data-rating="DISLIKE"
          data-testid="AgentMessage/dislike-button"
          aria-label="需要改进"
          disabled={pending}
          icon={SvgThumbDownV2}
          onClick={() => {
            void toggleRating('DISLIKE')
          }}
          size="sm"
          state={feedback?.rating === 'DISLIKE' ? 'selected' : 'empty'}
          variant="select-light"
        />
        <div data-testid="AgentMessage/regenerate">
          <OnyxSelectButtonV2
            aria-label="重新生成"
            icon={SvgRotateV2}
            onClick={() => {}}
            size="sm"
            state="empty"
            variant="select-light"
          />
        </div>
      </div>
      {sources.length > 0 ? (
        <div data-testid="onyx-donor-toolbar-sources">
          <OnyxSelectButtonV2
            aria-label="来源"
            onClick={() => {
              toggleMessageSources({
                messageId,
                sources
              })
            }}
            size="sm"
            state={isSourceSelected ? 'selected' : 'empty'}
            variant="select-light"
          >
            来源
          </OnyxSelectButtonV2>
        </div>
      ) : null}
    </div>
  )
}

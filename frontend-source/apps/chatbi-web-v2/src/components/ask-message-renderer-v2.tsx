'use client'

import { useAui, useMessage } from '@assistant-ui/react'
import { useMemo, useRef } from 'react'
import {
  buildAssistantThreadTimeline,
} from '@/modules/chat/runtime/chat-thread-timeline'
import { selectMessageStepsByMessageId, useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import { extractChatSourceItemsFromPartData } from '@/modules/chat/runtime/chat-source-items'
import { handleDonorMarkdownCopy } from './ask-donor-copy-utils-v2'
import { buildDonorMessagePresentationV2 } from './ask-donor-message-adapter-v2'
import { DonorDisplayGroupRendererV2 } from './ask-donor-display-group-renderer-v2'
import { DonorFinalAnswerShellV2 } from './ask-donor-final-answer-shell-v2'
import {
  RuntimeTimelineRendererV2
} from './ask-donor-runtime-renderers-v2'
import { AskMessageFeedbackV2 } from './ask-message-feedback-v2'
import { useAskRuntimeContextV2 } from './ask-runtime-context-v2'
import { OnyxDonorCardV2 } from './onyx-donor/onyx-donor-card-v2'
import { SvgChatbiMarkV2 } from './onyx/icons'

type MessagePart = {
  type: string
  text?: string
  name?: string
  data?: unknown
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function getTextParts(parts: ReadonlyArray<MessagePart>) {
  return parts.filter((part): part is MessagePart & { text: string } => part.type === 'text' && typeof part.text === 'string')
}

function getDataParts(parts: ReadonlyArray<MessagePart>, name: string) {
  return parts.filter(part => part.type === 'data' && part.name === name)
}

function getMessageMetaId(parts: ReadonlyArray<MessagePart>) {
  const metaPart = getDataParts(parts, 'chatbi_message_meta')[0]
  const record = asRecord(metaPart?.data)
  return typeof record?.messageId === 'string' ? record.messageId : undefined
}

function getMessageSources(parts: ReadonlyArray<MessagePart>) {
  const sourcePart = getDataParts(parts, 'chatbi_sources')[0]
  return extractChatSourceItemsFromPartData(sourcePart?.data)
}

function resolveThreadComposer(aui: ReturnType<typeof useAui>) {
  if (typeof aui.thread === 'function') {
    return aui.thread().composer()
  }
  return aui.composer()
}

export function UserMessageCardV2() {
  const message = useMessage()
  const text = getTextParts(message.content as MessagePart[]).map(part => part.text).join('\n').trim()

  return (
    <article id="onyx-human-message" className="flex w-full flex-col justify-end relative">
      <div className="flex justify-end">
        <div className="md:max-w-[37.5rem]">
          <OnyxDonorCardV2
            className="onyx-native-donor-user-message-card max-w-[30rem] md:max-w-[37.5rem]"
            data-testid="onyx-native-donor-user-message-card"
            padding="sm"
            variant="secondary"
          >
            <div className="onyx-native-donor-user-message-bubble" data-testid="onyx-native-donor-user-message-bubble">
              <p className="font-main-content-body whitespace-break-spaces break-anywhere text-text-01">{text}</p>
            </div>
          </OnyxDonorCardV2>
        </div>
      </div>
    </article>
  )
}

export function AssistantMessageCardV2() {
  const message = useMessage()
  const aui = useAui()
  const threadComposer = resolveThreadComposer(aui)
  const { conversationId } = useAskRuntimeContextV2()
  const messageParts = message.content as MessagePart[]
  const messageId = getMessageMetaId(messageParts)
  const sources = getMessageSources(messageParts)
  const messageStepsByMessageId = useChatRuntimeStore(state => state.messageStepsByMessageId)
  const runtimeSteps = useMemo(
    () =>
      selectMessageStepsByMessageId(
        {
          messageStepsByMessageId
        } as Parameters<typeof selectMessageStepsByMessageId>[0],
        messageId ?? (message.status?.type === 'running' ? null : undefined)
      ),
    [message.status?.type, messageId, messageStepsByMessageId]
  )
  const timelineItems = useMemo(
    () =>
      buildAssistantThreadTimeline({
        parts: messageParts,
        runtimeSteps,
        terminalStatus:
          message.status?.type === 'running'
            ? {
                status: 'running',
                label: '正在生成...'
              }
            : null
      }),
    [message.status?.type, messageParts, runtimeSteps]
  )
  const presentation = useMemo(() => buildDonorMessagePresentationV2(timelineItems), [timelineItems])
  const isComplete = message.status?.type === 'complete'
  const markdownRef = useRef<HTMLDivElement>(null)
  const finalAnswerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col gap-3" data-testid="onyx-ai-message">
      <div className="onyx-donor-message-shell flex flex-col gap-3" data-testid="onyx-donor-message-shell">
        <article
          className={
            presentation.tone === 'analysis'
              ? 'onyx-donor-message-row-1 flex w-full gap-3 is-analysis'
              : 'onyx-donor-message-row-1 flex w-full gap-3'
          }
          data-testid="onyx-donor-message-row-1"
        >
        <div
          className="onyx-donor-message-avatar-column flex h-6 w-6 shrink-0 items-start justify-center pt-1 text-text-01"
          data-testid="onyx-donor-message-avatar-column"
        >
          <SvgChatbiMarkV2 size={18} />
        </div>
        <div
          className="onyx-donor-message-main-column flex min-w-0 max-w-[720px] flex-1 flex-col gap-3"
          data-testid="onyx-donor-message-main-column"
        >
          <RuntimeTimelineRendererV2
            headerText={presentation.runtimeShellHeader}
            runtimeStepItems={presentation.runtimeStepItems}
            runtimeTerminalItems={presentation.runtimeTerminalItems}
          />
          <div className="onyx-donor-row-2 flex w-full flex-col gap-4" data-testid="onyx-donor-message-row-2">
            <OnyxDonorCardV2
              className="onyx-native-donor-message-body-card"
              data-testid="onyx-native-donor-message-body-card"
              padding="sm"
              variant="borderless"
            >
              <div className="onyx-native-donor-message-body-stack" data-testid="onyx-native-donor-message-body-stack">
                {presentation.finalAnswerSections.length > 0 ? (
                  <DonorFinalAnswerShellV2
                    finalAnswerRef={finalAnswerRef}
                    markdownRef={markdownRef}
                    onCopy={event => {
                      handleDonorMarkdownCopy(event, markdownRef)
                    }}
                  >
                    {presentation.finalAnswerSections.map((section, index) => (
                      <DonorDisplayGroupRendererV2
                        key={section.key}
                        section={section}
                        index={index}
                        onApplyPrompt={prompt => {
                          threadComposer.setText(prompt)
                          threadComposer.send()
                        }}
                        onApplyHint={hint => {
                          threadComposer.setText(hint)
                          threadComposer.send()
                        }}
                      />
                    ))}
                  </DonorFinalAnswerShellV2>
                ) : null}
                {isComplete ? (
                  <div className="onyx-donor-toolbar-slot w-full pl-1 pt-1" data-testid="onyx-donor-toolbar-slot">
                    <AskMessageFeedbackV2
                      conversationId={conversationId}
                      getCopyHtml={() => finalAnswerRef.current?.innerHTML ?? ''}
                      getCopyText={() => finalAnswerRef.current?.textContent ?? ''}
                      messageId={messageId}
                      sources={sources}
                    />
                  </div>
                ) : null}
              </div>
            </OnyxDonorCardV2>
          </div>
        </div>
        </article>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ConversationSummary } from '@/lib/ask-data'
import { SvgBubbleTextV2 } from '@/components/onyx/icons'
import { OnyxSidebarTabV2 } from '@/components/onyx/onyx-sidebar-tab-v2'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import { listConversations } from '@/lib/ask-data'
import { DEFAULT_DEV_ASK_HARNESS_XPERT_ID } from '@/modules/chat/runtime/ask-harness'

type AskConversationSidebarV2Props = {
  activeXpertId?: string
  activeConversationId?: string
  preferActiveConversationFallback?: boolean
  handoff: {
    queryLogId?: string
    traceKey?: string
    analysisDraft?: string
  }
}

type PlaceholderConversationSummary = Pick<ConversationSummary, 'conversationId' | 'memorySummary'> & {
  lastTurnAt?: ConversationSummary['lastTurnAt']
}

const DONOR_PLACEHOLDER_SESSIONS = [
  {
    conversationId: 'starter-summary',
    memorySummary: 'Summarize Most Recent 3...',
    lastTurnAt: undefined
  },
  {
    conversationId: 'starter-intro',
    memorySummary: 'Onyx AI Intro',
    lastTurnAt: undefined
  },
  {
    conversationId: 'starter-use-cases',
    memorySummary: 'Onyx AI Use Cases Overview',
    lastTurnAt: undefined
  },
  {
    conversationId: 'starter-poc',
    memorySummary: 'POC Documents',
    lastTurnAt: undefined
  },
  {
    conversationId: 'starter-news',
    memorySummary: 'Onyx AI Latest News',
    lastTurnAt: undefined
  }
] satisfies Array<PlaceholderConversationSummary>

function isRecoverableConversationLoadError(error: unknown) {
  const status = typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined
  return status === 403 || status === 404 || status === 500
}

function formatConversationClock(value?: string) {
  if (!value) {
    return ''
  }
  if (value === 'Starter session') {
    return value
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function buildAskHref(input: {
  xpertId?: string
  conversationId?: string
  queryLogId?: string
  traceKey?: string
  analysisDraft?: string
}) {
  const query = new URLSearchParams()
  if (input.xpertId) query.set('xpertId', input.xpertId)
  if (input.conversationId) query.set('conversationId', input.conversationId)
  if (input.queryLogId) query.set('queryLogId', input.queryLogId)
  if (input.traceKey) query.set('traceKey', input.traceKey)
  if (input.analysisDraft) query.set('analysisDraft', input.analysisDraft)
  const search = query.toString()
  return search ? `/chat?${search}` : '/chat'
}

export function AskConversationSidebarV2({
  activeXpertId,
  activeConversationId,
  preferActiveConversationFallback = false,
  handoff
}: AskConversationSidebarV2Props) {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!activeXpertId) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    if (activeXpertId === DEFAULT_DEV_ASK_HARNESS_XPERT_ID) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    void listConversations(activeXpertId, 30, 0)
      .then(result => {
        if (cancelled) return
        setItems(result.items)
      })
      .catch(nextError => {
        if (cancelled) return
        if (isRecoverableConversationLoadError(nextError)) {
          setItems([])
          setError(null)
          return
        }
        setError(nextError instanceof Error ? nextError.message : 'Failed to load conversations')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeConversationId, activeXpertId])

  const conversations = useMemo(() => items.slice(0, 12), [items])
  const visibleConversations = useMemo(() => {
    if (
      !preferActiveConversationFallback ||
      !activeConversationId ||
      conversations.some(item => item.conversationId === activeConversationId)
    ) {
      return conversations
    }

    return [
      {
        conversationId: activeConversationId,
        xpertId: activeXpertId,
        modelId: activeXpertId,
        turnCount: 0,
        lastTurnAt: undefined,
        memorySummary: 'Current conversation'
      },
      ...conversations
    ]
  }, [activeConversationId, activeXpertId, conversations])

  const renderSessionLabel = (primary: string, secondary?: string) => (
    <div className="flex min-w-0 flex-1 flex-col onyx-donor-session-item" data-testid="onyx-donor-session-item">
      <OnyxTextV2 color="text-02" font="main-ui-body" maxLines={1}>
        {primary}
      </OnyxTextV2>
      {secondary ? (
        <div className="onyx-donor-session-item-meta" data-testid="onyx-donor-session-item-meta">
          <OnyxTextV2 color="text-03" font="secondary-body" maxLines={1}>
            {secondary}
          </OnyxTextV2>
        </div>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div className="v2-sidebar-list px-3">
        <OnyxTextV2 as="p" color="text-03" font="secondary-body">
          Loading chats...
        </OnyxTextV2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="v2-sidebar-list px-3">
        <OnyxTextV2 as="p" color="text-03" font="secondary-body">
          Conversation load failed
        </OnyxTextV2>
        <OnyxTextV2 as="p" color="text-04" font="secondary-body">
          {error}
        </OnyxTextV2>
      </div>
    )
  }

  if (!activeXpertId || visibleConversations.length === 0) {
    const placeholderItems = DONOR_PLACEHOLDER_SESSIONS

    if (placeholderItems) {
      return (
        <div className="v2-sidebar-list onyx-donor-session-list" data-testid="onyx-donor-session-list">
          {placeholderItems.map(item => (
            <OnyxSidebarTabV2
              href={buildAskHref({
                xpertId: activeXpertId,
                conversationId: item.conversationId
              })}
              icon={SvgBubbleTextV2}
              key={item.conversationId}
              variant="sidebar-light"
            >
              {renderSessionLabel(item.memorySummary, item.lastTurnAt)}
            </OnyxSidebarTabV2>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="v2-sidebar-list onyx-donor-session-list" data-testid="onyx-donor-session-list">
      {visibleConversations.map(item => (
        <OnyxSidebarTabV2
          href={buildAskHref({
            xpertId: activeXpertId,
            conversationId: item.conversationId,
            queryLogId: handoff.queryLogId,
            traceKey: handoff.traceKey,
            analysisDraft: handoff.analysisDraft
          })}
          icon={SvgBubbleTextV2}
          key={item.conversationId}
          selected={item.conversationId === activeConversationId}
          variant="sidebar-light"
        >
          {renderSessionLabel(
            item.memorySummary || item.conversationId,
            `${item.conversationId}${item.lastTurnAt ? ` · ${formatConversationClock(item.lastTurnAt)}` : ''}`
          )}
        </OnyxSidebarTabV2>
      ))}
    </div>
  )
}

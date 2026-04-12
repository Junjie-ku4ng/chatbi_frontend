'use client'

import Link from 'next/link'
import { AskConversationSidebarV2 } from '@/components/ask-conversation-sidebar-v2'
import { OnyxDonorCardV2 } from '@/components/onyx-donor/onyx-donor-card-v2'
import { OnyxButtonV2 } from '@/components/onyx/onyx-button-v2'
import {
  SvgBubbleTextV2,
  SvgChevronDownV2,
  SvgEditBigV2,
  SvgFolderV2,
  SvgOnyxLogoTypedV2,
  SvgSidebarV2,
  SvgUserCircleV2
} from '@/components/onyx/icons'
import { OnyxSidebarSectionV2 } from '@/components/onyx/onyx-sidebar-section-v2'
import { OnyxSidebarTabV2 } from '@/components/onyx/onyx-sidebar-tab-v2'

type OnyxSidebarV2Props = {
  activeXpertId?: string
  activeConversationId?: string
  preferActiveConversationFallback?: boolean
  handoff: {
    queryLogId?: string
    traceKey?: string
    analysisDraft?: string
  }
}

const DONOR_AGENT_ITEMS = [
  { id: 'sales-assistant', label: 'Sales Assistant', trailing: false },
  { id: 'hr-policy', label: 'HR Policy', trailing: false },
  { id: 'more-agents', label: 'More Agents', trailing: true }
] as const

function buildChatHref(input: {
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

export function OnyxSidebarV2({
  activeXpertId,
  activeConversationId,
  preferActiveConversationFallback = false,
  handoff
}: OnyxSidebarV2Props) {
  const newSessionHref = buildChatHref({ xpertId: activeXpertId })

  return (
    <aside className="onyx-sidebar-v2 onyx-donor-sidebar-root" data-testid="onyx-donor-sidebar-root">
      <OnyxDonorCardV2
        className="onyx-sidebar-v2-top onyx-donor-sidebar-top onyx-native-donor-sidebar-top-card"
        data-testid="onyx-native-donor-sidebar-top-card"
        padding="sm"
        variant="secondary"
      >
        <div className="onyx-native-donor-sidebar-top-stack">
          <div className="onyx-sidebar-v2-brand onyx-donor-sidebar-brand">
            <Link aria-label="Onyx" href="/chat">
              <SvgOnyxLogoTypedV2 className="text-text-01" size={28} />
            </Link>
          </div>
          <button
            aria-label="Toggle sidebar"
            className="onyx-sidebar-v2-collapse onyx-donor-sidebar-collapse"
            data-testid="onyx-donor-sidebar-collapse"
            type="button"
          >
            <SvgSidebarV2 className="h-4 w-4" />
          </button>
        </div>
      </OnyxDonorCardV2>

      <OnyxDonorCardV2
        className="onyx-sidebar-v2-primary onyx-donor-sidebar-primary onyx-native-donor-sidebar-primary-card"
        data-testid="onyx-native-donor-sidebar-primary-card"
        padding="sm"
        variant="secondary"
      >
        <div
          className="onyx-native-donor-sidebar-primary-stack"
          data-testid="onyx-donor-sidebar-primary"
        >
          <OnyxButtonV2
            className="onyx-donor-sidebar-new-session"
            data-testid="onyx-donor-sidebar-new-session"
            href={newSessionHref}
            icon={SvgEditBigV2}
            prominence="secondary"
            width="full"
          >
            New Session
          </OnyxButtonV2>
          <div className="onyx-sidebar-v2-nav onyx-donor-sidebar-nav" data-testid="onyx-donor-sidebar-nav">
            <OnyxSidebarTabV2 href={newSessionHref} icon={SvgBubbleTextV2} selected variant="sidebar-light">
              Chat
            </OnyxSidebarTabV2>
            <OnyxSidebarTabV2 href={newSessionHref} icon={SvgFolderV2} variant="sidebar-light">
              Projects
            </OnyxSidebarTabV2>
          </div>
        </div>
      </OnyxDonorCardV2>

      <div className="onyx-sidebar-v2-scroll onyx-donor-sidebar-scroll">
        <OnyxSidebarSectionV2 title="Agents">
          <div className="v2-sidebar-list onyx-donor-agent-list" data-testid="onyx-donor-agent-list">
            {DONOR_AGENT_ITEMS.map(item => (
              <OnyxSidebarTabV2
                href={item.id === 'more-agents' ? newSessionHref : undefined}
                icon={SvgUserCircleV2}
                key={item.id}
                variant="sidebar-light"
              >
                <span className="onyx-sidebar-v2-agent-label onyx-donor-agent-item" data-testid="onyx-donor-agent-item">
                  {item.label}
                  {item.trailing ? <SvgChevronDownV2 className="h-3.5 w-3.5" /> : null}
                </span>
              </OnyxSidebarTabV2>
            ))}
          </div>
        </OnyxSidebarSectionV2>

        <OnyxSidebarSectionV2 title="Sessions">
          <AskConversationSidebarV2
            activeXpertId={activeXpertId}
            activeConversationId={activeConversationId}
            preferActiveConversationFallback={preferActiveConversationFallback}
            handoff={handoff}
          />
        </OnyxSidebarSectionV2>
      </div>

      <OnyxDonorCardV2
        className="onyx-sidebar-v2-footer onyx-donor-sidebar-footer onyx-native-donor-sidebar-footer-card"
        data-testid="onyx-native-donor-sidebar-footer-card"
        padding="sm"
        variant="secondary"
      >
        <div className="onyx-native-donor-sidebar-footer-stack" data-testid="onyx-donor-sidebar-footer">
          <button className="onyx-sidebar-v2-account onyx-donor-sidebar-account" data-testid="onyx-donor-sidebar-account" type="button">
            <span className="onyx-sidebar-v2-account-avatar">A</span>
            <span className="onyx-sidebar-v2-account-label">Alice</span>
          </button>
        </div>
      </OnyxDonorCardV2>
    </aside>
  )
}

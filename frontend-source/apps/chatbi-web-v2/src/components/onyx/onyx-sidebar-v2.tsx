'use client'

import Link from 'next/link'
import { AskConversationSidebarV2 } from '@/components/ask-conversation-sidebar-v2'
import {
  SvgCraftBoxV2,
  SvgChatbiLogoTypedV2,
  SvgEditBigV2,
  SvgFolderV2,
  SvgGearV2,
  SvgPanelLeftV2,
  SvgSearchMenuV2,
  SvgSparkleV2
} from '@/components/onyx/icons'
import type { OnyxIconComponent } from '@/components/onyx/onyx-types'

type OnyxSidebarV2Props = {
  activeXpertId?: string
  activeConversationId?: string
  folded?: boolean
  preferActiveConversationFallback?: boolean
  onToggleSidebar?: () => void
  handoff: {
    queryLogId?: string
    traceKey?: string
    analysisDraft?: string
  }
}

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

function OnyxSidebarActionV2({
  children,
  className = '',
  folded,
  href,
  icon: Icon,
  primary = false,
  testId,
  type = 'link'
}: {
  children: string
  className?: string
  folded?: boolean
  href?: string
  icon: OnyxIconComponent
  primary?: boolean
  testId?: string
  type?: 'button' | 'link'
}) {
  const actionClassName = `onyx-sidebar-v2-action${primary ? ' is-primary' : ''}${className ? ` ${className}` : ''}`
  const content = (
    <>
      <span className="onyx-sidebar-v2-action-icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      {folded ? null : <span className="onyx-sidebar-v2-action-label">{children}</span>}
    </>
  )

  if (type === 'button' || !href) {
    return (
      <button
        aria-label={folded ? children : undefined}
        className={actionClassName}
        data-testid={testId}
        type="button"
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      aria-label={folded ? children : undefined}
      className={actionClassName}
      data-testid={testId}
      href={href}
    >
      {content}
    </Link>
  )
}

export function OnyxSidebarV2({
  activeXpertId,
  activeConversationId,
  folded = false,
  preferActiveConversationFallback = false,
  onToggleSidebar,
  handoff
}: OnyxSidebarV2Props) {
  const newSessionHref = buildChatHref({ xpertId: activeXpertId })

  return (
    <aside className={`onyx-sidebar-v2 onyx-donor-sidebar-root${folded ? ' is-collapsed' : ''}`} data-testid="onyx-donor-sidebar-root">
      <div
        className="onyx-sidebar-v2-top onyx-donor-sidebar-top onyx-native-donor-sidebar-top-card"
        data-testid="onyx-native-donor-sidebar-top-card"
      >
        <div className="onyx-sidebar-v2-brand onyx-donor-sidebar-brand">
          <Link aria-label="镜元智算" href="/chat">
            <SvgChatbiLogoTypedV2 className="text-text-01" size={34} />
          </Link>
        </div>
        <button
          aria-label={folded ? '展开侧边栏' : '收起侧边栏'}
          aria-expanded={!folded}
          className="onyx-sidebar-v2-collapse onyx-donor-sidebar-collapse"
          data-testid="onyx-donor-sidebar-collapse"
          onClick={onToggleSidebar}
          type="button"
        >
          <SvgPanelLeftV2 className="h-5 w-5" />
        </button>
      </div>

      <div
        className="onyx-sidebar-v2-primary onyx-sidebar-v2-session-panel onyx-donor-sidebar-primary onyx-native-donor-sidebar-primary-card"
        data-testid="onyx-native-donor-sidebar-primary-card"
      >
        <div className="onyx-native-donor-sidebar-primary-stack" data-testid="onyx-donor-sidebar-primary">
          <OnyxSidebarActionV2
            folded={folded}
            href={newSessionHref}
            icon={SvgEditBigV2}
            primary
            testId="onyx-donor-sidebar-new-session"
          >
            新建会话
          </OnyxSidebarActionV2>
          <div className="onyx-sidebar-v2-nav onyx-donor-sidebar-nav" data-testid="onyx-donor-sidebar-nav">
            <OnyxSidebarActionV2 folded={folded} href={newSessionHref} icon={SvgSearchMenuV2}>
              搜索会话
            </OnyxSidebarActionV2>
            <OnyxSidebarActionV2 folded={folded} href={newSessionHref} icon={SvgCraftBoxV2}>
              创作
            </OnyxSidebarActionV2>
          </div>
        </div>
      </div>

      <div className="onyx-sidebar-v2-scroll onyx-donor-sidebar-scroll">
        <section className="onyx-sidebar-v2-section onyx-donor-sidebar-section onyx-native-donor-sidebar-section-card" data-testid="onyx-native-donor-sidebar-section-card-智能体">
          <div className="onyx-sidebar-v2-section-title onyx-donor-sidebar-section-header" data-testid="onyx-donor-sidebar-section-header-智能体">
            智能体
          </div>
          <div className="v2-sidebar-list onyx-donor-agent-list" data-testid="onyx-donor-agent-list">
            <OnyxSidebarActionV2 folded={folded} href={newSessionHref} icon={SvgSparkleV2} testId="onyx-donor-agent-item">
              探索智能体
            </OnyxSidebarActionV2>
          </div>
        </section>

        <section className="onyx-sidebar-v2-section onyx-donor-sidebar-section onyx-native-donor-sidebar-section-card" data-testid="onyx-native-donor-sidebar-section-card-项目">
          <div className="onyx-sidebar-v2-section-title onyx-donor-sidebar-section-header" data-testid="onyx-donor-sidebar-section-header-项目">
            项目
          </div>
          <div className="v2-sidebar-list onyx-donor-project-list" data-testid="onyx-donor-project-list">
            <OnyxSidebarActionV2 folded={folded} href={newSessionHref} icon={SvgFolderV2}>
              新建项目
            </OnyxSidebarActionV2>
          </div>
        </section>

        <section className="onyx-sidebar-v2-section onyx-sidebar-v2-recents onyx-donor-sidebar-section onyx-native-donor-sidebar-section-card" data-testid="onyx-native-donor-sidebar-section-card-最近">
          <div className="onyx-sidebar-v2-section-title onyx-donor-sidebar-section-header" data-testid="onyx-donor-sidebar-section-header-最近">
            最近
          </div>
          <AskConversationSidebarV2
            activeXpertId={activeXpertId}
            activeConversationId={activeConversationId}
            preferActiveConversationFallback={preferActiveConversationFallback}
            handoff={handoff}
          />
        </section>
      </div>

      <div
        className="onyx-sidebar-v2-footer onyx-donor-sidebar-footer onyx-native-donor-sidebar-footer-card"
        data-testid="onyx-native-donor-sidebar-footer-card"
      >
        <div className="onyx-native-donor-sidebar-footer-stack" data-testid="onyx-donor-sidebar-footer">
          <OnyxSidebarActionV2 folded={folded} icon={SvgGearV2} type="button">
            管理后台
          </OnyxSidebarActionV2>
          <button className="onyx-sidebar-v2-account onyx-donor-sidebar-account" data-testid="onyx-donor-sidebar-account" type="button">
            <span className="onyx-sidebar-v2-account-avatar">用</span>
            <span className="onyx-sidebar-v2-account-label">用户</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

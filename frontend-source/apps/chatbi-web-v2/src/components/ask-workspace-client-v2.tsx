'use client'

import { useMemo, useState } from 'react'
import { frontendPlatformAdapter } from '@/lib/platform-adapter-bridge'
import { useChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'
import { OnyxAppFrameV2 } from './onyx/onyx-app-frame-v2'
import { OnyxChatPageV2 } from './onyx/onyx-chat-page-v2'
import { OnyxSidebarV2 } from './onyx/onyx-sidebar-v2'
import { OnyxSourceRailV2 } from './onyx/onyx-source-rail-v2'

type SourceRailItem = {
  id: string
  title: string
  body: string
  eyebrow?: string
  meta?: string
  kind?: 'document' | 'mail' | 'chat' | 'insight' | 'search'
}

export type AskWorkspaceClientV2Props = {
  activeXpertId?: string
  modelId?: string
  initialConversationId?: string
  mockChatScenario?: string
  mockChatLatencyMs?: number
  handoff: {
    queryLogId?: string
    traceKey?: string
    analysisDraft?: string
  }
  shellAnchors: {
    askThreadStage: string
    askDiagnosticsDrawer: string
    askComposerDock: string
  }
}

function buildSourceRailItems(input: {
  activeXpertId?: string
  conversationId?: string
  queryLogId?: string
  traceKey?: string
}): SourceRailItem[] {
  const items: SourceRailItem[] = []

  const conversationResource = frontendPlatformAdapter.resources.build('ask-conversations', {
    xpertId: input.activeXpertId ?? 'default-workspace'
  })
  items.push({
    id: conversationResource.id,
    title: '会话记录',
    eyebrow: '工作区知识',
    body: input.activeXpertId
      ? `${input.activeXpertId} 工作区内保存的会话、追问和历史推理上下文。`
      : '默认工作区内保存的会话和历史推理上下文。',
    meta: conversationResource.path,
    kind: 'chat'
  })

  const toolsetResource = frontendPlatformAdapter.resources.build('xpert-toolset-by-workspace', {
    workspaceId: input.activeXpertId ?? 'default-workspace'
  })
  items.push({
    id: toolsetResource.id,
    title: '工作区工具集',
    eyebrow: '平台适配',
    body: '实时问答运行时可调用的操作工具、图表动作和追问能力。',
    meta: toolsetResource.path,
    kind: 'insight'
  })

  const storiesResource = frontendPlatformAdapter.resources.build('stories')
  items.push({
    id: storiesResource.id,
    title: '故事与洞察',
    eyebrow: '产品界面',
    body: '可接收问答结果的叙事输出、洞察草稿和下游分析界面。',
    meta: storiesResource.path,
    kind: 'document'
  })

  if (input.conversationId) {
    const analysisConversationResource = frontendPlatformAdapter.resources.build('analysis-conversations', {
      conversationId: input.conversationId
    })
    items.push({
      id: analysisConversationResource.id,
      title: '当前会话',
      eyebrow: '实时会话状态',
      body: '支撑当前问答会话的会话记录、运行状态和消息时间线。',
      meta: analysisConversationResource.path,
      kind: 'search'
    })
  }

  if (input.queryLogId) {
    items.push({
      id: 'query-log',
      title: '查询日志引用',
      eyebrow: '证据链接',
      body: '当前问答流程中捕获的关联分析证据。',
      meta: input.queryLogId,
      kind: 'document'
    })
  }

  if (input.traceKey) {
    items.push({
      id: 'trace-key',
      title: '链路追踪引用',
      eyebrow: '运行追踪',
      body: '与本次问答响应和图表渲染路径关联的执行追踪。',
      meta: input.traceKey,
      kind: 'mail'
    })
  }

  return items
}

export function AskWorkspaceClientV2({
  activeXpertId,
  initialConversationId,
  mockChatScenario,
  mockChatLatencyMs,
  handoff,
  shellAnchors
}: AskWorkspaceClientV2Props) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sourceRailOpen = useChatSourceRailStore(state => state.isRailOpen)

  const railItems = useMemo(
    () =>
      buildSourceRailItems({
        activeXpertId,
        conversationId,
        queryLogId: handoff.queryLogId,
        traceKey: handoff.traceKey
      }),
    [activeXpertId, conversationId, handoff.queryLogId, handoff.traceKey]
  )
  const sidebarRenderKey = `${activeXpertId ?? 'default-workspace'}:${conversationId ?? 'new-session'}`
  const preferActiveConversationFallback = !initialConversationId && Boolean(conversationId)

  return (
    <OnyxAppFrameV2
      sidebarCollapsed={sidebarCollapsed}
      sourceRailOpen={sourceRailOpen}
      sidebar={
        <OnyxSidebarV2
          key={sidebarRenderKey}
          activeXpertId={activeXpertId}
          activeConversationId={conversationId}
          folded={sidebarCollapsed}
          preferActiveConversationFallback={preferActiveConversationFallback}
          handoff={handoff}
          onToggleSidebar={() => {
            setSidebarCollapsed(current => !current)
          }}
        />
      }
      main={
        <OnyxChatPageV2
          activeXpertId={activeXpertId}
          initialConversationId={conversationId}
          mockChatScenario={mockChatScenario}
          mockChatLatencyMs={mockChatLatencyMs}
          handoff={handoff}
          onConversationIdChange={setConversationId}
          shellAnchors={shellAnchors}
        />
      }
      rail={<OnyxSourceRailV2 items={railItems} />}
    />
  )
}

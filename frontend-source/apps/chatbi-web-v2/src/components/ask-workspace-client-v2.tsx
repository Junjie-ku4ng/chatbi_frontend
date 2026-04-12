'use client'

import { useMemo, useState } from 'react'
import { frontendPlatformAdapter } from '@/lib/platform-adapter-bridge'
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
    title: 'Conversation Sessions',
    eyebrow: 'Workspace knowledge',
    body: input.activeXpertId
      ? `Saved Ask sessions, follow-ups, and prior reasoning context for the ${input.activeXpertId} workspace.`
      : 'Saved Ask sessions and prior reasoning context for the default workspace.',
    meta: conversationResource.path,
    kind: 'chat'
  })

  const toolsetResource = frontendPlatformAdapter.resources.build('xpert-toolset-by-workspace', {
    workspaceId: input.activeXpertId ?? 'default-workspace'
  })
  items.push({
    id: toolsetResource.id,
    title: 'Workspace Toolset',
    eyebrow: 'Platform adapter',
    body: 'Operational tools, chart actions, and follow-up capabilities exposed to the live Ask runtime.',
    meta: toolsetResource.path,
    kind: 'insight'
  })

  const storiesResource = frontendPlatformAdapter.resources.build('stories')
  items.push({
    id: storiesResource.id,
    title: 'Stories & Insight',
    eyebrow: 'Product surface',
    body: 'Saved narrative outputs, insight drafts, and downstream analytical surfaces that can receive Ask results.',
    meta: storiesResource.path,
    kind: 'document'
  })

  if (input.conversationId) {
    const analysisConversationResource = frontendPlatformAdapter.resources.build('analysis-conversations', {
      conversationId: input.conversationId
    })
    items.push({
      id: analysisConversationResource.id,
      title: 'Current Conversation',
      eyebrow: 'Live conversation state',
      body: 'Current conversation record, runtime state, and message timeline backing the active Ask session.',
      meta: analysisConversationResource.path,
      kind: 'search'
    })
  }

  if (input.queryLogId) {
    items.push({
      id: 'query-log',
      title: 'Query Log Reference',
      eyebrow: 'Evidence link',
      body: 'Linked analytical evidence captured during the current Ask flow.',
      meta: input.queryLogId,
      kind: 'document'
    })
  }

  if (input.traceKey) {
    items.push({
      id: 'trace-key',
      title: 'Trace Reference',
      eyebrow: 'Ops trace',
      body: 'Operational execution trace associated with this Ask response and chart rendering path.',
      meta: input.traceKey,
      kind: 'mail'
    })
  }

  return items
}

export function AskWorkspaceClientV2({
  activeXpertId,
  initialConversationId,
  handoff,
  shellAnchors
}: AskWorkspaceClientV2Props) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)

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
      sidebar={
        <OnyxSidebarV2
          key={sidebarRenderKey}
          activeXpertId={activeXpertId}
          activeConversationId={conversationId}
          preferActiveConversationFallback={preferActiveConversationFallback}
          handoff={handoff}
        />
      }
      main={
        <OnyxChatPageV2
          activeXpertId={activeXpertId}
          initialConversationId={conversationId}
          handoff={handoff}
          onConversationIdChange={setConversationId}
          shellAnchors={shellAnchors}
        />
      }
      rail={<OnyxSourceRailV2 items={railItems} />}
    />
  )
}

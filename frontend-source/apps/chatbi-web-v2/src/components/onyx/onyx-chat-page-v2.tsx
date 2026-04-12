import { AskRuntimeShellV2 } from '@/components/ask-runtime-shell-v2'
import { SvgBubbleTextV2, SvgChevronDownV2 } from '@/components/onyx/icons'

type OnyxChatPageV2Props = {
  activeXpertId?: string
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
  onConversationIdChange?: (conversationId?: string) => void
}

export function OnyxChatPageV2({
  activeXpertId,
  initialConversationId,
  handoff,
  shellAnchors,
  onConversationIdChange
}: OnyxChatPageV2Props) {
  return (
    <section className="onyx-chat-page-v2">
      <header className="onyx-chat-page-v2-header">
        <div className="onyx-chat-page-v2-title-row">
          <span className="onyx-chat-page-v2-title-badge">
            <span className="onyx-chat-page-v2-title-icon">
              <SvgBubbleTextV2 className="h-4 w-4" />
            </span>
            <span>对话</span>
            <SvgChevronDownV2 className="h-3.5 w-3.5" />
          </span>
        </div>
      </header>

      <div className="onyx-chat-page-v2-body">
        <AskRuntimeShellV2
          activeXpertId={activeXpertId}
          initialConversationId={initialConversationId}
          handoff={handoff}
          onConversationIdChange={onConversationIdChange}
          shellAnchors={shellAnchors}
          renderRail={false}
        />
      </div>
    </section>
  )
}

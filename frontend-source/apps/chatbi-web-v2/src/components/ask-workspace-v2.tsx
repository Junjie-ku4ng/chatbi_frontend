import { frontendPlatformAdapter } from '@/lib/platform-adapter-bridge'
import { AnalyticalCardRuntimeBootstrap } from '@/modules/chat/components/answer-components/analytical-card-runtime-bootstrap'
import { resolveAskHarnessXpertId } from '@/modules/chat/runtime/ask-harness'
import { AskWorkspaceClientV2 } from './ask-workspace-client-v2'

type AskWorkspaceV2Props = {
  searchParams: Record<string, string | string[] | undefined>
}

type SearchParams = AskWorkspaceV2Props['searchParams']

function readSearchParam(input: SearchParams, key: string) {
  const value = input[key]
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }
  return undefined
}

export function AskWorkspaceV2({ searchParams }: AskWorkspaceV2Props) {
  const shell = frontendPlatformAdapter.ask.resolveShellContract()
  const activeXpertId = resolveAskHarnessXpertId(readSearchParam(searchParams, 'xpertId'))
  const modelId = readSearchParam(searchParams, 'modelId')
  const initialConversationId = readSearchParam(searchParams, 'conversationId')
  const handoff = {
    queryLogId: readSearchParam(searchParams, 'queryLogId'),
    traceKey: readSearchParam(searchParams, 'traceKey'),
    analysisDraft: readSearchParam(searchParams, 'analysisDraft')
  }

  return (
    <>
      <AnalyticalCardRuntimeBootstrap activeXpertId={activeXpertId} modelId={modelId} />
      <AskWorkspaceClientV2
        activeXpertId={activeXpertId}
        initialConversationId={initialConversationId}
        handoff={handoff}
        modelId={modelId}
        shellAnchors={{
          askThreadStage: shell.anchors.askThreadStage,
          askDiagnosticsDrawer: shell.anchors.askDiagnosticsDrawer,
          askComposerDock: shell.anchors.askComposerDock
        }}
      />
    </>
  )
}

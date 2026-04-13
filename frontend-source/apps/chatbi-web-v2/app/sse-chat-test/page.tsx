import { AskWorkspaceV2 } from '@/components/ask-workspace-v2'

type SseChatTestPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readSearchParam(input: Record<string, string | string[] | undefined>, key: string) {
  const value = input[key]
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }
  return undefined
}

export default async function SseChatTestPage(props: SseChatTestPageProps) {
  const searchParams = await props.searchParams
  const mockChatScenario = readSearchParam(searchParams, 'mockChatScenario') ?? 'chart'
  const mockChatLatencyMs = readSearchParam(searchParams, 'mockChatLatencyMs') ?? '260'

  return (
    <AskWorkspaceV2
      searchParams={{
        ...searchParams,
        mockChatScenario,
        mockChatLatencyMs
      }}
    />
  )
}

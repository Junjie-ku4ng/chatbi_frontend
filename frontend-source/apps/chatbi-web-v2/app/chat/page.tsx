import { AskWorkspaceV2 } from '@/components/ask-workspace-v2'

type ChatPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ChatPage(props: ChatPageProps) {
  const searchParams = await props.searchParams
  return <AskWorkspaceV2 searchParams={searchParams} />
}

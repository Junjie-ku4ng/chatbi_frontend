import { redirect } from 'next/navigation'

type RedirectSearchParams = Record<string, string | string[] | undefined>

function createQueryParams(searchParams: RedirectSearchParams) {
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      queryParams.append(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        queryParams.append(key, item)
      }
    }
  }
  return queryParams
}

type ChatProjectConversationPageProps = {
  params: Promise<{
    id: string
    conversationId: string
  }>
  searchParams: Promise<RedirectSearchParams>
}

export default async function ChatProjectConversationPage({ params, searchParams }: ChatProjectConversationPageProps) {
  const [{ id, conversationId }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const queryParams = createQueryParams(resolvedSearchParams)
  queryParams.set('projectId', id)
  queryParams.set('conversationId', conversationId)
  redirect(`/chat?${queryParams.toString()}`)
}

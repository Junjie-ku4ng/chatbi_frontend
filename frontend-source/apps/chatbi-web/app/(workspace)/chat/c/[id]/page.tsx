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

type ChatConversationPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<RedirectSearchParams>
}

export default async function ChatConversationPage({ params, searchParams }: ChatConversationPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const queryParams = createQueryParams(resolvedSearchParams)
  queryParams.set('conversationId', id)
  redirect(`/chat?${queryParams.toString()}`)
}

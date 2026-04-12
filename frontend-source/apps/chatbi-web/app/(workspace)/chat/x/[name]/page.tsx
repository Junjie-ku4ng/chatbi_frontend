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

type ChatNamespacePageProps = {
  params: Promise<{
    name: string
  }>
  searchParams: Promise<RedirectSearchParams>
}

export default async function ChatNamespacePage({ params, searchParams }: ChatNamespacePageProps) {
  const [{ name }, resolvedSearchParams] = await Promise.all([params, searchParams])
  void name
  const query = createQueryParams(resolvedSearchParams).toString()
  redirect(query ? `/chat?${query}` : '/chat')
}

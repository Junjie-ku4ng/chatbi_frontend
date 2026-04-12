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

type ChatProjectPageProps = {
  searchParams: Promise<RedirectSearchParams>
}

export default async function ChatProjectPage({ searchParams }: ChatProjectPageProps) {
  const resolvedSearchParams = await searchParams
  const query = createQueryParams(resolvedSearchParams).toString()
  redirect(query ? `/chat?${query}` : '/chat')
}

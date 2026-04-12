export type PagingInput = {
  cursor?: number
  offset?: number
  limit?: number
}

export function appendPagingQuery(query: URLSearchParams, paging?: PagingInput) {
  if (!paging) return
  if (typeof paging.cursor === 'number') query.set('cursor', String(paging.cursor))
  if (typeof paging.limit === 'number') query.set('limit', String(paging.limit))
  if (typeof paging.offset === 'number') query.set('offset', String(paging.offset))
}

export type PagingCursorEnvelope<T> = {
  items: T[]
  total?: number
  nextCursor?: string | null
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
}

export type PagingWindowState<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

export function toPagingWindowState<T>(page: PagingCursorEnvelope<T>): PagingWindowState<T> {
  const items = Array.isArray(page.items) ? page.items : []
  const nextCursor = normalizeCursorValue(page.nextCursor) ?? inferNextCursorFromPage(page)
  return {
    items,
    nextCursor,
    hasMore: nextCursor !== null,
    total: typeof page.total === 'number' ? page.total : undefined
  }
}

export function mergePagingItems<T>(
  current: T[],
  incoming: T[],
  getKey: (item: T) => string
): T[] {
  if (!Array.isArray(current) || current.length === 0) {
    return Array.isArray(incoming) ? incoming : []
  }
  const merged = [...current]
  const seen = new Set(current.map(item => getKey(item)))
  for (const item of incoming ?? []) {
    const key = getKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export function inferNextCursorFromPage(page: Pick<PagingCursorEnvelope<unknown>, 'total' | 'offset' | 'limit' | 'page' | 'pageSize' | 'items'>) {
  const itemCount = Array.isArray(page.items) ? page.items.length : 0
  if (typeof page.total !== 'number') {
    return itemCount > 0 ? null : null
  }
  const effectiveLimit =
    typeof page.limit === 'number'
      ? page.limit
      : typeof page.pageSize === 'number'
        ? page.pageSize
        : undefined
  let effectiveOffset = typeof page.offset === 'number' ? page.offset : undefined
  if (effectiveOffset === undefined && typeof page.page === 'number' && typeof page.pageSize === 'number') {
    effectiveOffset = Math.max(0, (Math.floor(page.page) - 1) * Math.floor(page.pageSize))
  }
  if (effectiveOffset === undefined || effectiveLimit === undefined) {
    return null
  }
  const next = effectiveOffset + itemCount
  return next < page.total ? String(next) : null
}

function normalizeCursorValue(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  return normalized
}

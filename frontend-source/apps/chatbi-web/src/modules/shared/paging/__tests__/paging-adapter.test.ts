import { describe, expect, it } from 'vitest'
import { inferNextCursorFromPage, mergePagingItems, toPagingWindowState } from '../paging-adapter'

describe('paging-adapter', () => {
  it('normalizes explicit nextCursor and hasMore', () => {
    const state = toPagingWindowState({
      items: [{ id: '1' }],
      total: 10,
      nextCursor: '2'
    })
    expect(state.items).toHaveLength(1)
    expect(state.nextCursor).toBe('2')
    expect(state.hasMore).toBe(true)
  })

  it('infers nextCursor from offset + limit when explicit nextCursor missing', () => {
    const inferred = inferNextCursorFromPage({
      items: [{ id: '1' }, { id: '2' }],
      total: 5,
      offset: 0,
      limit: 2
    })
    expect(inferred).toBe('2')
  })

  it('returns null cursor when page reaches total', () => {
    const inferred = inferNextCursorFromPage({
      items: [{ id: '1' }, { id: '2' }],
      total: 2,
      offset: 0,
      limit: 2
    })
    expect(inferred).toBeNull()
  })

  it('deduplicates merged items by key', () => {
    const merged = mergePagingItems(
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'b' }, { id: 'c' }],
      item => item.id
    )
    expect(merged.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })
})

import { describe, expect, it } from 'vitest'
import { compareRecencyDescThenId, compareSortOrderThenId } from '@/modules/story/sorting'

describe('story sorting helpers', () => {
  it('sorts by sortOrder then UUID id without numeric casts', () => {
    const items = [
      { id: 'f0000000-0000-4000-8000-000000000003', sortOrder: 1 },
      { id: 'a0000000-0000-4000-8000-000000000001', sortOrder: 0 },
      { id: 'b0000000-0000-4000-8000-000000000002', sortOrder: 1 }
    ]

    const sorted = [...items].sort(compareSortOrderThenId)

    expect(sorted.map(item => item.id)).toEqual([
      'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002',
      'f0000000-0000-4000-8000-000000000003'
    ])
  })

  it('sorts stories by recency desc and falls back to id desc', () => {
    const stories = [
      {
        id: 'a0000000-0000-4000-8000-000000000001',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'f0000000-0000-4000-8000-000000000006',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'b0000000-0000-4000-8000-000000000002',
        updatedAt: '2026-02-28T23:00:00.000Z'
      }
    ]

    const sorted = [...stories].sort(compareRecencyDescThenId)

    expect(sorted.map(item => item.id)).toEqual([
      'f0000000-0000-4000-8000-000000000006',
      'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002'
    ])
  })
})

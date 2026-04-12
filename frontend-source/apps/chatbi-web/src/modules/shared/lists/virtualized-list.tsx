'use client'

import { ReactNode, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export type VirtualizedListProps<T> = {
  items: T[]
  estimateSize?: number
  overscan?: number
  height?: number
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  getKey?: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
  loadingMoreLabel?: string
}

export function VirtualizedList<T>({
  items,
  estimateSize = 84,
  overscan = 8,
  height = 520,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  getKey,
  renderItem,
  loadingMoreLabel = 'Loading more...'
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowCount = items.length + (hasMore ? 1 : 0)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan
  })
  const virtualItems = virtualizer.getVirtualItems()
  const triggerIndex = useMemo(() => Math.max(0, items.length - 1), [items.length])

  useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) {
      return
    }
    if (virtualItems.some(item => item.index >= triggerIndex)) {
      onLoadMore()
    }
  }, [hasMore, isLoadingMore, onLoadMore, triggerIndex, virtualItems])

  return (
    <div ref={parentRef} style={{ height, overflow: 'auto' }} data-testid="virtualized-list">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualItems.map(virtualItem => {
          const isLoaderRow = virtualItem.index >= items.length
          const item = items[virtualItem.index]
          const key = isLoaderRow
            ? '__loader__'
            : getKey
              ? getKey(item as T, virtualItem.index)
              : `${virtualItem.index}`
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              {isLoaderRow ? (
                <div style={{ padding: '8px 4px', color: 'var(--muted)', fontSize: 12 }}>{loadingMoreLabel}</div>
              ) : (
                renderItem(item as T, virtualItem.index)
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

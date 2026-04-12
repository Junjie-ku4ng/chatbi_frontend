'use client'

import { ReactNode } from 'react'
import { cn } from '../ui/cn'

type Column<T extends Record<string, unknown>> = {
  key: string
  label: string
  render: (row: T) => ReactNode
}

export function OperationalTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  testId,
  emptyLabel = 'No rows'
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  testId?: string
  emptyLabel?: string
}) {
  if (!rows || rows.length === 0) {
    return <span className="state state-empty">{emptyLabel}</span>
  }

  return (
    <div data-testid={testId} className="nx-operational-table-wrap nx-shell-panel">
      <table className="nx-operational-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={() => onRowClick?.(row)}
              className={cn('nx-operational-table-row', onRowClick && 'is-clickable')}
            >
              {columns.map(column => (
                <td key={`${rowKey(row, index)}-${column.key}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

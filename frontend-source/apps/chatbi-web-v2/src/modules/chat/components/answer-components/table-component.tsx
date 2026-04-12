'use client'

import type { AnswerComponentPayload } from './types'

function asRecordArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>
}

export function TableAnswerComponent({ payload }: { payload: AnswerComponentPayload }) {
  const rows = asRecordArray(payload.rows ?? payload.preview)
  const columns = Array.isArray(payload.columns)
    ? (payload.columns as string[])
    : rows.length > 0
      ? Object.keys(rows[0])
      : ['value']

  if (rows.length === 0) {
    return <p className="chat-assistant-answer-empty">No table rows available.</p>
  }

  return (
    <div className="chat-assistant-answer-table-wrap nx-shell-panel">
      <table className="chat-assistant-answer-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map(column => (
                <td key={`${index}-${column}`}>
                  {String(row[column] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

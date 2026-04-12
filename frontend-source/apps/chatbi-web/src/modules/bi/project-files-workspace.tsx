'use client'

import { useMemo, useState } from 'react'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'

type ProjectFileRecord = {
  id: string
  name: string
  size: number
  version: number
  updatedAt: string
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`
  return `${Math.round(size / 1024 / 102.4) / 10} MB`
}

export function ProjectFilesWorkspace() {
  const [records, setRecords] = useState<ProjectFileRecord[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [counter, setCounter] = useState(0)

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [records]
  )

  const onUpload = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setStatus('Select at least one file')
      return
    }

    const now = new Date().toISOString()
    const incoming = Array.from(files)
    setRecords(current => {
      const next = [...current]
      let nextCounter = counter

      for (const file of incoming) {
        const existingIndex = next.findIndex(item => item.name === file.name)
        if (existingIndex >= 0) {
          const previous = next[existingIndex]
          next[existingIndex] = {
            ...previous,
            size: file.size,
            version: previous.version + 1,
            updatedAt: now
          }
          continue
        }

        nextCounter += 1
        next.push({
          id: `file-${nextCounter}`,
          name: file.name,
          size: file.size,
          version: 1,
          updatedAt: now
        })
      }

      setCounter(nextCounter)
      return next
    })

    setStatus(`Uploaded ${incoming.length} file(s)`)
  }

  const removeFile = (id: string) => {
    setRecords(current => current.filter(item => item.id !== id))
    setStatus(`Removed ${id}`)
  }

  return (
    <NexusCard data-testid="project-files-workspace" style={{ padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input data-testid="project-files-upload-input" type="file" multiple onChange={event => onUpload(event.target.files)} />
        <NexusBadge tone="ok" data-testid="project-files-count">
          files: {records.length}
        </NexusBadge>
      </div>

      {status ? (
        <NexusBadge tone="warn" data-testid="project-files-status" style={{ width: 'fit-content' }}>
          {status}
        </NexusBadge>
      ) : null}

      <section data-testid="project-files-table" style={{ display: 'grid', gap: 8 }}>
        {sortedRecords.length === 0 ? (
          <span className="state state-empty">No project files uploaded</span>
        ) : (
          sortedRecords.map(item => (
            <article key={item.id} data-testid={`project-files-row-${item.id}`} className="card" style={{ padding: 10, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{item.name}</strong>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <NexusBadge tone="ok">v{item.version}</NexusBadge>
                  <NexusBadge tone="neutral">{formatSize(item.size)}</NexusBadge>
                  <NexusButton
                    data-testid={`project-files-remove-${item.id}`}
                    type="button"
                    variant="secondary"
                    onClick={() => removeFile(item.id)}
                  >
                    Remove
                  </NexusButton>
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>updated: {item.updatedAt}</span>
            </article>
          ))
        )}
      </section>
    </NexusCard>
  )
}

'use client'

import Link from 'next/link'
import { StatusChip } from '@/modules/shared/chips/status-chip'
import { NexusBadge, NexusCard } from '@/modules/shared/ui/primitives'
import { type ChatTask } from './api'

function resolveStatusTone(status: ChatTask['status']) {
  if (status === 'failed' || status === 'cancelled') return 'danger' as const
  if (status === 'queued' || status === 'running') return 'warn' as const
  return 'ok' as const
}

function formatRuntimeUpdatedAt(value: string) {
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) {
    return value
  }
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function ChatTaskList({
  tasks,
  modelId
}: {
  tasks: ChatTask[]
  modelId?: string
}) {
  return (
    <NexusCard style={{ padding: 12, display: 'grid', gap: 8 }}>
      {tasks.map(task => (
        <NexusCard
          key={task.id}
          data-testid={`chat-task-row-${task.id}`}
          style={{ padding: 10, borderRadius: 10, display: 'grid', gap: 8 }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{task.title}</strong>
            <StatusChip
              testId={`chat-task-status-${task.id}`}
              value={task.status}
              tone={resolveStatusTone(task.status)}
            />
            <NexusBadge tone="neutral">progress: {task.progress}%</NexusBadge>
            <NexusBadge tone="ok">retry: {task.retryCount}</NexusBadge>
            {task.runtimeUpdatedAt ? (
              <NexusBadge data-testid={`chat-task-runtime-updated-${task.id}`} tone="brand">
                live: {formatRuntimeUpdatedAt(task.runtimeUpdatedAt)}
              </NexusBadge>
            ) : null}
          </div>
          {task.detail ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>{task.detail}</span> : null}
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            source: {task.sourceType} · trace: {task.traceKey ?? '-'} · conversation: {task.conversationId ?? '-'}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link data-testid={`chat-task-open-${task.id}`} href={`/chat/tasks/${encodeURIComponent(task.id)}${modelId ? `?modelId=${encodeURIComponent(modelId)}` : ''}`}>
              <NexusBadge tone="brand">Open</NexusBadge>
            </Link>
          </div>
        </NexusCard>
      ))}
    </NexusCard>
  )
}

'use client'

import Link from 'next/link'
import { StatusChip } from '@/modules/shared/chips/status-chip'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'
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

export function ChatTaskDetail({
  task,
  statusMessage,
  retrying,
  onRetry
}: {
  task: ChatTask
  statusMessage?: string | null
  retrying?: boolean
  onRetry?: () => void
}) {
  return (
    <NexusCard style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong data-testid="chat-task-detail-title" style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>
          {task.title}
        </strong>
        <StatusChip
          testId="chat-task-detail-status"
          value={task.status}
          tone={resolveStatusTone(task.status)}
        />
      </div>
      {task.detail ? <p style={{ margin: 0, color: 'var(--muted)' }}>{task.detail}</p> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <NexusBadge data-testid="chat-task-detail-retry-count" tone="ok">
          {task.retryCount}
        </NexusBadge>
        <NexusBadge tone="neutral">progress: {task.progress}%</NexusBadge>
        <NexusBadge tone="neutral">source: {task.sourceType}</NexusBadge>
        {task.runtimeUpdatedAt ? (
          <NexusBadge data-testid="chat-task-detail-runtime-updated" tone="brand">
            live: {formatRuntimeUpdatedAt(task.runtimeUpdatedAt)}
          </NexusBadge>
        ) : null}
        {task.errorMessage ? <NexusBadge tone="danger">error: {task.errorMessage}</NexusBadge> : null}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <NexusButton
          data-testid="chat-task-retry-submit"
          type="button"
          onClick={onRetry}
          disabled={!onRetry || retrying}
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </NexusButton>
        <Link href={`/chat/tasks?modelId=${encodeURIComponent(task.modelId)}`}>
          <NexusBadge tone="neutral">Back to list</NexusBadge>
        </Link>
        {task.traceKey ? (
          <Link href={`/ops/traces/${encodeURIComponent(task.traceKey)}`}>
            <NexusBadge tone="brand">Trace</NexusBadge>
          </Link>
        ) : null}
        {task.conversationId ? (
          <Link href={`/chat?conversationId=${encodeURIComponent(task.conversationId)}`}>
            <NexusBadge tone="brand">Conversation</NexusBadge>
          </Link>
        ) : null}
      </div>
      {statusMessage ? <NexusBadge tone="neutral">{statusMessage}</NexusBadge> : null}
      <AdvancedJsonPanel testId="chat-task-detail-payload-json" title="Payload" value={task.payload ?? {}} />
      <AdvancedJsonPanel testId="chat-task-detail-result-json" title="Result Payload" value={task.resultPayload ?? {}} />
      <AdvancedJsonPanel testId="chat-task-detail-metadata-json" title="Metadata" value={task.metadata ?? {}} />
    </NexusCard>
  )
}

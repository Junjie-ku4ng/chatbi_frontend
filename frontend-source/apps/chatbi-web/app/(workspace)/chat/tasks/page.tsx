'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import { useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import {
  listChatTasks,
  mergeChatTaskWithRuntimeHint,
  resolveRuntimeHintForChatTask,
  type ChatTaskStatus
} from '@/modules/chat/tasks/api'
import { ChatTaskList } from '@/modules/chat/tasks/task-list'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusCard, NexusInput, NexusSelect } from '@/modules/shared/ui/primitives'

const pageSize = 20

export default function ChatTasksPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [status, setStatus] = useState<'all' | ChatTaskStatus>('all')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)

  const modelsQuery = useQuery({
    queryKey: ['chat-task-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const modelFromQuery = params.get('modelId')
    const statusFromQuery = params.get('status')
    const queryFromQuery = params.get('q')
    if (modelFromQuery) setModelId(modelFromQuery)
    if (statusFromQuery && (statusFromQuery === 'queued' || statusFromQuery === 'running' || statusFromQuery === 'succeeded' || statusFromQuery === 'failed' || statusFromQuery === 'cancelled')) {
      setStatus(statusFromQuery)
    }
    if (queryFromQuery) setQuery(queryFromQuery)
  }, [])

  const tasksQuery = useQuery({
    queryKey: ['chat-tasks', activeModelId, status, query, offset],
    enabled: Boolean(activeModelId),
    queryFn: () =>
      listChatTasks({
        modelId: activeModelId as string,
        status: status === 'all' ? undefined : status,
        q: query.trim() || undefined,
        limit: pageSize,
        offset
      })
  })

  const taskRuntimeHintsByConversationId = useChatRuntimeStore(state => state.taskRuntimeHintsByConversationId)
  const taskRuntimeHintsByTraceKey = useChatRuntimeStore(state => state.taskRuntimeHintsByTraceKey)
  const taskRuntimeHintsByTaskId = useChatRuntimeStore(state => state.taskRuntimeHintsByTaskId)

  const tasks = useMemo(() => {
    const baseItems = tasksQuery.data?.items ?? []
    if (baseItems.length === 0) {
      return baseItems
    }
    return baseItems.map(task =>
      mergeChatTaskWithRuntimeHint(
        task,
        resolveRuntimeHintForChatTask(task, {
          byTaskId: taskRuntimeHintsByTaskId,
          byConversationId: taskRuntimeHintsByConversationId,
          byTraceKey: taskRuntimeHintsByTraceKey
        })
      )
    )
  }, [
    taskRuntimeHintsByConversationId,
    taskRuntimeHintsByTaskId,
    taskRuntimeHintsByTraceKey,
    tasksQuery.data?.items
  ])

  const total = tasksQuery.data?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + pageSize < total

  const pageLabel = useMemo(() => {
    if (total === 0) return '0 / 0'
    const start = offset + 1
    const end = Math.min(offset + tasks.length, total)
    return `${start}-${end} / ${total}`
  }, [offset, tasks.length, total])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <NexusCard style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Chat Tasks</strong>
          <form
            data-testid="chat-task-filter-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              setOffset(0)
              void tasksQuery.refetch()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <NexusSelect
              data-testid="chat-task-model-select"
              value={activeModelId ?? ''}
              onChange={event => {
                setModelId(event.target.value)
                setOffset(0)
              }}
              style={{ minWidth: 220 }}
            >
              {(modelsQuery.data ?? []).map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </NexusSelect>
            <NexusSelect
              data-testid="chat-task-status-filter"
              value={status}
              onChange={event => {
                setStatus(event.target.value as 'all' | ChatTaskStatus)
                setOffset(0)
              }}
            >
              <option value="all">all status</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="succeeded">succeeded</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </NexusSelect>
            <NexusInput
              data-testid="chat-task-query-filter"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="title / trace / conversation"
              style={{ minWidth: 240 }}
            />
            <NexusButton
              data-testid="chat-task-refresh"
              type="submit"
            >
              Refresh
            </NexusButton>
          </form>
          <NexusBadge data-testid="chat-task-page-label" tone="neutral" style={{ width: 'fit-content' }}>
            {pageLabel}
          </NexusBadge>
        </NexusCard>

        <LoadablePanel
          loading={tasksQuery.isLoading}
          error={tasksQuery.error}
          empty={tasks.length === 0}
          loadingLabel="Loading chat tasks..."
          emptyLabel="No chat tasks"
          retry={() => {
            void tasksQuery.refetch()
          }}
        >
          <section style={{ display: 'grid', gap: 8 }}>
            <ChatTaskList tasks={tasks} modelId={activeModelId} />
            <div style={{ display: 'flex', gap: 8 }}>
              <NexusButton
                data-testid="chat-task-prev"
                type="button"
                disabled={!canPrev}
                onClick={() => setOffset(current => Math.max(0, current - pageSize))}
              >
                Prev
              </NexusButton>
              <NexusButton
                data-testid="chat-task-next"
                type="button"
                disabled={!canNext}
                onClick={() => setOffset(current => current + pageSize)}
              >
                Next
              </NexusButton>
            </div>
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import {
  getChatTask,
  mergeChatTaskWithRuntimeHint,
  resolveRuntimeHintForChatTask,
  retryChatTask
} from '@/modules/chat/tasks/api'
import { ChatTaskDetail } from '@/modules/chat/tasks/task-detail'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function ChatTaskDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const taskQuery = useQuery({
    queryKey: ['chat-task-detail', id],
    enabled: Boolean(id),
    queryFn: () => getChatTask(id)
  })

  const retryMutation = useMutation({
    mutationFn: async () => retryChatTask(id),
    onSuccess: async payload => {
      setStatusMessage(`Task retried: ${payload.status}`)
      await taskQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Retry failed')
    }
  })

  const taskRuntimeHintsByConversationId = useChatRuntimeStore(state => state.taskRuntimeHintsByConversationId)
  const taskRuntimeHintsByTraceKey = useChatRuntimeStore(state => state.taskRuntimeHintsByTraceKey)
  const taskRuntimeHintsByTaskId = useChatRuntimeStore(state => state.taskRuntimeHintsByTaskId)

  const mergedTask = useMemo(() => {
    if (!taskQuery.data) {
      return null
    }
    const hint = resolveRuntimeHintForChatTask(taskQuery.data, {
      byTaskId: taskRuntimeHintsByTaskId,
      byConversationId: taskRuntimeHintsByConversationId,
      byTraceKey: taskRuntimeHintsByTraceKey
    })
    return mergeChatTaskWithRuntimeHint(taskQuery.data, hint)
  }, [taskQuery.data, taskRuntimeHintsByConversationId, taskRuntimeHintsByTaskId, taskRuntimeHintsByTraceKey])

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <LoadablePanel
        loading={taskQuery.isLoading}
        error={taskQuery.error}
        empty={!taskQuery.data}
        loadingLabel="Loading chat task detail..."
        emptyLabel="Task not found"
        retry={() => {
          void taskQuery.refetch()
        }}
      >
        {mergedTask ? (
          <ChatTaskDetail
            task={mergedTask}
            statusMessage={statusMessage}
            retrying={retryMutation.isPending}
            onRetry={() => retryMutation.mutate()}
          />
        ) : null}
      </LoadablePanel>
    </AccessGuard>
  )
}

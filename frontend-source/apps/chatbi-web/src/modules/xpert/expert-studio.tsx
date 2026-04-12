'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { runXpertRuntimeControlTransport } from '@/modules/chat/runtime/runtime-control-transport'
import { useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'
import { useWorkbenchMachine } from '@/modules/shared/workbench/workbench-machine'
import { mapExecutionViewModel, mapStateViewModel } from './expert-studio-mapper'
import {
  getExpertExecutionLog,
  getExpertExecutionState,
  listExpertExecutions,
  type ExpertExecutionLogRecord,
  type ExpertExecutionRecord
} from './workspace-api'

type WorkflowNode = {
  id: string
  depth: number
  title: string
  status: string
  tokens?: number
  elapsedTime?: number
  error?: string
  raw: ExpertExecutionRecord
}

function flattenWorkflowNodes(input: ExpertExecutionRecord, depth = 0): WorkflowNode[] {
  const title = input.title || input.agentKey || input.type || input.category || input.id
  const own: WorkflowNode = {
    id: input.id,
    depth,
    title,
    status: input.status || 'unknown',
    tokens: input.totalTokens ?? input.tokens,
    elapsedTime: input.elapsedTime,
    error: input.error,
    raw: input
  }

  if (!input.subExecutions?.length) {
    return [own]
  }

  return [own, ...input.subExecutions.flatMap(item => flattenWorkflowNodes(item, depth + 1))]
}

function summarizeToolset(state: Record<string, unknown> | undefined, log: ExpertExecutionLogRecord | null | undefined) {
  const toolKeys = new Set<string>()
  if (state) {
    for (const key of Object.keys(state)) {
      if (/tool|tools|actions|plugins|mcp/i.test(key)) {
        toolKeys.add(key)
      }
    }
  }

  for (const message of log?.messages ?? []) {
    if (message && typeof message === 'object' && !Array.isArray(message)) {
      const record = message as Record<string, unknown>
      const name = typeof record.name === 'string' ? record.name : typeof record.type === 'string' ? record.type : undefined
      if (name && /tool|action|plugin|mcp/i.test(name)) {
        toolKeys.add(name)
      }
    }
  }

  return Array.from(toolKeys)
}

type MessageTimelineItem = {
  id: string
  role: string
  text: string
  ts: string | undefined
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function normalizeMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item
        const record = asRecord(item)
        if (!record) return ''
        if (typeof record.text === 'string') return record.text
        if (typeof record.content === 'string') return record.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  const record = asRecord(content)
  if (!record) return ''
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  if (record.content !== undefined) {
    return normalizeMessageText(record.content)
  }
  return ''
}

function normalizeMessageTimeline(messages: unknown[] | undefined): MessageTimelineItem[] {
  if (!messages?.length) {
    return []
  }
  return messages
    .map((message, index) => {
      const record = asRecord(message)
      if (!record) {
        return null
      }
      const id = typeof record.id === 'string' ? record.id : `message-${index + 1}`
      const role = typeof record.role === 'string' ? record.role : typeof record.type === 'string' ? record.type : 'unknown'
      const text = normalizeMessageText(record.content ?? record.text ?? record.data)
      const ts = typeof record.createdAt === 'string' ? record.createdAt : typeof record.ts === 'string' ? record.ts : undefined
      return {
        id,
        role,
        text: text || '(empty)',
        ts
      } satisfies MessageTimelineItem
    })
    .filter((item): item is MessageTimelineItem => item !== null)
}

function toPrettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

function normalizeRuntimePhase(value: string | undefined) {
  const normalized = value?.toLowerCase()
  if (!normalized) {
    return undefined
  }
  if (normalized === 'running' || normalized === 'queued' || normalized === 'planning' || normalized === 'executing') {
    return 'running' as const
  }
  if (
    normalized === 'paused' ||
    normalized === 'interrupt' ||
    normalized === 'interrupted' ||
    normalized === 'await_user_confirmation'
  ) {
    return 'paused' as const
  }
  if (normalized === 'error' || normalized === 'failed' || normalized === 'fail') {
    return 'error' as const
  }
  if (normalized === 'success' || normalized === 'done' || normalized === 'completed' || normalized === 'cancelled') {
    return 'done' as const
  }
  return 'idle' as const
}

function resolvePendingToolCallIds(input: {
  pendingActionCount: number
  toolCalls: Array<{ id: string; status: string }>
}) {
  if (input.pendingActionCount <= 0) {
    return [] as string[]
  }

  const pendingStatuses = new Set([
    'requires_confirmation',
    'requires_action',
    'await_user_confirmation',
    'pending',
    'paused',
    'interrupted',
    'waiting'
  ])

  return input.toolCalls
    .filter(toolCall => pendingStatuses.has(toolCall.status.toLowerCase()))
    .map(toolCall => toolCall.id)
    .filter(Boolean)
}

export function XpertExpertWorkflowStudioCard({ expertId }: { expertId: string }) {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [runtimeControlError, setRuntimeControlError] = useState<string | null>(null)
  const [resumePending, setResumePending] = useState(false)
  const [toolDecisionPending, setToolDecisionPending] = useState<'confirm' | 'reject' | null>(null)
  const runtimeControlState = useChatRuntimeStore(state => state.runtimeControlState)
  const taskRuntimeHints = useChatRuntimeStore(state => state.taskRuntimeHints)
  const ingestRuntimeControlResult = useChatRuntimeStore(state => state.ingestRuntimeControlResult)
  const activeConversationId = useWorkbenchMachine(state => state.activeConversationId)
  const activeTraceKey = useWorkbenchMachine(state => state.activeTraceKey)
  const setActiveConversationId = useWorkbenchMachine(state => state.setActiveConversationId)
  const setActiveTraceKey = useWorkbenchMachine(state => state.setActiveTraceKey)
  const lastRuntimeSyncKeyRef = useRef<string | null>(null)

  const executionQuery = useQuery({
    queryKey: ['xpert-execution-list', expertId],
    queryFn: () => listExpertExecutions(expertId)
  })

  const executions = executionQuery.data?.items ?? []
  const resolvedExecutionId = selectedExecutionId ?? executions[0]?.id ?? null

  useEffect(() => {
    if (!selectedExecutionId && executions[0]?.id) {
      setSelectedExecutionId(executions[0].id)
      return
    }
    if (selectedExecutionId && executions.length > 0 && !executions.some(item => item.id === selectedExecutionId)) {
      setSelectedExecutionId(executions[0].id)
    }
  }, [executions, selectedExecutionId])

  const logQuery = useQuery({
    queryKey: ['xpert-execution-log', resolvedExecutionId],
    queryFn: () => getExpertExecutionLog(resolvedExecutionId ?? ''),
    enabled: Boolean(resolvedExecutionId)
  })

  const stateQuery = useQuery({
    queryKey: ['xpert-execution-state', resolvedExecutionId],
    queryFn: () => getExpertExecutionState(resolvedExecutionId ?? ''),
    enabled: Boolean(resolvedExecutionId)
  })

  const selectedExecution = useMemo(
    () => executions.find(item => item.id === resolvedExecutionId) ?? null,
    [executions, resolvedExecutionId]
  )

  const workflowNodes = useMemo(() => {
    const target = logQuery.data ?? selectedExecution
    if (!target) {
      return []
    }
    return flattenWorkflowNodes(target)
  }, [logQuery.data, selectedExecution])

  useEffect(() => {
    if (!workflowNodes.length) {
      setSelectedNodeId(null)
      return
    }
    if (!selectedNodeId || !workflowNodes.some(item => item.id === selectedNodeId)) {
      setSelectedNodeId(workflowNodes[0].id)
    }
  }, [selectedNodeId, workflowNodes])

  useEffect(() => {
    if (!autoRefresh) {
      return
    }
    const timer = window.setInterval(() => {
      void executionQuery.refetch()
      if (resolvedExecutionId) {
        void logQuery.refetch()
        void stateQuery.refetch()
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, executionQuery, logQuery, resolvedExecutionId, stateQuery])

  const toolsetKeys = useMemo(() => summarizeToolset(stateQuery.data, logQuery.data), [stateQuery.data, logQuery.data])
  const messageTimeline = useMemo(() => normalizeMessageTimeline(logQuery.data?.messages), [logQuery.data?.messages])
  const selectedNode = useMemo(() => workflowNodes.find(item => item.id === selectedNodeId) ?? null, [selectedNodeId, workflowNodes])
  const executionView = useMemo(
    () =>
      mapExecutionViewModel({
        execution: selectedExecution,
        log: logQuery.data,
        state: stateQuery.data,
        runtimeContext: {
          conversationId: activeConversationId,
          traceKey: activeTraceKey,
          runtimeControl: {
            command: taskRuntimeHints.sourceEvent ?? 'runtime_kernel',
            status: taskRuntimeHints.statusHint ?? runtimeControlState.phase
          }
        }
      }),
    [
      activeConversationId,
      activeTraceKey,
      logQuery.data,
      runtimeControlState.phase,
      selectedExecution,
      stateQuery.data,
      taskRuntimeHints.sourceEvent,
      taskRuntimeHints.statusHint
    ]
  )
  const stateView = useMemo(
    () =>
      mapStateViewModel({
        state: stateQuery.data,
        log: logQuery.data
      }),
    [logQuery.data, stateQuery.data]
  )
  const effectiveRuntimeControlState = useMemo(() => {
    if (runtimeControlState.canInterrupt || runtimeControlState.canResume || runtimeControlState.canCancel) {
      return runtimeControlState
    }

    const fallbackPhase =
      normalizeRuntimePhase(executionView.lifecycleStatus) ??
      normalizeRuntimePhase(stateView.lifecycleStatus) ??
      normalizeRuntimePhase(executionView.runtimeControl.status) ??
      normalizeRuntimePhase(stateView.runtimeControl.status) ??
      runtimeControlState.phase

    if (fallbackPhase === 'running') {
      return {
        phase: 'running' as const,
        canInterrupt: true,
        canResume: false,
        canCancel: true
      }
    }

    if (fallbackPhase === 'paused') {
      return {
        phase: 'paused' as const,
        canInterrupt: false,
        canResume: true,
        canCancel: true
      }
    }

    return {
      phase: fallbackPhase,
      canInterrupt: false,
      canResume: false,
      canCancel: false
    }
  }, [
    executionView.lifecycleStatus,
    executionView.runtimeControl.status,
    runtimeControlState,
    stateView.lifecycleStatus,
    stateView.runtimeControl.status
  ])
  const hasRuntimeActions =
    effectiveRuntimeControlState.canInterrupt || effectiveRuntimeControlState.canResume || effectiveRuntimeControlState.canCancel
  const pendingToolCallIds = useMemo(
    () =>
      resolvePendingToolCallIds({
        pendingActionCount: executionView.pendingActionCount,
        toolCalls: executionView.toolCalls
      }),
    [executionView.pendingActionCount, executionView.toolCalls]
  )
  const toolDecisionSupportedByState = effectiveRuntimeControlState.canResume && pendingToolCallIds.length > 0
  const resumeUnavailableReason = !effectiveRuntimeControlState.canResume
    ? null
    : toolDecisionSupportedByState
      ? 'Resume transport is unavailable while tool confirmation is pending.'
      : !executionView.conversationId
        ? 'Resume transport requires a resolved xpert session id.'
        : !executionView.threadId
          ? 'Resume transport requires resolved thread context.'
          : !executionView.executionId || executionView.executionId === 'unknown'
            ? 'Resume transport requires resolved execution context.'
            : null
  const toolDecisionUnavailableReason = !effectiveRuntimeControlState.canResume
    ? null
    : !executionView.conversationId
      ? 'Tool decision transport requires a resolved xpert session id.'
      : pendingToolCallIds.length === 0
        ? 'Tool decision transport requires pending tool-call ids.'
        : null

  const loading = executionQuery.isLoading || (Boolean(resolvedExecutionId) && (logQuery.isLoading || stateQuery.isLoading))
  const error = executionQuery.error || logQuery.error || stateQuery.error
  const loadingLabel = executionQuery.isLoading ? 'Loading expert executions...' : 'Loading expert execution detail...'

  const refreshCurrent = () => {
    void executionQuery.refetch()
    if (resolvedExecutionId) {
      void logQuery.refetch()
      void stateQuery.refetch()
    }
  }

  useEffect(() => {
    if (executionView.conversationId) {
      setActiveConversationId(executionView.conversationId)
    }
    if (executionView.traceKey) {
      setActiveTraceKey(executionView.traceKey)
    }
  }, [executionView.conversationId, executionView.traceKey, setActiveConversationId, setActiveTraceKey])

  useEffect(() => {
    if (!executionView.conversationId && !executionView.traceKey) {
      return
    }

    const syncKey = JSON.stringify({
      executionId: executionView.executionId,
      conversationId: executionView.conversationId ?? null,
      traceKey: executionView.traceKey ?? null,
      command: executionView.runtimeControl.command,
      status: executionView.runtimeControl.status
    })

    if (lastRuntimeSyncKeyRef.current === syncKey) {
      return
    }
    lastRuntimeSyncKeyRef.current = syncKey

    ingestRuntimeControlResult({
      conversationId: executionView.conversationId ?? null,
      traceKey: executionView.traceKey ?? null,
      taskId: executionView.executionId,
      command: executionView.runtimeControl.command,
      status: executionView.runtimeControl.status
    })
  }, [
    executionView.conversationId,
    executionView.executionId,
    executionView.runtimeControl.command,
    executionView.runtimeControl.status,
    executionView.traceKey,
    ingestRuntimeControlResult
  ])

  useEffect(() => {
    if (!effectiveRuntimeControlState.canResume) {
      setResumePending(false)
      setToolDecisionPending(null)
      setRuntimeControlError(null)
    }
  }, [effectiveRuntimeControlState.canResume])

  useEffect(() => {
    setResumePending(false)
    setToolDecisionPending(null)
    setRuntimeControlError(null)
  }, [resolvedExecutionId])

  const handleResumeRuntime = async () => {
    if (
      resumePending ||
      !executionView.conversationId ||
      !executionView.threadId ||
      !executionView.executionId ||
      executionView.executionId === 'unknown' ||
      resumeUnavailableReason
    ) {
      return
    }

    setResumePending(true)
    setRuntimeControlError(null)

    try {
      await runXpertRuntimeControlTransport({
        action: 'resume',
        conversationId: executionView.conversationId,
        resume: {
          threadId: executionView.threadId,
          executionId: executionView.executionId
        }
      })

      ingestRuntimeControlResult({
        conversationId: executionView.conversationId,
        traceKey: executionView.traceKey,
        taskId: executionView.executionId,
        command: 'resume',
        status: 'running'
      })
    } catch (error) {
      setRuntimeControlError(normalizeUiError(error).message)
    } finally {
      setResumePending(false)
    }
  }

  const handleToolDecisionRuntime = async (approved: boolean) => {
    if (
      toolDecisionPending ||
      !executionView.conversationId ||
      pendingToolCallIds.length === 0 ||
      toolDecisionUnavailableReason
    ) {
      return
    }

    const pendingState = approved ? 'confirm' : 'reject'
    setToolDecisionPending(pendingState)
    setRuntimeControlError(null)

    try {
      await runXpertRuntimeControlTransport({
        action: 'tool_call_update',
        conversationId: executionView.conversationId,
        toolCalls: pendingToolCallIds.map(id => ({
          id,
          args: {
            approved
          }
        }))
      })

      ingestRuntimeControlResult({
        conversationId: executionView.conversationId,
        traceKey: executionView.traceKey,
        taskId: executionView.executionId,
        command: 'tool_call_update',
        status: 'running'
      })
    } catch (error) {
      setRuntimeControlError(normalizeUiError(error).message)
    } finally {
      setToolDecisionPending(null)
    }
  }

  return (
    <NexusCard data-testid="xpert-expert-workflow-studio" className="xpert-assistant-panel xpert-grid-panel">
      <header className="xpert-panel-head">
        <strong>Workflow Studio</strong>
        <p className="xpert-panel-subtitle">Execution graph, runtime state and tool activity routed through xpert workflows.</p>
        <div className="xpert-studio-controls">
          <button
            data-testid="xpert-expert-execution-refresh"
            type="button"
            className="xpert-studio-control-button"
            onClick={refreshCurrent}
          >
            Refresh
          </button>
          <label className="xpert-studio-auto-refresh">
            <input
              data-testid="xpert-expert-auto-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={event => setAutoRefresh(event.target.checked)}
            />
            Auto refresh
          </label>
        </div>
      </header>

      <LoadablePanel
        loading={loading}
        error={error}
        empty={executions.length === 0}
        loadingLabel={loadingLabel}
        emptyLabel="No workflow executions found for this expert."
        retry={() => {
          void executionQuery.refetch()
          if (resolvedExecutionId) {
            void logQuery.refetch()
            void stateQuery.refetch()
          }
        }}
      >
        <NexusCard data-testid="xpert-expert-operation-control" className="xpert-studio-debug-card">
          <strong>Runtime Surface</strong>
          <div className="xpert-resource-row-meta">session: {executionView.conversationId ?? 'unresolved'}</div>
          <div className="xpert-resource-row-meta">trace: {executionView.traceKey ?? '-'}</div>
          <div className="xpert-resource-row-meta">thread: {executionView.threadId ?? '-'}</div>
          <div className="xpert-resource-summary">
            {executionView.conversationId ? null : (
              <NexusBadge tone="warn">Current execution has no resolved xpert session id</NexusBadge>
            )}
            {effectiveRuntimeControlState.canInterrupt ? (
              <NexusButton data-testid="xpert-expert-operation-interrupt" type="button" disabled>
                Interrupt
              </NexusButton>
            ) : null}
            {effectiveRuntimeControlState.canResume ? (
              toolDecisionSupportedByState ? (
                <>
                  <NexusButton
                    data-testid="xpert-expert-operation-confirm"
                    type="button"
                    disabled={Boolean(toolDecisionPending) || Boolean(toolDecisionUnavailableReason)}
                    onClick={() => {
                      if (!toolDecisionPending && !toolDecisionUnavailableReason) {
                        void handleToolDecisionRuntime(true)
                      }
                    }}
                  >
                    {toolDecisionPending === 'confirm' ? 'Confirming...' : 'Confirm'}
                  </NexusButton>
                  <NexusButton
                    data-testid="xpert-expert-operation-reject"
                    type="button"
                    disabled={Boolean(toolDecisionPending) || Boolean(toolDecisionUnavailableReason)}
                    onClick={() => {
                      if (!toolDecisionPending && !toolDecisionUnavailableReason) {
                        void handleToolDecisionRuntime(false)
                      }
                    }}
                  >
                    {toolDecisionPending === 'reject' ? 'Rejecting...' : 'Reject'}
                  </NexusButton>
                </>
              ) : (
                <NexusButton
                  data-testid="xpert-expert-operation-resume"
                  type="button"
                  disabled={Boolean(resumePending) || Boolean(resumeUnavailableReason)}
                  onClick={() => {
                    if (!resumePending && !resumeUnavailableReason) {
                      void handleResumeRuntime()
                    }
                  }}
                >
                  {resumePending ? 'Resuming...' : 'Resume'}
                </NexusButton>
              )
            ) : null}
            {effectiveRuntimeControlState.canCancel ? (
              <NexusButton data-testid="xpert-expert-operation-cancel" type="button" disabled>
                Cancel
              </NexusButton>
            ) : null}
            <NexusBadge tone="neutral">
              {hasRuntimeActions
                ? toolDecisionSupportedByState || (effectiveRuntimeControlState.canResume && !resumeUnavailableReason)
                  ? 'Cancel transport not connected in this surface.'
                  : 'Action transport not connected in this surface.'
                : `No runtime actions are available for phase ${effectiveRuntimeControlState.phase}.`}
            </NexusBadge>
            {runtimeControlError ? <NexusBadge tone="danger">{runtimeControlError}</NexusBadge> : null}
          </div>
        </NexusCard>

        <section className="xpert-studio-grid">
          <NexusCard className="xpert-studio-execution-list">
            <strong>Executions</strong>
            <div className="xpert-resource-list">
              {executions.map((execution, index) => {
                const selected = execution.id === selectedExecutionId
                return (
                  <button
                    key={execution.id}
                    type="button"
                    data-testid={`xpert-expert-execution-row-${index}`}
                    className={`xpert-studio-execution-item${selected ? ' is-active' : ''}`}
                    onClick={() => setSelectedExecutionId(execution.id)}
                  >
                    <span>{execution.title || execution.agentKey || execution.id}</span>
                    <NexusBadge tone={execution.status === 'error' ? 'warn' : 'neutral'}>
                      {execution.status || 'unknown'}
                    </NexusBadge>
                  </button>
                )
              })}
            </div>
          </NexusCard>

          <NexusCard className="xpert-studio-workflow-list">
            <strong>Workflow Nodes</strong>
            <div className="xpert-resource-list">
              {workflowNodes.map((node, index) => (
                <button
                  key={`${node.id}-${index}`}
                  type="button"
                  data-testid={`xpert-expert-node-row-${index}`}
                  className={`xpert-studio-node-item${selectedNode?.id === node.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div className="xpert-resource-row-main">
                    <strong style={{ paddingLeft: node.depth * 12 }}>{node.title}</strong>
                    <div className="xpert-resource-row-meta">
                      {node.tokens ? `tokens ${node.tokens}` : 'tokens -'} ·{' '}
                      {typeof node.elapsedTime === 'number' ? `${Math.round(node.elapsedTime)}ms` : 'elapsed -'}
                    </div>
                    {node.error ? <div className="xpert-resource-row-meta">error: {node.error}</div> : null}
                  </div>
                  <NexusBadge tone={node.status === 'error' ? 'warn' : node.status === 'success' ? 'ok' : 'neutral'}>
                    {node.status}
                  </NexusBadge>
                </button>
              ))}
            </div>
          </NexusCard>
        </section>

        <section className="xpert-studio-debug-grid">
          <NexusCard data-testid="xpert-expert-structured-execution" className="xpert-studio-debug-card">
            <strong>Execution Snapshot</strong>
            <div className="xpert-resource-summary">
              <NexusBadge tone="neutral">{executionView.status}</NexusBadge>
              <NexusBadge tone="brand">{executionView.lifecycleStatus}</NexusBadge>
              <NexusBadge tone="neutral">pending actions: {executionView.pendingActionCount}</NexusBadge>
            </div>
            <div className="xpert-resource-row-meta">execution id: {executionView.executionId}</div>
            <div className="xpert-resource-row-meta">turn id: {executionView.turnId ?? '-'}</div>
            <div className="xpert-resource-row-meta">
              runtime control: {executionView.runtimeControl.command} / {executionView.runtimeControl.status}
            </div>
            {executionView.pendingActionKeys.length > 0 ? (
              <div className="xpert-resource-summary">
                {executionView.pendingActionKeys.map(key => (
                  <NexusBadge key={key} tone="brand">
                    {key}
                  </NexusBadge>
                ))}
              </div>
            ) : null}
            <div className="xpert-resource-list">
              {executionView.toolCalls.length === 0 ? (
                <span className="xpert-resource-row-meta">No tool call trace.</span>
              ) : (
                executionView.toolCalls.map(toolCall => (
                  <article key={toolCall.id} className="xpert-resource-row">
                    <div className="xpert-resource-row-main">
                      <strong>{toolCall.name}</strong>
                      <div className="xpert-resource-row-meta">{toolCall.id}</div>
                      {toolCall.summary ? <div className="xpert-resource-row-meta">{toolCall.summary}</div> : null}
                    </div>
                    <NexusBadge tone={toolCall.status === 'failed' ? 'warn' : 'neutral'}>{toolCall.status}</NexusBadge>
                  </article>
                ))
              )}
            </div>
          </NexusCard>

          <NexusCard data-testid="xpert-expert-structured-state" className="xpert-studio-debug-card">
            <strong>State Snapshot</strong>
            <div className="xpert-resource-summary">
              <NexusBadge tone="neutral">{stateView.lifecycleStatus}</NexusBadge>
              <NexusBadge tone="neutral">messages: {stateView.messageCount}</NexusBadge>
              <NexusBadge tone="neutral">pending: {stateView.pendingActionCount}</NexusBadge>
              {typeof stateView.checkpointId === 'number' ? <NexusBadge tone="brand">checkpoint: {stateView.checkpointId}</NexusBadge> : null}
            </div>
            <div className="xpert-resource-row-meta">
              runtime control: {stateView.runtimeControl.command} / {stateView.runtimeControl.status}
            </div>
            <div className="xpert-resource-row-meta">
              transitions: {stateView.transitions.length > 0 ? stateView.transitions.join(' -> ') : '-'}
            </div>
            <div className="xpert-resource-row-meta">
              keys: {stateView.topLevelKeys.length > 0 ? stateView.topLevelKeys.join(', ') : '-'}
            </div>
          </NexusCard>

          <NexusCard data-testid="xpert-expert-message-timeline" className="xpert-studio-debug-card">
            <strong>Message Timeline</strong>
            <div className="xpert-resource-list">
              {messageTimeline.length === 0 ? <span className="xpert-resource-row-meta">No message timeline.</span> : null}
              {messageTimeline.map((item, index) => (
                <article key={`${item.id}-${index}`} className="xpert-resource-row">
                  <div className="xpert-resource-row-main">
                    <strong>{item.role}</strong>
                    <div className="xpert-resource-row-meta">{item.id}</div>
                    <div className="xpert-resource-row-meta">{item.text}</div>
                  </div>
                  <NexusBadge tone="neutral">{item.ts ?? '-'}</NexusBadge>
                </article>
              ))}
            </div>
          </NexusCard>

          <NexusCard data-testid="xpert-expert-node-detail" className="xpert-studio-debug-card">
            <strong>Node Detail</strong>
            <pre className="xpert-studio-json">{toPrettyJson(selectedNode?.raw ?? {})}</pre>
          </NexusCard>

          <NexusCard data-testid="xpert-expert-toolset-summary" className="xpert-studio-debug-card">
            <strong>Toolset Summary</strong>
            <div className="xpert-resource-summary">
              {toolsetKeys.length === 0 ? <NexusBadge tone="neutral">No toolset trace</NexusBadge> : null}
              {toolsetKeys.map(key => (
                <NexusBadge key={key} tone="brand">
                  {key}
                </NexusBadge>
              ))}
            </div>
          </NexusCard>

          <NexusCard data-testid="xpert-expert-debug-state" className="xpert-studio-debug-card">
            <strong>Debug State</strong>
            <pre className="xpert-studio-json">{toPrettyJson(stateQuery.data ?? {})}</pre>
          </NexusCard>
        </section>
      </LoadablePanel>
    </NexusCard>
  )
}

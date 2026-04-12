'use client'

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  useAui
} from '@assistant-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  createMessageFeedback,
  deleteMessageFeedback,
  getConversation,
  getMessageFeedback,
  listConversations,
  listConversationTurns,
  listSuggestedQuestions,
  type ConversationSummary,
  type MessageFeedbackRating
} from '@/modules/chat/api'
import { AskAnalysisPanel } from '@/modules/chat/analysis/analysis-panel'
import { useSessionStore } from '@/modules/auth/session-store'
import { AssistantMessageCard, UserMessageCard } from '@/modules/chat/components/message-renderer'
import { RuntimeExecutionPanel } from '@/modules/chat/components/runtime-execution-panel'
import { ThreadAnalysisFollowupCard } from '@/modules/chat/components/thread/thread-analysis-followup-card'
import { ThreadDiagnosticsDrawer } from '@/modules/chat/components/thread/thread-diagnostics-drawer'
import {
  deriveAnswerMode,
  type ChatStreamEvent,
  useChatbiStreamRuntime
} from '@/modules/chat/runtime/chatbi-stream-runtime'
import { runXpertRuntimeControlTransport } from '@/modules/chat/runtime/runtime-control-transport'
import { useChatRuntimeStore, type RuntimeEventEntry } from '@/modules/chat/runtime/chat-runtime-store'
import { frontendPlatformAdapter } from '@/modules/shared/contracts/frontend-platform-adapter'
import { resolveRuntimeControlState, type RuntimeExecutionNode } from '@/modules/chat/runtime/chat-runtime-projection'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusCard, NexusInput } from '@/modules/shared/ui/primitives'
import { useWorkbenchMachine } from '@/modules/shared/workbench/workbench-machine'

function formatProgress(event: ChatStreamEvent | null) {
  if (!event || event.event !== 'progress') return null
  const phase = event.data.phase ?? 'processing'
  const phaseLabel =
    phase === 'context'
      ? '上下文'
      : phase === 'resolve'
        ? '解析'
        : phase === 'plan'
          ? '规划'
          : phase === 'execute'
            ? '执行'
            : phase === 'render'
              ? '渲染'
              : '处理中'

  return `${phaseLabel}: ${event.data.message ?? '进行中'}`
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return undefined
}

function resolvePendingToolCallIds(operation: unknown) {
  const operationRecord = asRecord(operation)
  if (!operationRecord) {
    return [] as string[]
  }

  const ids = new Set<string>()
  const tasks = Array.isArray(operationRecord.tasks) ? operationRecord.tasks : []
  for (const task of tasks) {
    const taskRecord = asRecord(task)
    const callRecord = asRecord(taskRecord?.call)
    const toolCallId =
      asString(callRecord?.id) ?? asString(callRecord?.tool_call_id) ?? asString(callRecord?.toolCallId)
    if (toolCallId) {
      ids.add(toolCallId)
    }
  }

  const actions = Array.isArray(operationRecord.actions) ? operationRecord.actions : []
  for (const action of actions) {
    const actionRecord = asRecord(action)
    const toolCallId = asString(actionRecord?.id) ?? asString(actionRecord?.tool_call_id) ?? asString(actionRecord?.toolCallId)
    if (toolCallId) {
      ids.add(toolCallId)
    }
  }

  return [...ids]
}

function formatConversationClock(isoTime?: string) {
  if (!isoTime) return ''
  const parsed = new Date(isoTime)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(parsed)
}

function conversationGroupLabel(lastTurnAt?: string) {
  if (!lastTurnAt) return '更早'
  const parsed = new Date(lastTurnAt)
  if (Number.isNaN(parsed.getTime())) return '更早'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - 7)

  if (parsed >= todayStart) return '今天'
  if (parsed >= yesterdayStart) return '昨天'
  if (parsed >= weekStart) return '最近 7 天'
  return '更早'
}

function groupConversationsByDate(items: ConversationSummary[]) {
  const groups: Array<{ label: string; items: ConversationSummary[] }> = []
  for (const item of items) {
    const label = conversationGroupLabel(item.lastTurnAt)
    const existing = groups.find(group => group.label === label)
    if (existing) {
      existing.items.push(item)
      continue
    }
    groups.push({ label, items: [item] })
  }
  return groups
}

function SuggestedQuestionsBar({ questions }: { questions: string[] }) {
  const aui = useAui()

  if (questions.length === 0) {
    return null
  }

  return (
    <NexusCard data-testid="ask-suggested-questions" className="chat-assistant-panel chat-assistant-suggested nx-shell-panel">
      <strong className="chat-assistant-suggested-title">推荐追问</strong>
      <div className="chat-assistant-suggested-list">
        {questions.map((question, index) => (
          <NexusButton
            key={`${question}-${index}`}
            data-testid={`ask-suggested-question-${index}`}
            type="button"
            variant="ghost"
            className="chat-assistant-suggested-action"
            onClick={() => {
              aui.composer().setText(question)
              aui.composer().send()
            }}
          >
            {question}
          </NexusButton>
        ))}
      </div>
    </NexusCard>
  )
}

type AnalysisDraftState = {
  prompt?: string
  patch?: Record<string, unknown>
  analysisAction?: string
  baseQueryLogId?: string
}

function parseAnalysisDraftParam(value: string | null): AnalysisDraftState | undefined {
  if (!value) {
    return undefined
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return {
      ...(typeof parsed.prompt === 'string' ? { prompt: parsed.prompt } : {}),
      ...(parsed.patch && typeof parsed.patch === 'object' && !Array.isArray(parsed.patch)
        ? { patch: parsed.patch as Record<string, unknown> }
        : {}),
      ...(typeof parsed.analysisAction === 'string' ? { analysisAction: parsed.analysisAction } : {}),
      ...(typeof parsed.baseQueryLogId === 'string' ? { baseQueryLogId: parsed.baseQueryLogId } : {})
    }
  } catch {
    return undefined
  }
}

function readInitialSearchParam(name: string) {
  if (typeof window === 'undefined') {
    return undefined
  }
  const value = new URLSearchParams(window.location.search).get(name)
  return value ?? undefined
}

function AnalysisConsoleSection(props: {
  enabled: boolean
  modelId?: string
  queryLogId?: string
  baseQueryLogId?: string
  traceKey?: string
  initialDraft?: AnalysisDraftState
  onQueueAnalysisFollowup: (draft: {
    prompt: string
    patch: Record<string, unknown>
    analysisAction?: string
    baseQueryLogId?: string
  }) => void
}) {
  const aui = useAui()

  return (
    <div data-testid="ask-analysis-panel-v2">
      <div data-analysis-trace-key={props.traceKey ?? undefined}>
      <AskAnalysisPanel
        enabled={props.enabled}
        modelId={props.modelId}
        queryLogId={props.queryLogId}
        baseQueryLogId={props.baseQueryLogId}
        initialDraft={props.initialDraft}
        onApplyFollowup={async input => {
          props.onQueueAnalysisFollowup({
            prompt: input.prompt,
            patch: input.patch,
            analysisAction: input.analysisAction,
            baseQueryLogId: input.baseQueryLogId
          })
          aui.composer().setText(input.prompt)
          aui.composer().send()
          return {
            queued: true,
            analysisAction: input.analysisAction ?? null
          }
        }}
        onTemplateApplied={() => undefined}
      />
      </div>
    </div>
  )
}

export function ChatWorkspacePage() {
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [activeXpertId, setActiveXpertId] = useState<string | undefined>(() => readInitialSearchParam('xpertId'))
  const [xpertTargetInput, setXpertTargetInput] = useState(() => readInitialSearchParam('xpertId') ?? '')
  const [conversationSearch, setConversationSearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)
  const [copiedConversationId, setCopiedConversationId] = useState<string | null>(null)
  const [eventsCollapsed, setEventsCollapsed] = useState(false)
  const [analysisQueryLogId, setAnalysisQueryLogId] = useState<string | undefined>()
  const [analysisTraceKey, setAnalysisTraceKey] = useState<string | undefined>()
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraftState | undefined>()
  const [pendingAnalysisFollowup, setPendingAnalysisFollowup] = useState<
    | {
        prompt: string
        patch?: Record<string, unknown>
        analysisAction?: string
        baseQueryLogId?: string
      }
    | undefined
  >()
  const [runtimeControlError, setRuntimeControlError] = useState<string | null>(null)
  const [resumePending, setResumePending] = useState(false)
  const [toolDecisionPending, setToolDecisionPending] = useState<'confirm' | 'reject' | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)

  const isStreaming = useChatRuntimeStore(state => state.isStreaming)
  const lastEvent = useChatRuntimeStore(state => state.lastEvent)
  const runtimeEvents = useChatRuntimeStore(state => state.runtimeEvents)
  const lastDone = useChatRuntimeStore(state => state.lastDone)
  const executionOrder = useChatRuntimeStore(state => state.executionOrder)
  const executionTree = useChatRuntimeStore(state => state.executionTree)
  const executionNodes = useMemo(
    () =>
      executionOrder
        .map(key => executionTree[key])
        .filter((node): node is RuntimeExecutionNode => Boolean(node)),
    [executionOrder, executionTree]
  )
  const taskRuntimeHintsGlobal = useChatRuntimeStore(state => state.taskRuntimeHints)
  const taskRuntimeHintsByConversationId = useChatRuntimeStore(state => state.taskRuntimeHintsByConversationId)
  const ingestRuntimeEvent = useChatRuntimeStore(state => state.ingestEvent)
  const ingestRuntimeControlResult = useChatRuntimeStore(state => state.ingestRuntimeControlResult)
  const clearRuntimeState = useChatRuntimeStore(state => state.clearRuntimeState)

  const workbenchConversationId = useWorkbenchMachine(state => state.activeConversationId)
  const workbenchQueryLogId = useWorkbenchMachine(state => state.lastQueryLogId)
  const setWorkbenchConversationId = useWorkbenchMachine(state => state.setActiveConversationId)
  const setWorkbenchTraceKey = useWorkbenchMachine(state => state.setActiveTraceKey)
  const setWorkbenchIntentKind = useWorkbenchMachine(state => state.setLastIntentKind)
  const dispatchWorkbench = useWorkbenchMachine(state => state.dispatch)
  const session = useSessionStore(state => state.session)
  const userLabel = session?.userId || 'PA User'

  const taskRuntimeHints = useMemo(() => {
    if (conversationId) {
      return taskRuntimeHintsByConversationId[conversationId] ?? taskRuntimeHintsGlobal
    }
    return taskRuntimeHintsGlobal
  }, [conversationId, taskRuntimeHintsByConversationId, taskRuntimeHintsGlobal])
  const runtimeControlState = useMemo(
    () => resolveRuntimeControlState(taskRuntimeHints.statusHint),
    [taskRuntimeHints.statusHint]
  )
  const runtimeControlConversationId = conversationId ?? taskRuntimeHints.conversationId ?? undefined

  const resetChatContext = () => {
    setConversationId(undefined)
    clearRuntimeState()
    setEventsCollapsed(false)
    setQueryStatus(null)
    setFeedbackStatus(null)
    setAnalysisQueryLogId(undefined)
    setAnalysisTraceKey(undefined)
    setAnalysisDraft(undefined)
    setPendingAnalysisFollowup(undefined)
    setRuntimeControlError(null)
    setResumePending(false)
    setToolDecisionPending(null)
    setDiagnosticsOpen(false)
  }

  const applyXpertTarget = (nextValue?: string) => {
    const normalized = asString(nextValue)?.trim()
    setActiveXpertId(normalized)
    setXpertTargetInput(normalized ?? '')

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (normalized) {
        params.set('xpertId', normalized)
      } else {
        params.delete('xpertId')
      }
      const search = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
    }

    resetChatContext()
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const fromXpertId = params.get('xpertId')
    const fromQueryConversationId = params.get('conversationId')
    const fromQueryLogId = params.get('queryLogId')
    const fromTraceKey = params.get('traceKey')
    const fromAnalysisDraft = params.get('analysisDraft')
    if (fromXpertId) {
      setActiveXpertId(current => current ?? fromXpertId)
      setXpertTargetInput(current => current || fromXpertId)
    }
    if (fromQueryConversationId) {
      setConversationId(current => current ?? fromQueryConversationId)
    } else if (workbenchConversationId) {
      setConversationId(current => current ?? workbenchConversationId)
    }
    if (fromQueryLogId) {
      setAnalysisQueryLogId(current => current ?? fromQueryLogId)
    }
    if (fromTraceKey) {
      setAnalysisTraceKey(current => current ?? fromTraceKey)
    }
    if (fromAnalysisDraft) {
      setAnalysisDraft(current => current ?? parseAnalysisDraftParam(fromAnalysisDraft))
    }
  }, [workbenchConversationId])

  useEffect(() => {
    setWorkbenchConversationId(conversationId)
  }, [conversationId, setWorkbenchConversationId])

  const conversationsQuery = useQuery({
    queryKey: ['xpert-chat-conversations', activeXpertId ?? ''],
    queryFn: () => listConversations(activeXpertId, 30, 0),
    enabled: Boolean(activeXpertId)
  })

  const turnsQuery = useQuery({
    queryKey: ['xpert-chat-turns', conversationId],
    queryFn: () => listConversationTurns(conversationId as string, 50, 0),
    enabled: Boolean(conversationId)
  })

  const conversationDetailQuery = useQuery({
    queryKey: ['xpert-chat-conversation-detail', activeXpertId ?? '', runtimeControlConversationId],
    queryFn: () => getConversation(runtimeControlConversationId as string, activeXpertId),
    enabled: Boolean(activeXpertId && runtimeControlConversationId && runtimeControlState.canResume)
  })

  const doneMeta = asRecord(lastDone?.meta)
  const intent = asRecord(doneMeta?.intent)
  const doneTraceKey = asString(doneMeta?.traceKey) ?? asString(doneMeta?.trace_id)
  const doneQueryLogId = asString(lastDone?.queryLogId) ?? asString(doneMeta?.queryLogId)
  const doneMessageId = asString(doneMeta?.messageId)
  const fallbackAssistantMessageId = (turnsQuery.data?.items ?? []).find(item => item.role === 'assistant')?.turnId
  const activeMessageId = doneMessageId ?? fallbackAssistantMessageId

  useEffect(() => {
    setWorkbenchTraceKey(doneTraceKey)
  }, [doneTraceKey, setWorkbenchTraceKey])

  useEffect(() => {
    if (doneQueryLogId) {
      setAnalysisQueryLogId(doneQueryLogId)
    } else if (workbenchQueryLogId) {
      setAnalysisQueryLogId(current => current ?? workbenchQueryLogId)
    }
  }, [doneQueryLogId, workbenchQueryLogId])

  useEffect(() => {
    if (doneTraceKey) {
      setAnalysisTraceKey(doneTraceKey)
    }
  }, [doneTraceKey])

  const suggestionsQuery = useQuery({
    queryKey: ['xpert-suggested-questions', activeMessageId],
    queryFn: () => listSuggestedQuestions(activeMessageId as string),
    enabled: Boolean(activeMessageId)
  })

  const feedbackQuery = useQuery({
    queryKey: ['xpert-message-feedback', conversationId, activeMessageId],
    queryFn: () => getMessageFeedback(conversationId as string, activeMessageId as string),
    enabled: Boolean(conversationId && activeMessageId)
  })

  const feedbackMutation = useMutation({
    mutationFn: async (rating: MessageFeedbackRating) => {
      if (!conversationId || !activeMessageId) {
        throw new Error('当前回答缺少 feedback 上下文')
      }

      const existing = feedbackQuery.data
      if (existing && existing.rating === rating) {
        await deleteMessageFeedback(existing.id)
        return null
      }

      if (existing) {
        await deleteMessageFeedback(existing.id)
      }

      return createMessageFeedback({
        conversationId,
        messageId: activeMessageId,
        rating
      })
    },
    onSuccess: result => {
      setFeedbackStatus(result ? `反馈已更新：${result.rating}` : '反馈已取消')
      void feedbackQuery.refetch()
    },
    onError: error => {
      setFeedbackStatus(normalizeUiError(error).message)
    }
  })

  const conversationDetail = asRecord(conversationDetailQuery.data)
  const pendingToolCallIds = useMemo(
    () => resolvePendingToolCallIds(conversationDetail?.operation),
    [conversationDetail]
  )
  const resumeThreadId = asString(conversationDetail?.threadId) ?? asString(conversationDetail?.thread_id)
  const resumeExecutionId = taskRuntimeHints.taskId ?? undefined
  const resumeSupportedByState = runtimeControlState.canResume && taskRuntimeHints.sourceEvent?.toLowerCase() === 'on_interrupt'
  const toolDecisionSupportedByState = resumeSupportedByState && pendingToolCallIds.length > 0
  const resumeUnavailableReason = !runtimeControlState.canResume
    ? null
    : !resumeSupportedByState
      ? 'Resume transport is only available for interrupt-backed paused runs.'
      : toolDecisionSupportedByState
        ? 'Resume transport is unavailable while tool confirmation is pending.'
      : !runtimeControlConversationId
        ? 'Resume transport requires an active conversation.'
        : !resumeThreadId
          ? 'Resume transport requires resolved thread context.'
          : !resumeExecutionId
            ? 'Resume transport requires resolved execution context.'
            : null
  const toolDecisionUnavailableReason = !runtimeControlState.canResume
    ? null
    : !resumeSupportedByState
      ? 'Tool decision transport is only available for interrupt-backed paused runs.'
      : !runtimeControlConversationId
        ? 'Tool decision transport requires an active conversation.'
        : pendingToolCallIds.length === 0
          ? 'Tool decision transport requires resolved tool-call identity.'
          : null

  const handleResumeRuntime = async () => {
    if (
      resumePending ||
      !runtimeControlConversationId ||
      !resumeThreadId ||
      !resumeExecutionId ||
      !resumeSupportedByState
    ) {
      return
    }

    setResumePending(true)
    setRuntimeControlError(null)

    try {
      await runXpertRuntimeControlTransport({
        action: 'resume',
        conversationId: runtimeControlConversationId,
        xpertId: activeXpertId,
        resume: {
          threadId: resumeThreadId,
          executionId: resumeExecutionId
        }
      })

      ingestRuntimeControlResult({
        conversationId: runtimeControlConversationId,
        traceKey: taskRuntimeHints.traceKey,
        taskId: resumeExecutionId,
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
      !runtimeControlConversationId ||
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
        conversationId: runtimeControlConversationId,
        xpertId: activeXpertId,
        toolCalls: pendingToolCallIds.map(id => ({
          id,
          args: {
            approved
          }
        }))
      })

      ingestRuntimeControlResult({
        conversationId: runtimeControlConversationId,
        traceKey: taskRuntimeHints.traceKey,
        taskId: taskRuntimeHints.taskId,
        command: 'tool_call_update',
        status: 'running'
      })
    } catch (error) {
      setRuntimeControlError(normalizeUiError(error).message)
    } finally {
      setToolDecisionPending(null)
    }
  }

  const runtime = useChatbiStreamRuntime({
    xpertId: activeXpertId,
    conversationId,
    analysisFollowup: pendingAnalysisFollowup,
    onAnalysisFollowupConsumed: () => {
      setPendingAnalysisFollowup(undefined)
    },
    onConversationId: nextId => {
      setConversationId(current => current ?? nextId)
      void conversationsQuery.refetch()
      void turnsQuery.refetch()
    },
    onEvent: event => {
      ingestRuntimeEvent(event)

      if (event.event === 'start') {
        setEventsCollapsed(false)
        setQueryStatus(null)
        setFeedbackStatus(null)
        setRuntimeControlError(null)
        setResumePending(false)
        setToolDecisionPending(null)
        setDiagnosticsOpen(false)
        dispatchWorkbench({ type: 'QUERY_START' })
      }

      if (event.event === 'error') {
        const message = asString(event.data?.message) ?? '查询流执行失败'
        setQueryStatus(message)
        dispatchWorkbench({ type: 'ERROR' })
      }

      if (event.event === 'done') {
        const eventMeta = asRecord(event.data?.meta)
        const eventIntent = asRecord(eventMeta?.intent)
        const eventMode = deriveAnswerMode(event.data)
        const eventTraceKey = asString(eventMeta?.traceKey) ?? asString(eventMeta?.trace_id)
        const eventQueryLogId = asString(event.data?.queryLogId) ?? asString(eventMeta?.queryLogId)
        const eventConversation = asRecord(eventMeta?.conversation)
        const eventConversationId = asString(eventConversation?.conversationId)

        if (eventConversationId) {
          setConversationId(current => current ?? eventConversationId)
        }

        setWorkbenchIntentKind(asString(eventIntent?.kind))
        dispatchWorkbench({
          type: 'QUERY_DONE',
          payload: {
            intent: asString(eventIntent?.kind) ?? eventMode,
            traceKey: eventTraceKey,
            queryLogId: eventQueryLogId,
            requestId: asString(eventMeta?.requestId),
            statusMessage:
              eventMode === 'clarification'
                ? '已返回澄清信息'
                : '分析已完成'
          }
        })

        void conversationsQuery.refetch()
        void turnsQuery.refetch()
      }
    },
    onRuntimeError: error => {
      setQueryStatus(normalizeUiError(error).message)
      dispatchWorkbench({ type: 'ERROR' })
    }
  })

  useEffect(() => {
    if (!runtimeControlState.canResume) {
      setResumePending(false)
      setToolDecisionPending(null)
      setRuntimeControlError(null)
    }
  }, [runtimeControlState.canResume])

  const progressLabel = useMemo(() => formatProgress(lastEvent), [lastEvent])
  const turns = turnsQuery.data?.items ?? []
  const hasLiveTurns = turns.length > 0 || runtimeEvents.length > 0
  const showDiagnosticsLauncher =
    isStreaming ||
    runtimeEvents.length > 0 ||
    executionNodes.length > 0 ||
    taskRuntimeHints.statusHint !== 'idle' ||
    Boolean(doneTraceKey) ||
    Boolean(asString(intent?.kind)) ||
    Boolean(queryStatus)
  const conversations = conversationsQuery.data?.items ?? []
  const normalizedSearch = conversationSearch.trim().toLowerCase()
  const filteredConversations = useMemo(() => {
    if (!normalizedSearch) {
      return conversations
    }

    return conversations.filter(item => {
      const target = `${item.conversationId} ${item.memorySummary ?? ''}`.toLowerCase()
      return target.includes(normalizedSearch)
    })
  }, [conversations, normalizedSearch])
  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  )
  const groupedRuntimeEvents = useMemo(() => frontendPlatformAdapter.ask.groupRuntimeEvents(runtimeEvents), [runtimeEvents])
  const selectConversation = (nextConversationId: string) => {
    setConversationId(nextConversationId)
    clearRuntimeState()
    setQueryStatus(null)
    setFeedbackStatus(null)
    setEventsCollapsed(false)
    setAnalysisQueryLogId(undefined)
    setAnalysisTraceKey(undefined)
    setAnalysisDraft(undefined)
    setPendingAnalysisFollowup(undefined)
    setRuntimeControlError(null)
    setResumePending(false)
    setToolDecisionPending(null)
  }

  const copyConversationId = async (nextConversationId: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(nextConversationId)
      setCopiedConversationId(nextConversationId)
      window.setTimeout(() => {
        setCopiedConversationId(current => (current === nextConversationId ? null : current))
      }, 1600)
    } catch {
      setCopiedConversationId(null)
    }
  }

  const jumpToAssistantMessage = (entry: RuntimeEventEntry) => {
    if (typeof document === 'undefined') {
      return
    }

    const messageId =
      entry.event.event === 'progress'
        ? asString(entry.event.data.messageId)
        : entry.event.event === 'component'
          ? asString(entry.event.data.messageId)
          : undefined
    let target: HTMLElement | null = null

    if (messageId) {
      target = document.querySelector(`[data-server-message-id="${messageId}"]`) as HTMLElement | null
    }

    if (!target) {
      const assistantMessages = document.querySelectorAll<HTMLElement>('[data-testid="ask-assistant-message"]')
      if (assistantMessages.length > 0) {
        target = assistantMessages[assistantMessages.length - 1]
      }
    }

    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('chat-assistant-message-focus')
    window.setTimeout(() => {
      target?.classList.remove('chat-assistant-message-focus')
    }, 1200)
  }

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="chat-assistant-shell chat-assistant-shell-v2">
        <aside
          data-testid="ask-chat-sidebar-panel"
          data-contract="ask.sidebar.panel"
          className="chat-assistant-sidebar"
        >
          <div className="chat-assistant-sidebar-head">
            <div className="chat-assistant-sidebar-brand">
              <div className="chat-assistant-sidebar-brand-copy">
                <strong>PA Nexus</strong>
                <span>ChatBI · Assistant</span>
              </div>
              <Link href="/xpert/w" className="chat-assistant-sidebar-brand-action" aria-label="open workbench">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 6v12M6 12h12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
            <NexusInput
              data-testid="ask-conversation-search"
              placeholder="搜索会话..."
              value={conversationSearch}
              onChange={event => setConversationSearch(event.target.value)}
            />
            <div className="chat-assistant-sidebar-actions">
              <NexusButton
                data-testid="ask-new-conversation"
                type="button"
                variant="ghost"
                className="chat-assistant-new-button"
                onClick={() => {
                  setConversationId(undefined)
                  clearRuntimeState()
                  setEventsCollapsed(false)
                  setQueryStatus(null)
                  setFeedbackStatus(null)
                  setAnalysisQueryLogId(undefined)
                  setAnalysisTraceKey(undefined)
                  setAnalysisDraft(undefined)
                  setPendingAnalysisFollowup(undefined)
                  setRuntimeControlError(null)
                  setResumePending(false)
                  setToolDecisionPending(null)
                }}
              >
                新聊天
              </NexusButton>
              <Link href="/chat/tasks" className="chat-assistant-task-link">
                任务
              </Link>
            </div>
          </div>

          <div className="chat-assistant-sidebar-history">
            <strong className="chat-assistant-sidebar-title">历史</strong>
            <LoadablePanel
              loading={conversationsQuery.isLoading}
              error={conversationsQuery.error}
              empty={filteredConversations.length === 0}
              loadingLabel="加载会话..."
              emptyLabel={normalizedSearch ? '未匹配会话' : '暂无会话'}
              retry={() => {
                void conversationsQuery.refetch()
              }}
            >
              <div className="chat-assistant-conversation-list">
                {groupedConversations.map(group => (
                  <section key={group.label} className="chat-assistant-conversation-group">
                    <strong className="chat-assistant-conversation-group-title">{group.label}</strong>
                    <div className="chat-assistant-conversation-group-items">
                      {group.items.map(item => (
                        <article
                          key={item.conversationId}
                          className={`chat-assistant-conversation-item ${item.conversationId === conversationId ? 'is-active' : ''}`}
                        >
                          <button
                            data-testid={`ask-conversation-item-${item.conversationId}`}
                            type="button"
                            onClick={() => selectConversation(item.conversationId)}
                            className="chat-assistant-conversation-hit"
                          >
                            <strong className="chat-assistant-conversation-title">{item.memorySummary || item.conversationId}</strong>
                            <div className="chat-assistant-conversation-meta-row nx-shell-meta-row">
                              <p className="chat-assistant-conversation-id">{item.conversationId}</p>
                              {item.lastTurnAt ? (
                                <time className="chat-assistant-conversation-time">{formatConversationClock(item.lastTurnAt)}</time>
                              ) : null}
                            </div>
                          </button>
                          <div className="chat-assistant-conversation-actions nx-shell-meta-row">
                            <button
                              type="button"
                              className="chat-assistant-conversation-action"
                              onClick={() => selectConversation(item.conversationId)}
                            >
                              打开
                            </button>
                            <button
                              type="button"
                              className="chat-assistant-conversation-action"
                              onClick={() => {
                                void copyConversationId(item.conversationId)
                              }}
                            >
                              {copiedConversationId === item.conversationId ? '已复制' : '复制 ID'}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </LoadablePanel>
          </div>
        </aside>

        <AssistantRuntimeProvider runtime={runtime}>
          <section className="chat-assistant-main">
            <header
              data-testid="ask-chat-main-header"
              data-contract="ask.header.main"
              className="chat-assistant-header"
            >
              <div className="chat-assistant-header-spacer" />
              <div className="chat-assistant-header-meta nx-shell-meta-row">
                <div className="chat-assistant-header-search">
                  <NexusInput
                    data-testid="ask-search-launcher"
                    placeholder="搜索..."
                    value={conversationSearch}
                    onChange={event => setConversationSearch(event.target.value)}
                  />
                </div>
                <div className="chat-assistant-header-controls nx-shell-meta-row">
                  <h1 className="chat-assistant-page-title">Ask Workspace</h1>
                  <NexusBadge data-testid="ask-xpert-track-badge" tone="neutral" className="chat-contract-badge">
                    xpert /api
                  </NexusBadge>
                  {activeXpertId ? (
                    <NexusBadge data-testid="ask-xpert-target-badge" tone="brand" className="chat-contract-badge">
                      xpert: {activeXpertId}
                    </NexusBadge>
                  ) : null}
                  {conversationId ? (
                    <NexusBadge data-testid="ask-conversation-badge" tone="neutral" className="chat-conversation-badge">
                      会话: {conversationId}
                    </NexusBadge>
                  ) : null}
                  {conversationId ? (
                    <span data-testid="ask-conversation-id" className="chat-assistant-conversation-id">
                      {conversationId}
                    </span>
                  ) : null}
                  <NexusInput
                    data-testid="ask-xpert-target-input"
                    className="chat-assistant-mode-select"
                    placeholder="xpertId..."
                    value={xpertTargetInput}
                    onChange={event => setXpertTargetInput(event.target.value)}
                  />
                  <NexusButton
                    data-testid="ask-xpert-target-apply"
                    type="button"
                    variant="ghost"
                    onClick={() => applyXpertTarget(xpertTargetInput)}
                  >
                    绑定 xpert
                  </NexusButton>
                  {activeXpertId ? (
                    <NexusButton
                      data-testid="ask-xpert-target-clear"
                      type="button"
                      variant="ghost"
                      onClick={() => applyXpertTarget(undefined)}
                    >
                      清除
                    </NexusButton>
                  ) : null}
                  {showDiagnosticsLauncher ? (
                    <NexusButton
                      data-testid="ask-diagnostics-launcher"
                      type="button"
                      variant="ghost"
                      className="chat-assistant-diagnostics-launcher"
                      onClick={() => setDiagnosticsOpen(true)}
                    >
                      诊断{runtimeEvents.length > 0 ? ` · ${runtimeEvents.length}` : ''}
                    </NexusButton>
                  ) : null}
                  <button className="chat-assistant-avatar" type="button" aria-label="current user">
                    {userLabel.slice(0, 1).toUpperCase()}
                  </button>
                </div>
              </div>
            </header>

            <div
              data-testid="ask-chat-thread-stage"
              data-contract="ask.thread.stage"
              className="chat-assistant-stage chat-assistant-stage-v2"
            >
              <div className="chat-assistant-stage-inner">
                {!hasLiveTurns ? (
                  <div className="chat-assistant-welcome">
                    <span className="chat-assistant-hero-eyebrow">PA Nexus Assistant</span>
                    <h1 className="chat-assistant-welcome-title">下午好，{userLabel}.</h1>
                    <p className="chat-assistant-welcome-subtitle">今天我可以为您做些什么？</p>
                    <div className="chat-assistant-welcome-chips">
                      <NexusBadge tone="neutral">ChatBI 分析专家</NexusBadge>
                      <Link href="/xpert/w" className="chat-assistant-welcome-link">
                        去新建数字专家
                      </Link>
                      {progressLabel ? <NexusBadge tone="ok">{progressLabel}</NexusBadge> : null}
                    </div>
                  </div>
                ) : null}

                <ThreadPrimitive.Root className="chat-assistant-thread-root">
                  <ThreadPrimitive.Viewport
                    className={`chat-assistant-thread chat-assistant-thread-viewport ${hasLiveTurns ? 'is-active' : 'is-idle'}`}
                  >
                    <ThreadPrimitive.Empty>
                      <div className="chat-assistant-empty-tip">例如："去年每个月销售额走势"、"按区域对比本季收入"。</div>
                    </ThreadPrimitive.Empty>
                    <ThreadPrimitive.Messages
                      components={{
                        UserMessage: UserMessageCard,
                        AssistantMessage: AssistantMessageCard
                      }}
                    />
                  </ThreadPrimitive.Viewport>
                </ThreadPrimitive.Root>

                {showDiagnosticsLauncher && diagnosticsOpen ? (
                  <ThreadDiagnosticsDrawer open={diagnosticsOpen} onToggle={() => setDiagnosticsOpen(current => !current)}>
                    <div data-testid="ask-runtime-execution-panel">
                      <RuntimeExecutionPanel
                        conversationId={runtimeControlConversationId}
                        nodes={executionNodes}
                        runtimeControlState={runtimeControlState}
                        taskRuntimeHints={taskRuntimeHints}
                        runtimeControlActions={{
                          ...(runtimeControlState.canResume && !toolDecisionSupportedByState
                            ? {
                                resume: {
                                  ...(resumeUnavailableReason ? { disabledReason: resumeUnavailableReason } : {}),
                                  ...(resumeUnavailableReason ? {} : { onExecute: handleResumeRuntime }),
                                  pending: resumePending,
                                  error: runtimeControlError
                                }
                              }
                            : {}),
                          ...(runtimeControlState.canResume && toolDecisionSupportedByState
                            ? {
                                toolDecision: {
                                  ...(toolDecisionUnavailableReason ? { disabledReason: toolDecisionUnavailableReason } : {}),
                                  ...(toolDecisionUnavailableReason
                                    ? {}
                                    : { onConfirm: () => void handleToolDecisionRuntime(true) }),
                                  ...(toolDecisionUnavailableReason
                                    ? {}
                                    : { onReject: () => void handleToolDecisionRuntime(false) }),
                                  pending: toolDecisionPending,
                                  error: runtimeControlError
                                }
                              }
                            : {})
                        }}
                      />
                    </div>

                    {runtimeEvents.length > 0 ? (
                      <NexusCard
                        data-testid="ask-events-timeline"
                        className="chat-assistant-panel chat-assistant-events-panel nx-shell-panel"
                      >
                        <div className="chat-assistant-events-head">
                          <strong className="chat-assistant-events-title">执行证据</strong>
                          <div className="chat-assistant-events-head-actions">
                            <NexusBadge tone="neutral">近 24 条</NexusBadge>
                            <NexusButton
                              data-testid="ask-events-toggle"
                              type="button"
                              variant="ghost"
                              className="chat-assistant-events-toggle"
                              onClick={() => setEventsCollapsed(current => !current)}
                            >
                              {eventsCollapsed ? '展开' : '收起'}
                            </NexusButton>
                          </div>
                        </div>

                        {eventsCollapsed ? (
                          <div className="chat-assistant-events-collapsed">已折叠</div>
                        ) : (
                          <div className="chat-assistant-events-groups">
                            {groupedRuntimeEvents.map(group => (
                              <section
                                key={group.key}
                                data-testid={`ask-events-group-${group.key}`}
                                className="chat-assistant-events-group"
                              >
                                <div className="chat-assistant-events-group-head">
                                  <NexusBadge tone="neutral">{group.label}</NexusBadge>
                                  <span className="chat-assistant-events-group-count">{group.items.length}</span>
                                </div>
                                <div className="chat-assistant-events-list">
                                  {group.items.map(entry => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      data-testid={`ask-event-item-${entry.id}`}
                                      className="chat-assistant-event-item"
                                      onClick={() => jumpToAssistantMessage(entry)}
                                    >
                                      <div className="chat-assistant-event-main">
                                        <NexusBadge tone={frontendPlatformAdapter.ask.resolveRuntimeEventTone(entry.event)}>
                                          {entry.event.event}
                                        </NexusBadge>
                                        <span className="chat-assistant-event-label">
                                          {frontendPlatformAdapter.ask.formatRuntimeEventLabel(entry.event)}
                                        </span>
                                      </div>
                                      <time className="chat-assistant-event-time">
                                        {frontendPlatformAdapter.ask.formatRuntimeEventClock(entry.receivedAt)}
                                      </time>
                                    </button>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        )}
                      </NexusCard>
                    ) : null}
                  </ThreadDiagnosticsDrawer>
                ) : null}

                {analysisQueryLogId ? (
                  <ThreadAnalysisFollowupCard
                    queryLogId={analysisQueryLogId}
                    traceKey={analysisTraceKey}
                    messageId={activeMessageId}
                  >
                    <AnalysisConsoleSection
                      enabled={true}
                      modelId={undefined}
                      queryLogId={analysisQueryLogId}
                      baseQueryLogId={analysisQueryLogId}
                      traceKey={analysisTraceKey}
                      initialDraft={analysisDraft}
                      onQueueAnalysisFollowup={draft => {
                        setPendingAnalysisFollowup(draft)
                      }}
                    />
                  </ThreadAnalysisFollowupCard>
                ) : null}
              </div>
            </div>

            <footer
              data-testid="ask-chat-composer-dock"
              data-contract="ask.composer.dock"
              className="chat-assistant-dock chat-assistant-dock-v2"
            >
              <div className="chat-assistant-telemetry-strip" aria-hidden="true" />
              <ComposerPrimitive.Root className="chat-assistant-composer">
                <ComposerPrimitive.Input
                  data-testid="ask-input"
                  placeholder="请输入自然语言问题..."
                  rows={2}
                  disabled={isStreaming}
                  className="chat-assistant-composer-input"
                />
                <ComposerPrimitive.Send asChild>
                  <button
                    data-testid="ask-submit"
                    type="submit"
                    aria-label="发送消息"
                    disabled={isStreaming}
                    className="chat-assistant-send"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 18V8M12 8l-4 4M12 8l4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </ComposerPrimitive.Send>
              </ComposerPrimitive.Root>

              {!isStreaming ? <SuggestedQuestionsBar questions={suggestionsQuery.data ?? []} /> : null}
              {!isStreaming && activeMessageId ? (
                <NexusCard className="chat-assistant-panel chat-assistant-feedback-panel nx-shell-panel">
                  <strong className="chat-assistant-feedback-title">回答反馈</strong>
                  {!activeMessageId ? (
                    <NexusBadge tone="neutral" className="chat-assistant-feedback-current">
                      等待助手消息完成后可反馈
                    </NexusBadge>
                  ) : (
                    <>
                      <div className="chat-assistant-feedback-actions">
                        <NexusButton
                          data-testid="ask-feedback-like"
                          type="button"
                          variant="secondary"
                          className="chat-assistant-feedback-action"
                          disabled={feedbackMutation.isPending}
                          onClick={() => feedbackMutation.mutate('LIKE')}
                        >
                          赞同
                        </NexusButton>
                        <NexusButton
                          data-testid="ask-feedback-dislike"
                          type="button"
                          variant="secondary"
                          className="chat-assistant-feedback-action"
                          disabled={feedbackMutation.isPending}
                          onClick={() => feedbackMutation.mutate('DISLIKE')}
                        >
                          反对
                        </NexusButton>
                      </div>
                      {feedbackQuery.data ? (
                        <NexusBadge tone="neutral" className="chat-assistant-feedback-current">
                          当前反馈: {feedbackQuery.data.rating}
                        </NexusBadge>
                      ) : (
                        <NexusBadge tone="neutral" className="chat-assistant-feedback-current">
                          当前无反馈
                        </NexusBadge>
                      )}
                    </>
                  )}
                  {feedbackStatus ? (
                    <NexusBadge data-testid="ask-feedback-status" tone="ok" className="chat-assistant-feedback-status">
                      {feedbackStatus}
                    </NexusBadge>
                  ) : null}
                </NexusCard>
              ) : null}
            </footer>
          </section>
        </AssistantRuntimeProvider>
      </section>
    </AccessGuard>
  )
}

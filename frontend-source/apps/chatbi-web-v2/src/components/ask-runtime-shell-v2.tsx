'use client'

import { AssistantRuntimeProvider, ComposerPrimitive, ThreadPrimitive } from '@assistant-ui/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThreadMessageLike } from '@assistant-ui/react'
import type { ChatStreamEvent, RuntimeEventEntry } from '@/lib/chat-runtime-bridge'
import { useChatRuntimeStore, useChatbiStreamRuntime } from '@/lib/chat-runtime-bridge'
import { listConversationThreadMessages } from '@/lib/ask-data'
import { frontendPlatformAdapter } from '@/lib/platform-adapter-bridge'
import {
  SvgArrowUpV2,
  SvgChatbiMarkV2,
  SvgChevronDownV2,
  SvgCopyV2,
  SvgHourglassV2,
  SvgPlusV2,
  SvgRotateV2,
  SvgSearchMenuV2,
  SvgStopV2,
  SvgThumbDownV2,
  SvgThumbUpV2
} from './onyx/icons'
import { OnyxAppInputBarV2 } from './onyx/onyx-app-input-bar-v2'
import { OnyxSelectButtonV2 } from './onyx/onyx-select-button-v2'
import { AssistantMessageCardV2, UserMessageCardV2 } from './ask-message-renderer-v2'
import { AskRuntimeContextProviderV2 } from './ask-runtime-context-v2'
import { OnyxDonorCardV2 } from './onyx-donor/onyx-donor-card-v2'
import { OnyxDonorQuestionCardV2 } from './onyx-donor/onyx-donor-question-card-v2'

type AskRuntimeShellV2Props = {
  activeXpertId?: string
  initialConversationId?: string
  mockChatScenario?: string
  mockChatLatencyMs?: number
  onConversationIdChange?: (conversationId?: string) => void
  handoff: {
    queryLogId?: string
    traceKey?: string
    analysisDraft?: string
  }
  shellAnchors: {
    askThreadStage: string
    askDiagnosticsDrawer: string
    askComposerDock: string
  }
  renderRail?: boolean
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function formatProgress(event: ChatStreamEvent | null) {
  if (!event || event.event !== 'progress') {
    return null
  }

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

  return `${phaseLabel}: ${event.data.message ?? '运行中'}`
}

export function AskRuntimeShellV2({
  activeXpertId,
  initialConversationId,
  mockChatScenario,
  mockChatLatencyMs,
  onConversationIdChange,
  handoff,
  shellAnchors,
  renderRail = true
}: AskRuntimeShellV2Props) {
  const [initialMessages, setInitialMessages] = useState<readonly ThreadMessageLike[] | undefined>(undefined)
  const [historyLoadState, setHistoryLoadState] = useState<'idle' | 'loading' | 'ready'>(
    initialConversationId ? 'loading' : 'idle'
  )
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!initialConversationId) {
      setInitialMessages(undefined)
      setHistoryLoadState('idle')
      setHistoryLoadError(null)
      return
    }

    setHistoryLoadState('loading')
    setHistoryLoadError(null)

    void listConversationThreadMessages(initialConversationId)
      .then(messages => {
        if (cancelled) {
          return
        }
        setInitialMessages(messages)
        setHistoryLoadState('ready')
      })
      .catch(error => {
        if (cancelled) {
          return
        }
        setInitialMessages([])
        setHistoryLoadState('ready')
        setHistoryLoadError(error instanceof Error ? error.message : '加载会话历史失败。')
      })

    return () => {
      cancelled = true
    }
  }, [initialConversationId])

  if (initialConversationId && historyLoadState === 'loading') {
    return (
      <HistoryLoadingStateV2 renderRail={renderRail} shellAnchors={shellAnchors}>
        正在加载会话历史...
      </HistoryLoadingStateV2>
    )
  }

  return (
    <AskRuntimeShellSessionV2
      key={initialConversationId ?? 'new-session'}
      activeXpertId={activeXpertId}
      initialConversationId={initialConversationId}
      mockChatScenario={mockChatScenario}
      mockChatLatencyMs={mockChatLatencyMs}
      onConversationIdChange={onConversationIdChange}
      initialMessages={initialMessages}
      historyLoadError={historyLoadError}
      handoff={handoff}
      shellAnchors={shellAnchors}
      renderRail={renderRail}
    />
  )
}

function HistoryLoadingStateV2({
  shellAnchors,
  renderRail,
  children
}: {
  shellAnchors: AskRuntimeShellV2Props['shellAnchors']
  renderRail: boolean
  children: ReactNode
}) {
  return (
    <section className="v2-runtime-stage" data-contract={shellAnchors.askThreadStage}>
      <div className="v2-runtime-thread">
        <div className="v2-runtime-thread-root">
          <OnyxDonorCardV2
            className="onyx-native-donor-thread-viewport-shell"
            data-testid="onyx-native-donor-thread-viewport-shell"
            padding="none"
            variant="borderless"
          >
            <div className="v2-runtime-thread-viewport">
              <div className="v2-runtime-empty">{children}</div>
            </div>
          </OnyxDonorCardV2>
        </div>
        <footer className="v2-runtime-composer-dock" data-contract={shellAnchors.askComposerDock}>
          <OnyxAppInputBarV2
            input={
              <textarea
                className="onyx-runtime-composer-input"
                data-testid="ask-v2-input"
                disabled
                placeholder="继续追问"
                rows={1}
              />
            }
          />
        </footer>
      </div>
      {renderRail ? <aside className="v2-diagnostics" data-contract={shellAnchors.askDiagnosticsDrawer} /> : null}
    </section>
  )
}

function DiagnosticsRailCardV2({
  title,
  testId,
  children
}: {
  title: string
  testId: string
  children: ReactNode
}) {
  return (
    <OnyxDonorCardV2
      className="onyx-native-donor-rail-card"
      data-testid={`onyx-native-donor-rail-card-${testId}`}
      padding="sm"
      variant="secondary"
    >
      <div className="onyx-native-donor-rail-card-stack" data-testid="onyx-native-donor-rail-card-stack">
        <div className="v2-section-title">{title}</div>
        {children}
      </div>
    </OnyxDonorCardV2>
  )
}

function AskRuntimeShellSessionV2({
  activeXpertId,
  initialConversationId,
  mockChatScenario,
  mockChatLatencyMs,
  onConversationIdChange,
  initialMessages,
  historyLoadError,
  handoff,
  shellAnchors,
  renderRail = true
}: AskRuntimeShellV2Props & {
  initialMessages?: readonly ThreadMessageLike[]
  historyLoadError?: string | null
}) {
  const runtimeEvents = useChatRuntimeStore(state => state.runtimeEvents as RuntimeEventEntry[])
  const lastEvent = useChatRuntimeStore(state => state.lastEvent as ChatStreamEvent | null)
  const isStreaming = useChatRuntimeStore(state => state.isStreaming as boolean)
  const ingestEvent = useChatRuntimeStore(state => state.ingestEvent as (event: ChatStreamEvent) => void)
  const clearRuntimeState = useChatRuntimeStore(state => state.clearRuntimeState as () => void)

  const [conversationId, setConversationId] = useState<string | undefined>(() => initialConversationId)
  const [queryStatus, setQueryStatus] = useState<string | null>(historyLoadError ?? null)

  const runtime = useChatbiStreamRuntime({
    xpertId: activeXpertId,
    conversationId,
    mockChatScenario,
    mockChatLatencyMs,
    initialMessages,
    onConversationId: nextId => {
      setConversationId(current => (current === nextId ? current : nextId))
    },
    onEvent: event => {
      ingestEvent(event)

      if (event.event === 'start') {
        setQueryStatus(null)
      }

      if (event.event === 'error') {
        setQueryStatus(asString(event.data?.message) ?? '查询流失败')
      }
    },
    onRuntimeError: error => {
      setQueryStatus(error.message)
    }
  })

  useEffect(() => {
    setQueryStatus(historyLoadError ?? null)
  }, [historyLoadError])

  useEffect(() => {
    onConversationIdChange?.(conversationId)
  }, [conversationId, onConversationIdChange])

  useEffect(() => {
    return () => {
      clearRuntimeState()
    }
  }, [clearRuntimeState])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams()
    if (activeXpertId) {
      params.set('xpertId', activeXpertId)
    }
    if (conversationId) {
      params.set('conversationId', conversationId)
    }
    if (handoff.queryLogId) {
      params.set('queryLogId', handoff.queryLogId)
    }
    if (handoff.traceKey) {
      params.set('traceKey', handoff.traceKey)
    }
    if (handoff.analysisDraft) {
      params.set('analysisDraft', handoff.analysisDraft)
    }

    const search = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
  }, [activeXpertId, conversationId, handoff.analysisDraft, handoff.queryLogId, handoff.traceKey])

  const progressLabel = useMemo(() => formatProgress(lastEvent), [lastEvent])
  const activeHandoffEntries = useMemo(
    () =>
      [
        ['queryLogId', handoff.queryLogId],
        ['traceKey', handoff.traceKey],
        ['analysisDraft', handoff.analysisDraft]
      ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== ''),
    [handoff.analysisDraft, handoff.queryLogId, handoff.traceKey]
  )
  const surfaceCards = useMemo(
    () => {
      const cards = [
        frontendPlatformAdapter.resources.build('ask-conversations', {
          xpertId: activeXpertId ?? 'default-workspace'
        }),
        frontendPlatformAdapter.resources.build('xpert-toolset-by-workspace', {
          workspaceId: activeXpertId ?? 'default-workspace'
        })
      ]

      if (conversationId) {
        cards.push(frontendPlatformAdapter.resources.build('analysis-conversations', { conversationId }))
      }
      if (handoff.traceKey) {
        cards.push(frontendPlatformAdapter.resources.build('trace-detail', { traceKey: handoff.traceKey }))
      }

      return cards
    },
    [activeXpertId, conversationId, handoff.traceKey]
  )
  const isOnyxCenterMode = renderRail === false
  const showWelcomeState = !conversationId && !isStreaming

  const welcomeSummary =
    activeXpertId && activeXpertId.trim() !== ''
      ? `镜元智算已连接到 ${activeXpertId} 工作区运行时。`
      : '镜元智算已连接平台运行时和语义分析栈。'

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskRuntimeContextProviderV2 value={{ conversationId }}>
        <section className="v2-runtime-stage" data-contract={shellAnchors.askThreadStage}>
          <div className="v2-runtime-thread">
            <ThreadPrimitive.Root className="v2-runtime-thread-root">
              <OnyxDonorCardV2
                className="onyx-native-donor-thread-header-shell"
                data-testid="onyx-native-donor-thread-header-shell"
                padding="none"
                variant="borderless"
              >
                <div className="onyx-native-donor-thread-header-stack" data-testid="onyx-native-donor-thread-header-stack">
                  <div className="v2-runtime-thread-header-row">
                    <div className="v2-runtime-thread-header-copy">
                      <SvgChatbiMarkV2 size={18} />
                      <span>对话</span>
                    </div>
                  </div>
                </div>
              </OnyxDonorCardV2>
              <OnyxDonorCardV2
                className="onyx-native-donor-thread-viewport-shell"
                data-testid="onyx-native-donor-thread-viewport-shell"
                padding="none"
                variant="borderless"
              >
                <ThreadPrimitive.Viewport
                  className="v2-runtime-thread-viewport onyx-donor-runtime-thread-viewport"
                  data-testid="onyx-donor-runtime-thread-viewport"
                >
                  <ThreadPrimitive.Empty>
                    {showWelcomeState ? (
                      <div className="onyx-runtime-empty-state onyx-donor-welcome-stack" data-testid="onyx-donor-welcome-stack">
                      <div className="onyx-runtime-empty-question" data-testid="onyx-runtime-welcome-question-chip">
                        <OnyxDonorQuestionCardV2
                          body="镜元智算能做什么？"
                          meta="欢迎提问"
                          title="问题"
                        />
                      </div>
                        <OnyxDonorCardV2
                          className="onyx-runtime-empty-answer onyx-native-donor-welcome-answer-card"
                          data-testid="onyx-runtime-welcome-answer-card"
                          padding="md"
                          variant="primary"
                        >
                          <div data-testid="onyx-native-donor-welcome-answer-card">
                            <div className="onyx-runtime-empty-answer-head">
                              <span className="onyx-runtime-empty-mark">
                                <SvgChatbiMarkV2 size={18} />
                              </span>
                              <span className="onyx-runtime-empty-search">已检索：镜元智算</span>
                            </div>
                            <div className="onyx-runtime-empty-copy onyx-donor-welcome-copy-block" data-testid="onyx-donor-welcome-copy-block">
                              <p>{welcomeSummary}</p>
                              <ul>
                                <li>
                                  <strong>实时展示问答运行事件：</strong>通过镜元智算对话工作台呈现。
                                </li>
                                <li>
                                  <strong>嵌入图表、KPI 和表格回答：</strong>直接呈现在助手消息中。
                                </li>
                                <li>
                                  <strong>保留追踪和来源上下文：</strong>点击回答来源后在右侧来源栏查看。
                                </li>
                              </ul>
                            </div>
                            <div className="onyx-donor-welcome-toolbar-row-shell" data-testid="onyx-donor-welcome-toolbar-row">
                              <div className="onyx-runtime-empty-actions onyx-donor-welcome-toolbar-row" data-testid="ask-runtime-toolbar">
                                <div className="onyx-runtime-empty-toolbar">
                                  <OnyxSelectButtonV2 aria-label="复制回答" icon={SvgCopyV2} onClick={() => {}} size="sm" variant="select-light" />
                                  <OnyxSelectButtonV2 aria-label="有帮助" icon={SvgThumbUpV2} onClick={() => {}} size="sm" variant="select-light" />
                                  <OnyxSelectButtonV2 aria-label="需要改进" icon={SvgThumbDownV2} onClick={() => {}} size="sm" variant="select-light" />
                                  <OnyxSelectButtonV2 aria-label="重新生成" icon={SvgRotateV2} onClick={() => {}} size="sm" variant="select-light" />
                                </div>
                                <OnyxSelectButtonV2
                                  data-testid="onyx-runtime-welcome-source-button"
                                  size="sm"
                                  state="selected"
                                  variant="select-light"
                                >
                                  回答来源
                                </OnyxSelectButtonV2>
                              </div>
                            </div>
                          </div>
                        </OnyxDonorCardV2>
                        <OnyxDonorCardV2
                          className="onyx-runtime-welcome-note onyx-native-donor-welcome-secondary-card"
                          data-testid="ask-runtime-welcome-secondary-card"
                          padding="md"
                          variant="secondary"
                        >
                          <div data-testid="onyx-native-donor-welcome-secondary-card">
                            <div className="onyx-runtime-welcome-note-head">
                              <div className="onyx-runtime-welcome-note-title">正在梳理镜元智算能力...</div>
                              <button className="onyx-runtime-welcome-note-toggle" type="button">
                                <SvgChevronDownV2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="onyx-runtime-welcome-note-body">
                              工作台已就绪，可在同一消息时间线中展示澄清步骤、分析证据和内联图表更新。
                            </div>
                          </div>
                        </OnyxDonorCardV2>
                      </div>
                    ) : !isOnyxCenterMode ? (
                      <div className="v2-runtime-empty">
                        可以试着询问趋势、差异原因，或让系统生成带图表的分析。
                      </div>
                    ) : null}
                  </ThreadPrimitive.Empty>
                  <ThreadPrimitive.Messages
                    components={{
                      UserMessage: UserMessageCardV2,
                      AssistantMessage: AssistantMessageCardV2
                    }}
                  />
                </ThreadPrimitive.Viewport>
              </OnyxDonorCardV2>
            </ThreadPrimitive.Root>

            <footer
              className="v2-runtime-composer-dock onyx-donor-welcome-composer-dock"
              data-contract={shellAnchors.askComposerDock}
              data-testid="onyx-donor-welcome-composer-dock"
            >
              <ComposerPrimitive.Root className="onyx-composer">
                <OnyxAppInputBarV2
                  input={
                    <ComposerPrimitive.Input
                      data-testid="ask-v2-input"
                      placeholder={isOnyxCenterMode ? '继续追问' : '询问指标、趋势、差异原因或治理证据...'}
                      rows={1}
                      disabled={isStreaming}
                      className="onyx-runtime-composer-input"
                    />
                  }
                  leftControls={
                    <div className="onyx-donor-composer-controls-left" data-testid="onyx-donor-composer-controls-left">
                      <div className="onyx-composer-footer-group" data-testid="actions-container" data-interactive-group="primary">
                        <button className="onyx-composer-icon-button" data-testid="ask-runtime-composer-attach-button" type="button">
                          <SvgPlusV2 className="h-4 w-4" />
                        </button>
                        <button className="onyx-composer-icon-button" data-testid="ask-runtime-composer-tune-button" type="button">
                          <SvgSearchMenuV2 className="h-4 w-4" />
                        </button>
                        <OnyxSelectButtonV2 icon={SvgHourglassV2} state="selected" variant="select-light">
                          深度研究
                        </OnyxSelectButtonV2>
                      </div>
                    </div>
                  }
                  rightControls={
                    <div className="onyx-donor-composer-controls-right" data-testid="onyx-donor-composer-controls-right">
                      <div className="onyx-composer-footer-group" data-testid="ask-runtime-composer-secondary-controls">
                        <OnyxSelectButtonV2 rightIcon={SvgChevronDownV2} variant="select-light">
                          GPT-5
                        </OnyxSelectButtonV2>
                        <span className="onyx-donor-composer-send-shell-wrap" data-testid="onyx-donor-composer-send-shell">
                          <ComposerPrimitive.Send asChild>
                            <button
                              aria-label={isStreaming ? '停止生成' : '发送消息'}
                              className="onyx-send onyx-donor-composer-send"
                              data-testid="ask-v2-submit"
                              disabled={isStreaming}
                              id="onyx-chat-input-send-button"
                              type="submit"
                            >
                              <span className="onyx-donor-composer-send-glyph" data-testid="onyx-donor-composer-send-glyph">
                                {isStreaming ? <SvgStopV2 className="h-4 w-4" /> : <SvgArrowUpV2 className="h-4 w-4" />}
                              </span>
                            </button>
                          </ComposerPrimitive.Send>
                        </span>
                      </div>
                    </div>
                  }
                />
              </ComposerPrimitive.Root>
            </footer>
          </div>

          {renderRail ? (
            <aside className="v2-diagnostics" data-contract={shellAnchors.askDiagnosticsDrawer}>
              <DiagnosticsRailCardV2 title="活跃交接" testId="active-handoff">
                <div className="v2-rail-list">
                  {activeHandoffEntries.length > 0 ? (
                    activeHandoffEntries.map(([key, value]) => (
                      <div className="v2-rail-item" key={key}>
                        <div className="v2-resource-label">{key}</div>
                        <div className="v2-resource-path">{value}</div>
                      </div>
                    ))
                  ) : (
                    <div className="v2-rail-item">
                      <span>暂无活跃分析交接。</span>
                    </div>
                  )}
                </div>
              </DiagnosticsRailCardV2>

              <DiagnosticsRailCardV2 title="运行状态" testId="runtime-status">
                {queryStatus ? <div className="v2-runtime-error">{queryStatus}</div> : null}
                <div className="v2-rail-list">
                  <div className="v2-rail-item">
                    <div className="v2-resource-label">状态</div>
                    <div className="v2-resource-path">{progressLabel ?? '空闲'}</div>
                  </div>
                  <div className="v2-rail-item">
                    <div className="v2-resource-label">事件</div>
                    <div className="v2-resource-path">{runtimeEvents.length}</div>
                  </div>
                </div>
              </DiagnosticsRailCardV2>

              <DiagnosticsRailCardV2 title="资源请求" testId="resource-requests">
                <div className="v2-rail-list">
                  {surfaceCards.map(item => (
                    <div className="v2-rail-item" key={item.id}>
                      <div className="v2-resource-label">
                        {item.id} · {item.track}
                      </div>
                      <div className="v2-resource-path">{item.path}</div>
                      <div className="v2-muted">{item.owner}</div>
                    </div>
                  ))}
                </div>
              </DiagnosticsRailCardV2>
            </aside>
          ) : null}
        </section>
      </AskRuntimeContextProviderV2>
    </AssistantRuntimeProvider>
  )
}

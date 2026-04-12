import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantMessageCardV2, UserMessageCardV2 } from '../ask-message-renderer-v2'

const { useMessageMock, useAuiMock } = vi.hoisted(() => ({
  useMessageMock: vi.fn(),
  useAuiMock: vi.fn()
}))
const { useChatRuntimeStoreMock, selectMessageStepsByMessageIdMock } = vi.hoisted(() => ({
  useChatRuntimeStoreMock: vi.fn(),
  selectMessageStepsByMessageIdMock: vi.fn()
}))
const { askMessageFeedbackMock } = vi.hoisted(() => ({
  askMessageFeedbackMock: vi.fn()
}))
const { clarificationCardPropsMock } = vi.hoisted(() => ({
  clarificationCardPropsMock: vi.fn()
}))

vi.mock('@assistant-ui/react', () => ({
  useMessage: useMessageMock,
  useAui: useAuiMock
}))

vi.mock('@/modules/chat/runtime/chat-runtime-store', () => ({
  useChatRuntimeStore: useChatRuntimeStoreMock,
  selectMessageStepsByMessageId: selectMessageStepsByMessageIdMock
}))

vi.mock('@/lib/chat-runtime-bridge', () => ({
  splitAssistantTextWithEcharts: (text: string) => [{ kind: 'text', text }],
  ChartAnswerComponent: () => React.createElement('div', { 'data-testid': 'chart-answer-component' }),
  ClarificationCard: (props: { clarification: { message: string }; onApplyHint?: (hint: string) => void }) => {
    clarificationCardPropsMock(props)
    return React.createElement('div', { 'data-testid': 'clarification-card' }, props.clarification.message)
  }
}))

vi.mock('../analysis-component-card-v2', () => ({
  AnalysisComponentCardV2: () => React.createElement('div', { 'data-testid': 'analysis-component-card' })
}))

vi.mock('../ask-message-feedback-v2', () => ({
  AskMessageFeedbackV2: (props: unknown) => {
    askMessageFeedbackMock(props)
    return React.createElement('div', { 'data-testid': 'feedback-row' }, 'feedback')
  }
}))

vi.mock('../ask-runtime-context-v2', () => ({
  useAskRuntimeContextV2: () => ({ conversationId: 'conv-1' })
}))

beforeEach(() => {
  vi.clearAllMocks()
  useChatRuntimeStoreMock.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      messageStepsByMessageId: {}
    })
  )
  selectMessageStepsByMessageIdMock.mockReturnValue([])
})

function countOccurrences(text: string, pattern: string) {
  return text.split(pattern).length - 1
}

describe('ask message renderer v2', () => {
  it('renders the human message with donor onyx-human-message semantics', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'text', text: 'Show revenue by month' }]
    })

    const markup = renderToStaticMarkup(<UserMessageCardV2 />)

    expect(markup).toContain('id="onyx-human-message"')
    expect(markup).toContain('data-testid="onyx-native-donor-user-message-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-user-message-bubble"')
    expect(markup).toContain('class="onyx-native-donor-card onyx-native-donor-card-secondary onyx-native-donor-user-message-card max-w-[30rem] md:max-w-[37.5rem]"')
    expect(markup).toContain('class="onyx-native-donor-user-message-bubble"')
    expect(markup).toContain('Show revenue by month')
  })

  it('renders the assistant message with donor markdown container and ai message markers', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'text', text: 'Revenue is up 12% month over month.' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }
      ],
      status: { type: 'complete' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-ai-message"')
    expect(markup).toContain('data-testid="onyx-donor-message-shell"')
    expect(markup).toContain('data-testid="onyx-donor-message-avatar-column"')
    expect(markup).toContain('data-testid="onyx-donor-message-main-column"')
    expect(markup).toContain('data-testid="onyx-donor-message-row-1"')
    expect(markup).toContain('data-testid="ask-assistant-markdown"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-shell"')
    expect(markup).toContain('data-testid="onyx-donor-markdown-ref"')
    expect(markup).toContain('data-testid="onyx-donor-markdown-root"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-body"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-content-stack"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-ref"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-stack"')
    expect(markup).toContain('class="onyx-donor-final-answer-shell-surface overflow-x-visible focus:outline-none select-text cursor-text px-3"')
    expect(markup).toContain('class="onyx-donor-final-answer-body flex flex-col gap-3"')
    expect(markup).toContain('class="onyx-donor-final-answer-content-stack flex flex-col gap-3"')
    expect(markup).toContain('class="onyx-donor-message-shell flex flex-col gap-3"')
    expect(markup).toContain('class="onyx-donor-message-row-1 flex w-full gap-3"')
    expect(markup).toContain('class="onyx-donor-message-avatar-column flex h-6 w-6 shrink-0 items-start justify-center pt-1 text-text-01"')
    expect(markup).toContain('class="onyx-donor-message-main-column flex min-w-0 max-w-[720px] flex-1 flex-col gap-3"')
    expect(markup).toContain('data-testid="onyx-donor-message-row-2"')
    expect(markup).toContain('class="onyx-donor-row-2 flex w-full flex-col gap-4"')
    expect(markup).toContain('data-testid="onyx-native-donor-message-body-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-message-body-stack"')
    expect(markup).toContain('class="onyx-native-donor-card onyx-native-donor-card-borderless onyx-native-donor-message-body-card"')
    expect(markup).toContain('class="onyx-native-donor-message-body-stack"')
    expect(markup).toContain('data-testid="onyx-donor-toolbar-slot"')
    expect(markup).toContain('class="onyx-donor-toolbar-slot w-full pl-1 pt-1"')
    expect(markup).toContain('data-testid="feedback-row"')
    expect(markup.indexOf('data-testid=\"onyx-donor-final-answer-shell\"')).toBeLessThan(markup.indexOf('data-testid=\"onyx-donor-toolbar-slot\"'))
    expect(markup).toContain('Revenue is up 12% month over month.')
  })

  it('renders adjacent streamed text parts as one donor markdown block with preserved spacing', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'text', text: 'This ' },
        { type: 'text', text: 'workspace ' },
        { type: 'text', text: 'runtime.' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-stream-joined-1' } }
      ],
      status: { type: 'complete' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(countOccurrences(markup, 'data-testid="onyx-donor-markdown-renderer"')).toBe(1)
    expect(markup).toContain('This workspace runtime.')
  })

  it('hides the donor footer toolbar while the assistant answer is still streaming', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'text', text: 'Revenue is still loading.' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-streaming-1' } }
      ],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-donor-final-answer-shell"')
    expect(markup).toContain('data-testid="onyx-donor-markdown-ref"')
    expect(markup).toContain('data-testid="onyx-donor-markdown-root"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-body"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-content-stack"')
    expect(markup).toContain('data-testid="onyx-donor-final-answer-ref"')
    expect(markup).toContain('data-testid="onyx-donor-message-shell"')
    expect(markup).toContain('data-testid="onyx-donor-message-row-1"')
    expect(markup).toContain('data-testid="onyx-donor-message-main-column"')
    expect(markup).toContain('data-testid="onyx-donor-message-row-2"')
    expect(markup).toContain('class="onyx-donor-row-2 flex w-full flex-col gap-4"')
    expect(markup).toContain('data-testid="onyx-native-donor-message-body-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-message-body-stack"')
    expect(markup).not.toContain('data-testid="onyx-donor-toolbar-slot"')
    expect(markup).not.toContain('data-testid="feedback-row"')
  })

  it('wraps non-chart final-answer content in donor answer sections by content kind', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-structured-1' } },
        { type: 'data', name: 'chatbi_timeline_marker', data: { order: 10 } },
        { type: 'text', text: 'Need one more filter before I can finalize the answer.' },
        {
          type: 'data',
          name: 'chatbi_clarification',
          data: {
            required: true,
            message: 'Choose a region',
            missingSlots: ['region']
          }
        },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'table',
            payload: {
              label: 'Regional revenue breakdown',
              queryLogId: 'query-log-table-1'
            }
          }
        }
      ],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(countOccurrences(markup, 'data-testid="onyx-donor-answer-section"')).toBe(4)
    expect(countOccurrences(markup, 'data-testid="onyx-donor-display-group-renderer"')).toBe(4)
    expect(countOccurrences(markup, 'data-testid="onyx-donor-display-group-result"')).toBe(4)
    expect(countOccurrences(markup, 'data-testid="onyx-donor-display-group-body"')).toBe(4)
    expect(markup).toContain('data-section-kind="markdown"')
    expect(markup).toContain('data-section-kind="clarification"')
    expect(markup).toContain('data-section-kind="analysis"')
    expect(markup).toContain('data-section-kind="status"')
    expect(markup).toContain('class="onyx-donor-display-group onyx-donor-display-group-markdown flex w-full flex-col gap-3"')
    expect(markup).toContain('class="onyx-donor-display-group-result onyx-donor-display-group-result-surface w-full"')
    expect(markup).toContain('class="onyx-donor-display-group-body onyx-donor-display-group-body-stack flex w-full flex-col gap-3"')
    expect(markup).toContain(
      'class="onyx-donor-answer-section onyx-donor-answer-section-markdown onyx-donor-answer-section-surface flex w-full flex-col gap-3"'
    )
    expect(markup).toContain(
      'class="onyx-donor-answer-section onyx-donor-answer-section-clarification onyx-donor-answer-section-surface flex w-full flex-col gap-3"'
    )
    expect(markup).toContain(
      'class="onyx-donor-answer-section onyx-donor-answer-section-analysis onyx-donor-answer-section-surface flex w-full flex-col gap-3"'
    )
    expect(markup).toContain(
      'class="onyx-donor-answer-section onyx-donor-answer-section-status onyx-donor-answer-section-surface flex w-full flex-col gap-3"'
    )
    expect(markup).toContain('data-testid="onyx-donor-markdown-renderer"')
    expect(markup).toContain('data-testid="onyx-native-donor-markdown-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-card"')
    expect(markup).toContain('data-testid="onyx-donor-markdown-content"')
    expect(
      markup
    ).toContain(
      'class="onyx-donor-markdown-renderer-shell onyx-donor-markdown-renderer-surface w-full overflow-x-visible cursor-text focus:outline-none select-text"'
    )
    expect(
      markup
    ).toContain(
      'class="onyx-donor-markdown-prose onyx-donor-markdown-content-surface prose dark:prose-invert font-main-content-body max-w-full"'
    )
    expect(markup).toContain('class="chat-assistant-message-text onyx-donor-markdown-paragraph"')
    expect(markup).toContain('data-testid="onyx-donor-clarification-renderer"')
    expect(markup).toContain('data-testid="onyx-native-donor-clarification-card"')
    expect(markup).toContain('class="onyx-donor-clarification-shell onyx-donor-clarification-surface w-full"')
    expect(markup).toContain('data-testid="onyx-donor-clarification-slot"')
    expect(
      markup
    ).toContain(
      'class="onyx-donor-clarification-slot onyx-donor-clarification-slot-surface flex w-full flex-col gap-3"'
    )
    expect(markup).toContain('data-testid="onyx-donor-analysis-renderer"')
    expect(markup).toContain('data-testid="onyx-native-donor-analysis-card"')
    expect(markup).toContain('class="onyx-donor-analysis-renderer-shell onyx-donor-analysis-renderer-surface w-full"')
    expect(markup).toContain('data-testid="onyx-donor-analysis-shell"')
    expect(markup).toContain('class="onyx-donor-analysis-shell onyx-donor-analysis-shell-surface flex w-full flex-col gap-3"')
    expect(markup).toContain('data-testid="onyx-donor-analysis-slot"')
    expect(markup).toContain('class="onyx-donor-analysis-slot onyx-donor-analysis-slot-surface flex w-full flex-col gap-3"')
    expect(markup).toContain('data-testid="onyx-donor-status-renderer"')
    expect(markup).toContain('Need one more filter before I can finalize the answer.')
    expect(markup).toContain('data-testid="clarification-card"')
    expect(markup).toContain('data-testid="analysis-component-card"')
  })

  it('passes source metadata extracted from chatbi source parts to the toolbar', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'text', text: 'Analysis complete.' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } },
        {
          type: 'data',
          name: 'chatbi_sources',
          data: {
            items: [
              {
                id: 'query-log:query-log-1',
                title: 'Query Log Reference',
                body: 'Analytical evidence captured for this answer.',
                meta: 'query-log-1',
                kind: 'document'
              }
            ]
          }
        }
      ],
      status: { type: 'complete' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })

    renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(askMessageFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        messageId: 'msg-1',
        sources: [
          expect.objectContaining({
            id: 'query-log:query-log-1',
            title: 'Query Log Reference'
          })
        ]
      })
    )
  })

  it('renders runtime step cards inline before the final analysis surface and collapses repeated component updates', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'text', text: '分析完成。' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '月度趋势',
              queryLogId: 'query-log-1'
            }
          }
        },
        {
          type: 'data',
          name: 'chatbi_component',
          data: {
            type: 'chart',
            payload: {
              title: '月度趋势',
              queryLogId: 'query-log-1',
              traceKey: 'trace-1'
            }
          }
        }
      ],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'plan-1',
        messageId: 'msg-1',
        kind: 'plan',
        title: '制定执行计划',
        status: 'running',
        sourceEvent: 'on_agent_start',
        traceKey: null,
        queryLogId: null,
        progressPercent: null,
        updatedAt: '2026-04-09T10:00:00.000Z',
        runtimeEventId: 1,
        detail: null
      },
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: '执行月度聚合',
        status: 'running',
        sourceEvent: 'on_tool_start',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 60,
        updatedAt: '2026-04-09T10:00:01.000Z',
        runtimeEventId: 2,
        detail: null
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-agent-timeline"')
    expect(markup).toContain('data-testid="onyx-final-answer"')
    expect(markup).toContain('制定执行计划')
    expect(markup).toContain('执行月度聚合')
    expect(markup.indexOf('data-testid=\"onyx-agent-timeline\"')).toBeLessThan(markup.indexOf('data-testid=\"onyx-final-answer\"'))
    expect(markup.indexOf('制定执行计划')).toBeLessThan(markup.indexOf('data-testid=\"onyx-final-answer\"'))
    expect(countOccurrences(markup, 'data-testid=\"analysis-component-card\"')).toBe(1)
  })

  it('renders a donor-style runtime activity header that follows the latest visible runtime step', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'plan-1',
        messageId: 'msg-1',
        kind: 'plan',
        title: '制定执行计划',
        status: 'running',
        sourceEvent: 'on_agent_start',
        traceKey: null,
        queryLogId: null,
        progressPercent: null,
        updatedAt: '2026-04-10T10:00:00.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: null
      },
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: '执行月度聚合',
        status: 'running',
        sourceEvent: 'on_tool_start',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 60,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 2,
        timelineOrder: 2,
        detail: null
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-runtime-shell-header"')
    expect(markup).toContain('正在执行 执行月度聚合')
  })

  it('normalizes context resolution runtime headers into donor activity language', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: 'context for cube PA_CHATBI_OPERATIONS',
        status: 'running',
        sourceEvent: 'on_tool_message',
        traceKey: 'trace-1',
        queryLogId: null,
        progressPercent: 0,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: { message: 'context for cube PA_CHATBI_OPERATIONS' }
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-runtime-shell-header"')
    expect(markup).toContain('正在解析上下文')
  })

  it('normalizes executed query runtime headers into donor activity language', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: 'query executed',
        status: 'running',
        sourceEvent: 'on_tool_message',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 0,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: { message: 'query executed (rows=12, cols=1)' }
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-runtime-shell-header"')
    expect(markup).toContain('正在执行查询')
    expect(markup).not.toContain('正在执行 query executed')
  })

  it('renders compact runtime step rows instead of stacked dashboard cards', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'plan-1',
        messageId: 'msg-1',
        kind: 'plan',
        title: '制定执行计划',
        status: 'running',
        sourceEvent: 'on_agent_start',
        traceKey: null,
        queryLogId: null,
        progressPercent: null,
        updatedAt: '2026-04-10T10:00:00.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: null
      },
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: '执行月度聚合',
        status: 'running',
        sourceEvent: 'on_tool_start',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 60,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 2,
        timelineOrder: 2,
        detail: { message: 'query executed (rows=12, cols=1)' }
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(countOccurrences(markup, 'data-testid=\"onyx-runtime-step-row\"')).toBe(2)
    expect(markup).not.toContain('data-testid="onyx-runtime-step-card"')
    expect(markup).toContain('query executed (rows=12, cols=1)')
  })

  it('renders the runtime shell through transplanted donor timeline primitives', () => {
    useMessageMock.mockReturnValue({
      content: [{ type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: 'query executed',
        status: 'running',
        sourceEvent: 'on_tool_message',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 0,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: { message: 'query executed (rows=12, cols=1)' }
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)

    expect(markup).toContain('data-testid="onyx-donor-timeline-root"')
    expect(markup).toContain('data-testid="onyx-donor-streaming-header"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-timeline-renderer"')
    expect(markup).toContain('data-testid="onyx-native-donor-runtime-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-runtime-stack"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-step-renderer"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-step-header"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-step-label"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-step-title"')
    expect(markup).not.toContain('<p class="px-[2px] font-main-ui-muted text-text-04"><div')
    expect(markup).not.toContain('<p class="px-[2px] font-main-ui-muted text-text-04"><p')
    expect(countOccurrences(markup, 'data-testid=\"onyx-donor-step-container\"')).toBe(1)
  })

  it('renders runtime updates that arrive after answer content starts inside the final answer shell', () => {
    useMessageMock.mockReturnValue({
      content: [
        { type: 'data', name: 'chatbi_timeline_marker', data: { order: 2, kind: 'text' } },
        { type: 'text', text: '先给出一句总结。' },
        { type: 'data', name: 'chatbi_timeline_marker', data: { order: 4, kind: 'text' } },
        { type: 'text', text: '接着补充图表结论。' },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-1' } }
      ],
      status: { type: 'running' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: vi.fn(),
        send: vi.fn()
      })
    })
    selectMessageStepsByMessageIdMock.mockReturnValue([
      {
        id: 'plan-1',
        messageId: 'msg-1',
        kind: 'plan',
        title: '制定执行计划',
        status: 'running',
        sourceEvent: 'on_agent_start',
        traceKey: null,
        queryLogId: null,
        progressPercent: null,
        updatedAt: '2026-04-10T10:00:00.000Z',
        runtimeEventId: 1,
        timelineOrder: 1,
        detail: null
      },
      {
        id: 'tool-1',
        messageId: 'msg-1',
        kind: 'tool',
        title: '执行月度聚合',
        status: 'running',
        sourceEvent: 'on_tool_start',
        traceKey: 'trace-1',
        queryLogId: 'query-log-1',
        progressPercent: 60,
        updatedAt: '2026-04-10T10:00:01.000Z',
        runtimeEventId: 2,
        timelineOrder: 3,
        detail: null
      }
    ])

    const markup = renderToStaticMarkup(<AssistantMessageCardV2 />)
    const finalAnswerIndex = markup.indexOf('data-testid=\"onyx-final-answer\"')

    expect(markup.indexOf('制定执行计划')).toBeLessThan(finalAnswerIndex)
    expect(markup.indexOf('执行月度聚合')).toBeGreaterThan(finalAnswerIndex)
    expect(markup.indexOf('正在生成...')).toBeGreaterThan(finalAnswerIndex)
    expect(markup).toContain('data-section-kind="timeline"')
    expect(markup).toContain('data-testid="onyx-donor-inline-runtime-step"')
    expect(markup).toContain('data-testid="onyx-donor-runtime-terminal-renderer"')
  })

  it('applies clarification hints through the thread composer instead of the message edit composer', () => {
    const threadSetText = vi.fn()
    const threadSend = vi.fn()
    const messageSetText = vi.fn()
    const messageSend = vi.fn()

    useMessageMock.mockReturnValue({
      content: [
        {
          type: 'data',
          name: 'chatbi_clarification',
          data: {
            required: true,
            message: '请确认时间范围',
            missingSlots: ['time'],
            candidateHints: {
              time: ['2025年']
            }
          }
        },
        { type: 'data', name: 'chatbi_message_meta', data: { messageId: 'msg-clarify-1' } }
      ],
      status: { type: 'complete' }
    })
    useAuiMock.mockReturnValue({
      composer: () => ({
        setText: messageSetText,
        send: messageSend
      }),
      thread: () => ({
        composer: () => ({
          setText: threadSetText,
          send: threadSend
        })
      })
    })

    renderToStaticMarkup(<AssistantMessageCardV2 />)

    const clarificationProps = clarificationCardPropsMock.mock.calls[0]?.[0] as
      | { onApplyHint?: (hint: string) => void }
      | undefined

    clarificationProps?.onApplyHint?.('2025年')

    expect(threadSetText).toHaveBeenCalledWith('2025年')
    expect(threadSend).toHaveBeenCalledTimes(1)
    expect(messageSetText).not.toHaveBeenCalled()
    expect(messageSend).not.toHaveBeenCalled()
  })
})

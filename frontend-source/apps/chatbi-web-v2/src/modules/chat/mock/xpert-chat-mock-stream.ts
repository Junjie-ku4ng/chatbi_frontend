type MockChatScenario = 'chart' | 'clarification' | 'text'

type XpertMockEnvelope = {
  type: 'event' | 'message' | 'component'
  event?: string
  data?: unknown
}

type MockStreamInput = {
  scenario?: string
  question?: string
  latencyMs?: number
}

function normalizeScenario(value?: string): MockChatScenario {
  if (value === 'clarification' || value === 'text' || value === 'chart') {
    return value
  }
  return 'chart'
}

function normalizeLatencyMs(value?: number) {
  if (!Number.isFinite(value) || value === undefined) {
    return 260
  }
  return Math.max(0, Math.floor(value))
}

function nowIso() {
  return new Date().toISOString()
}

function stableSuffix(question?: string) {
  const seed = question?.trim() || 'chatbi-sse'
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash.toString(36).slice(0, 8)
}

function buildChartPayload(queryLogId: string, traceKey: string) {
  return {
    label: '近 6 个月销售趋势',
    queryLogId,
    traceKey,
    option: {
      tooltip: { trigger: 'axis' },
      legend: { data: ['销售额', '目标'] },
      xAxis: {
        type: 'category',
        data: ['10月', '11月', '12月', '1月', '2月', '3月']
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '销售额',
          type: 'line',
          smooth: true,
          data: [126, 142, 158, 176, 169, 198]
        },
        {
          name: '目标',
          type: 'line',
          smooth: true,
          data: [120, 135, 150, 162, 172, 188]
        }
      ],
      grid: { left: 44, right: 24, top: 40, bottom: 36 }
    },
    analysisHandoff: {
      cube: 'Sales Cube',
      metricCodes: ['sales_amount', 'target_amount'],
      dimensionCodes: ['month']
    },
    interaction: {
      story: {
        title: '近 6 个月销售趋势'
      },
      explain: {
        queryLogId,
        traceKey
      }
    }
  }
}

function buildTablePayload(queryLogId: string, traceKey: string) {
  return {
    label: '区域销售明细',
    queryLogId,
    traceKey,
    columns: ['区域', '销售额', '环比'],
    rows: [
      { 区域: '华东', 销售额: '198 万', 环比: '+12.4%' },
      { 区域: '华南', 销售额: '164 万', 环比: '+7.8%' },
      { 区域: '华北', 销售额: '139 万', 环比: '+3.1%' }
    ]
  }
}

function buildCommonStart(input: {
  conversationId: string
  messageId: string
  queryLogId: string
  traceKey: string
  question: string
}): XpertMockEnvelope[] {
  return [
    {
      type: 'event',
      event: 'on_conversation_start',
      data: {
        id: input.conversationId,
        conversationId: input.conversationId,
        title: input.question.slice(0, 24) || 'SSE 测试会话',
        ts: nowIso()
      }
    },
    {
      type: 'event',
      event: 'on_agent_start',
      data: {
        id: 'agent-chatbi-sse-test',
        title: '分析请求',
        status: 'running',
        messageId: input.messageId,
        queryLogId: input.queryLogId,
        traceKey: input.traceKey
      }
    },
    {
      type: 'event',
      event: 'on_message_start',
      data: {
        id: input.messageId,
        messageId: input.messageId,
        status: 'running'
      }
    }
  ]
}

function buildCommonEnd(input: {
  conversationId: string
  messageId: string
  queryLogId: string
  traceKey: string
  answer: Record<string, unknown>
  artifacts?: unknown[]
}): XpertMockEnvelope[] {
  return [
    {
      type: 'event',
      event: 'on_message_end',
      data: {
        id: input.messageId,
        messageId: input.messageId,
        status: 'complete',
        answer: input.answer,
        artifacts: input.artifacts ?? [],
        meta: {
          queryLogId: input.queryLogId,
          traceKey: input.traceKey
        }
      }
    },
    {
      type: 'event',
      event: 'on_agent_end',
      data: {
        id: 'agent-chatbi-sse-test',
        title: '分析完成',
        status: 'success',
        messageId: input.messageId,
        queryLogId: input.queryLogId,
        traceKey: input.traceKey
      }
    },
    {
      type: 'event',
      event: 'on_conversation_end',
      data: {
        id: input.conversationId,
        conversationId: input.conversationId,
        status: 'success',
        messages: [
          {
            id: input.messageId,
            role: 'assistant'
          }
        ],
        meta: {
          queryLogId: input.queryLogId,
          traceKey: input.traceKey
        }
      }
    }
  ]
}

export function buildDeterministicMockXpertChatEnvelopes(input: MockStreamInput = {}): XpertMockEnvelope[] {
  const scenario = normalizeScenario(input.scenario)
  const question = input.question?.trim() || '请生成一段 SSE 流式测试回答'
  const suffix = stableSuffix(`${scenario}:${question}`)
  const conversationId = `conv-sse-${suffix}`
  const messageId = `msg-sse-${suffix}`
  const queryLogId = `query-sse-${suffix}`
  const traceKey = `trace-sse-${suffix}`
  const start = buildCommonStart({ conversationId, messageId, queryLogId, traceKey, question })

  if (scenario === 'clarification') {
    return [
      ...start,
      {
        type: 'message',
        data: {
          content: '我需要先确认一个口径，才能继续生成分析。'
        }
      },
      ...buildCommonEnd({
        conversationId,
        messageId,
        queryLogId,
        traceKey,
        answer: {
          mode: 'clarification'
        },
        artifacts: [
          {
            kind: 'query_reference',
            queryLogId,
            traceKey
          }
        ]
      }).map(envelope => {
        if (envelope.event !== 'on_message_end' || !envelope.data || typeof envelope.data !== 'object') {
          return envelope
        }
        return {
          ...envelope,
          data: {
            ...(envelope.data as Record<string, unknown>),
            clarification: {
              required: true,
              message: '你想按区域、产品线还是月份继续拆解？',
              missingSlots: ['分析维度'],
              candidateHints: {
                分析维度: ['按区域拆解', '按产品线拆解', '按月份拆解']
              },
              exampleAnswers: ['按区域拆解最近 6 个月销售额']
            }
          }
        }
      })
    ]
  }

  if (scenario === 'text') {
    const answerText = '这是一个纯文本 SSE 测试回答。前端会按消息片段逐步追加内容，并在完成后显示工具栏。'
    return [
      ...start,
      { type: 'message', data: { content: '这是一个纯文本 SSE 测试回答。' } },
      { type: 'message', data: { content: '前端会按消息片段逐步追加内容，' } },
      { type: 'message', data: { content: '并在完成后显示工具栏。' } },
      ...buildCommonEnd({
        conversationId,
        messageId,
        queryLogId,
        traceKey,
        answer: {
          mode: 'chat',
          text: answerText
        },
        artifacts: [
          {
            kind: 'query_reference',
            queryLogId,
            traceKey
          }
        ]
      })
    ]
  }

  const chartPayload = buildChartPayload(queryLogId, traceKey)
  const tablePayload = buildTablePayload(queryLogId, traceKey)
  const answerText = '近 6 个月销售额整体上升，3 月达到 198 万，较 10 月提升约 57%。目标线也同步上移，说明业务增长趋势稳定。'

  return [
    ...start,
    {
      type: 'event',
      event: 'on_tool_start',
      data: {
        id: `tool-query-${suffix}`,
        title: '查询 Sales Cube',
        tool: 'sales_cube_query',
        status: 'running',
        messageId,
        queryLogId,
        traceKey
      }
    },
    {
      type: 'message',
      data: {
        content: '近 6 个月销售额整体上升，'
      }
    },
    {
      type: 'message',
      data: {
        content: '3 月达到 198 万，较 10 月提升约 57%。'
      }
    },
    {
      type: 'component',
      data: {
        type: 'chart',
        payload: chartPayload,
        messageId
      }
    },
    {
      type: 'event',
      event: 'on_tool_message',
      data: {
        type: 'table',
        payload: tablePayload,
        messageId,
        queryLogId,
        traceKey
      }
    },
    {
      type: 'event',
      event: 'on_tool_end',
      data: {
        id: `tool-query-${suffix}`,
        title: '查询 Sales Cube',
        tool: 'sales_cube_query',
        status: 'success',
        messageId,
        queryLogId,
        traceKey
      }
    },
    {
      type: 'message',
      data: {
        content: '目标线也同步上移，说明业务增长趋势稳定。'
      }
    },
    ...buildCommonEnd({
      conversationId,
      messageId,
      queryLogId,
      traceKey,
      answer: {
        mode: 'analysis',
        text: answerText,
        components: [
          {
            type: 'chart',
            payload: chartPayload
          }
        ]
      },
      artifacts: [
        {
          kind: 'result_set',
          cube: 'Sales Cube',
          visualType: '趋势图',
          rowCount: 6,
          colCount: 3,
          queryLogId,
          traceKey
        },
        {
          kind: 'query_reference',
          queryLogId,
          traceKey
        }
      ]
    })
  ]
}

function encodeEnvelope(envelope: XpertMockEnvelope) {
  return `data: ${JSON.stringify(envelope)}\n\n`
}

export function createDeterministicMockXpertChatResponse(input: MockStreamInput = {}) {
  const envelopes = buildDeterministicMockXpertChatEnvelopes(input)
  const latencyMs = normalizeLatencyMs(input.latencyMs)
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const envelope of envelopes) {
        controller.enqueue(encoder.encode(encodeEnvelope(envelope)))
        if (latencyMs > 0) {
          await new Promise(resolve => setTimeout(resolve, latencyMs))
        }
      }
      controller.close()
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-chatbi-mock-scenario': normalizeScenario(input.scenario)
    }
  })
}

import { expect, test, type Page, type Route } from '@playwright/test'

function resolveConversationId(route: Route) {
  const requestUrl = new URL(route.request().url())
  const rawData = requestUrl.searchParams.get('data')
  if (!rawData) return undefined

  try {
    const parsed = JSON.parse(rawData) as { where?: { conversationId?: string } }
    return parsed.where?.conversationId
  } catch {
    return undefined
  }
}

async function mockChatRuntimeApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'runtime-events-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })

  await page.route('**/api/pa/conversations/search', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'conv-runtime-lifecycle',
              title: 'Runtime lifecycle sample',
              updatedAt: '2026-02-24T08:00:00.000Z',
              options: { parameters: { modelId: 'model-runtime' } },
              messages: [{}, {}]
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/my?*', async route => {
    const conversationId = resolveConversationId(route)
    if (conversationId !== 'conv-runtime-lifecycle') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            items: [],
            total: 0
          }
        }
      })
      return
    }

    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [],
          total: 0
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback/my?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: []
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/*/suggested-questions', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: ['继续分析']
        }
      }
    })
  })

  await page.route('**/api/xpert/chat', async route => {
    const chartOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['1月', '2月', '3月'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [90, 102, 118], smooth: true }]
    }

    const events = [
      {
        type: 'event',
        event: 'on_conversation_start',
        data: { id: 'conv-runtime-lifecycle' }
      },
      {
        type: 'event',
        event: 'on_message_start',
        data: { id: 'msg-runtime-lifecycle' }
      },
      {
        type: 'event',
        event: 'on_agent_start',
        data: {
          id: 'agent-1',
          name: 'chatbi-agent',
          meta: {
            conversationId: 'conv-runtime-lifecycle',
            traceKey: 'trace-runtime-lifecycle',
            queryLogId: 'query-log-runtime-lifecycle',
            taskId: 'task-runtime-lifecycle',
            progress: 20,
            total: 100
          }
        }
      },
      {
        type: 'event',
        event: 'on_tool_message',
        data: {
          id: 'tool-1',
          category: 'Dashboard',
          type: 'AnalyticalGrid',
          title: '执行指标计算',
          status: 'running',
          meta: {
            conversationId: 'conv-runtime-lifecycle',
            traceKey: 'trace-runtime-lifecycle',
            queryLogId: 'query-log-runtime-lifecycle',
            taskId: 'task-runtime-lifecycle',
            progress: 60,
            total: 100
          },
          chartOptions: chartOption
        }
      },
      {
        type: 'component',
        data: {
          type: 'chart',
          payload: {
            option: chartOption
          }
        }
      },
      {
        type: 'message',
        data: { text: '这是流式返回内容。' }
      },
      {
        type: 'event',
        event: 'on_chat_event',
        data: { id: 'step-1', title: '图表生成完成', status: 'success' }
      },
      {
        type: 'event',
        event: 'on_message_end',
        data: {
          id: 'msg-runtime-lifecycle',
          status: 'success',
          answer: {
            text: '这是流式返回内容。'
          },
          queryLogId: 'query-log-runtime-lifecycle',
          meta: {
            traceKey: 'trace-runtime-lifecycle',
            queryLogId: 'query-log-runtime-lifecycle',
            taskId: 'task-runtime-lifecycle'
          }
        }
      },
      {
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-runtime-lifecycle',
          messages: [{ id: 'msg-runtime-lifecycle', role: 'assistant' }]
        }
      }
    ]

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
    })
  })
}

test('chat runtime consumes lifecycle events and renders tool chart output', async ({ page }) => {
  await mockChatRuntimeApis(page)

  await page.goto('/chat')
  await page.getByTestId('ask-input').fill('去年每个月销售额走势')
  await page.getByTestId('ask-submit').click()

  await expect(page.locator('.chat-assistant-answer-chart')).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('.chat-assistant-answer-chart canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-message')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-bubble')).toContainText('这是流式返回内容。', { timeout: 30_000 })
  await expect(page.getByTestId('ask-events-timeline')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-events-group-tool')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-events-group-tool')).toContainText('执行指标计算', { timeout: 30_000 })
  await expect(page.getByTestId('ask-events-group-tool')).toContainText('组件输出 · chart', { timeout: 30_000 })
  await expect(page.getByTestId('ask-events-timeline')).toContainText('图表生成完成', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-execution-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-node-0')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-message-group-0')).toContainText('msg-runtime-lifecycle', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-message-group-0')).toContainText('chatbi-agent', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-message-group-0')).toContainText('执行指标计算', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-message-group-0')).toContainText('组件输出 · chart', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-message-group-0')).toContainText('图表生成完成', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-progress')).toContainText('100%', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-terminal-state')).toContainText('success', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-analysis-link')).toHaveAttribute(
    'href',
    '/chat?queryLogId=query-log-runtime-lifecycle#analysis'
  )
  await expect(page.getByTestId('ask-runtime-trace-link')).toHaveAttribute(
    'href',
    '/ops/traces/trace-runtime-lifecycle'
  )
  await expect(page.getByTestId('ask-runtime-control-unavailable')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('ask-events-toggle').click()
  await expect(page.getByTestId('ask-events-group-tool')).toHaveCount(0)
  await expect(page.getByTestId('ask-events-timeline')).toContainText('已折叠')
  await page.getByTestId('ask-events-toggle').click()
  await expect(page.getByTestId('ask-events-group-tool')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-events-timeline')).toContainText('执行指标计算', { timeout: 30_000 })

  const eventsText = (await page.getByTestId('ask-events-count').textContent()) ?? ''
  const eventCount = Number((eventsText.match(/\d+/)?.[0] ?? '0').trim())
  expect(eventCount).toBeGreaterThanOrEqual(6)
})

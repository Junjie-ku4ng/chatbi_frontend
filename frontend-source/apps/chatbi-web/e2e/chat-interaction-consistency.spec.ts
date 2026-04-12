import { expect, test, type Page, type Route } from '@playwright/test'

function buildChatSseBody() {
  const events = [
    {
      type: 'event',
      event: 'on_conversation_start',
      data: { id: 'conv-stream-1' }
    },
    {
      type: 'event',
      event: 'on_message_start',
      data: { id: 'msg-stream-1' }
    },
    {
      type: 'message',
      data: { text: '这是流式返回内容。' }
    },
    {
      type: 'event',
      event: 'on_message_end',
      data: {
        id: 'msg-stream-1',
        status: 'success',
        answer: {
          text: '这是流式返回内容。',
          components: [
            {
              type: 'table',
              payload: {
                columns: ['Month', 'Revenue'],
                rows: [{ Month: '2026-01', Revenue: 1200 }],
                queryLogId: 'query-log-consistency-1',
                traceKey: 'trace-consistency-1',
                analysisHandoff: {
                  queryLogId: 'query-log-consistency-1',
                  traceKey: 'trace-consistency-1',
                  metricCodes: ['Revenue'],
                  dimensionCodes: ['Month'],
                  appliedFilters: []
                },
                interaction: {
                  availableViews: ['table', 'chart'],
                  defaultView: 'table',
                  explain: {
                    enabled: true,
                    queryLogId: 'query-log-consistency-1',
                    traceKey: 'trace-consistency-1'
                  },
                  story: {
                    enabled: true,
                    widgetType: 'table'
                  },
                  fullscreen: {
                    enabled: true,
                    title: 'Revenue trend'
                  }
                }
              }
            }
          ]
        }
      }
    },
    {
      type: 'event',
      event: 'on_conversation_end',
      data: {
        id: 'conv-stream-1',
        messages: [{ id: 'msg-stream-1', role: 'assistant' }]
      }
    }
  ]

  return events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
}

async function mockChatInteractionApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'interaction-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })
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
              id: 'conv-growth',
              title: 'Growth diagnostics',
              updatedAt: '2026-02-23T10:00:00.000Z',
              options: { parameters: { modelId: 'model-growth' } },
              messages: [{}, {}]
            },
            {
              id: 'conv-finance',
              title: 'Finance review',
              updatedAt: '2026-02-23T11:00:00.000Z',
              options: { parameters: { modelId: 'model-finance' } },
              messages: [{}, {}, {}]
            }
          ],
          total: 2
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/my?*', async route => {
    const conversationId = resolveConversationId(route)
    if (conversationId === 'conv-growth') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            items: [
              {
                id: 'msg-growth-1',
                role: 'assistant',
                status: 'success',
                content: [{ text: '增长会话历史摘要' }],
                createdAt: '2026-02-23T10:01:00.000Z'
              }
            ],
            total: 1
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
          items: ['继续按区域拆分', '给出环比结论']
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback', async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'feedback-1',
          conversationId: 'conv-stream-1',
          messageId: 'msg-stream-1',
          rating: 'LIKE'
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback/*', async route => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback()
      return
    }
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          deleted: true
        }
      }
    })
  })

  await page.route('**/api/xpert/chat', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildChatSseBody()
    })
  })
}

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

test('chat workspace filters conversations by search text', async ({ page }) => {
  await mockChatInteractionApis(page)

  await page.goto('/chat')

  const growthItem = page.getByTestId('ask-conversation-item-conv-growth')
  const financeItem = page.getByTestId('ask-conversation-item-conv-finance')
  await expect(growthItem).toBeVisible()
  await expect(financeItem).toBeVisible()

  await page.getByTestId('ask-conversation-search').fill('finance')
  await expect(financeItem).toBeVisible()
  await expect(growthItem).toHaveCount(0)

  await page.getByTestId('ask-conversation-search').fill('conv-growth')
  await expect(growthItem).toBeVisible()
  await expect(financeItem).toHaveCount(0)

  await page.getByTestId('ask-conversation-search').fill('')
  await growthItem.click()
  await expect(page.getByTestId('ask-conversation-badge')).toContainText('conv-growth')
})

test('chat workspace hides runtime status row on initial idle state', async ({ page }) => {
  await mockChatInteractionApis(page)

  await page.goto('/chat')

  await expect(page.getByTestId('ask-events-count')).toHaveCount(0)
})

test('chat workspace keeps streaming state and composer interactions consistent', async ({ page }) => {
  await mockChatInteractionApis(page)

  await page.goto('/chat')
  await expect(page.getByTestId('ask-feedback-like')).toHaveCount(0)

  await page.getByTestId('ask-input').fill('去年每个月销售额走势')
  await page.getByTestId('ask-submit').click()

  await expect(page.getByTestId('ask-streaming-status')).toBeVisible()
  await expect(page.getByTestId('ask-submit')).toBeDisabled()

  await expect(page.getByTestId('ask-streaming-status')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByTestId('ask-submit')).toBeEnabled()
  await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-events-timeline')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-execution-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/No runtime actions are available for phase (done|idle)\./i)).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.chat-assistant-event-item').first()).toBeVisible({ timeout: 30_000 })

  await expect(page.getByTestId('ask-feedback-like')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-suggested-questions')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-user-message').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-message').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-user-bubble').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-bubble').first()).toContainText('这是流式返回内容。', { timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-open-analysis')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-add-to-story')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-fullscreen')).toBeVisible({ timeout: 30_000 })
})

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

async function mockChatApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'echarts-user',
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
              id: 'conv-stream-echarts',
              title: 'ECharts stream sample',
              updatedAt: '2026-02-24T08:00:00.000Z',
              options: { parameters: { modelId: 'model-echarts' } },
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
    if (conversationId !== 'conv-stream-echarts') {
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
          items: ['继续按区域拆分']
        }
      }
    })
  })

  await page.route('**/api/xpert/chat', async route => {
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['1月', '2月', '3月'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [98, 103, 109], smooth: true }]
    }

    const markdownChart = `图表如下：\n\`\`\`echarts\n${JSON.stringify(option)}\n\`\`\``

    const events = [
      {
        type: 'event',
        event: 'on_conversation_start',
        data: { id: 'conv-stream-echarts' }
      },
      {
        type: 'event',
        event: 'on_message_start',
        data: { id: 'msg-stream-echarts' }
      },
      {
        type: 'message',
        data: {
          id: 'msg-stream-echarts',
          type: 'text',
          text: markdownChart
        }
      },
      {
        type: 'event',
        event: 'on_message_end',
        data: {
          id: 'msg-stream-echarts',
          status: 'success',
          answer: {
            text: markdownChart,
            components: [
              {
                type: 'chart',
                payload: { option }
              }
            ]
          },
          result: {
            rowCount: 3,
            preview: [{ formatted: '109 万' }]
          }
        }
      },
      {
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-stream-echarts',
          messages: [{ id: 'msg-stream-echarts', role: 'assistant' }]
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

test('chat renders echarts from streamed markdown and answer components', async ({ page }) => {
  await mockChatApis(page)

  await page.goto('/chat')
  await page.getByTestId('ask-input').fill('去年每个月销售额走势')
  await page.getByTestId('ask-submit').click()

  await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
    timeout: 30_000
  })

  await expect(page.getByTestId('ask-assistant-message')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-bubble')).toContainText('图表如下：', { timeout: 30_000 })
  await expect(page.locator('.chat-assistant-answer-chart')).toHaveCount(2, { timeout: 30_000 })
  await expect(page.locator('.chat-assistant-answer-chart canvas').first()).toBeVisible({ timeout: 30_000 })
})

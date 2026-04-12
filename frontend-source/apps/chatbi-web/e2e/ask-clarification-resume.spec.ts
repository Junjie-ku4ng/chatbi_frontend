import { expect, test, type Page, type Route } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

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

async function mockClarificationRuntime(page: Page) {
  let chatRequestCount = 0

  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          authType: 'dev',
          userId: 'clarification-user',
          scopes: {
            read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
            write: [],
            denyRead: [],
            denyWrite: []
          }
        }
      }
    })
  })

  await page.route('**/api/pa/conversations/search', async route => {
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

  await page.route('**/api/xpert/chat-message/my?*', async route => {
    const conversationId = resolveConversationId(route)
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: conversationId === 'conv-clarification-1' ? [] : [],
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
    chatRequestCount += 1
    if (chatRequestCount === 1) {
      const events = [
        {
          type: 'event',
          event: 'on_conversation_start',
          data: { id: 'conv-clarification-1' }
        },
        {
          type: 'event',
          event: 'on_message_start',
          data: { id: 'msg-clarification-1' }
        },
        {
          type: 'event',
          event: 'on_message_end',
          data: {
            id: 'msg-clarification-1',
            status: 'clarification',
            clarification: {
              required: true,
              message: '我已经识别到华东区域和销售额指标，请确认时间范围和“提高 5%”的含义。',
              missingSlots: ['time', 'scenario_change'],
              candidateHints: {
                time: ['2025年Q1', '2025年全年'],
                scenario_change: ['增加 5 个百分点', '在原值基础上增加 5%']
              },
              resolvedContext: {
                scope: '华东',
                metric: '销售额',
                driver: '折扣率'
              }
            }
          }
        },
        {
          type: 'event',
          event: 'on_conversation_end',
          data: {
            id: 'conv-clarification-1',
            messages: [{ id: 'msg-clarification-1', role: 'assistant' }]
          }
        }
      ]

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
      })
      return
    }

    const events = [
      {
        type: 'event',
        event: 'on_conversation_start',
        data: { id: 'conv-clarification-1' }
      },
      {
        type: 'event',
        event: 'on_message_start',
        data: { id: 'msg-clarification-2' }
      },
      {
        type: 'event',
        event: 'on_tool_message',
        data: {
          id: 'tool-answer-1',
          category: 'Tool',
          tool: 'answer_question',
          title: '回答已恢复',
          message: 'shared runtime resumed after clarification',
          status: 'success',
          toolCall: {
            id: 'tool-answer-1',
            name: 'answer_question'
          }
        }
      },
      {
        type: 'message',
        data: {
          type: 'text',
          text: '已按华东继续，并给出上月同比结果。'
        }
      },
      {
        type: 'event',
        event: 'on_message_end',
        data: {
          id: 'msg-clarification-2',
          status: 'success',
          answer: {
            text: '已按华东继续，并给出上月同比结果。',
            components: [
              {
                type: 'chart',
                payload: {
                  option: {
                    xAxis: { type: 'category', data: ['本月', '上月'] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: [120, 103] }]
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
          id: 'conv-clarification-1',
          messages: [{ id: 'msg-clarification-2', role: 'assistant' }]
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

test('ask workspace keeps same conversation across clarification follow-up asks without legacy resume', async ({ page }) => {
  await mockClarificationRuntime(page)
  await page.goto('/chat')

  await sendXpertQuestion(page, '这个指标按华东看')
  const initialConversation = await page.getByTestId('ask-conversation-badge').textContent()

  await expect(page.getByTestId('ask-clarification-card')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-clarification-card')).toContainText(
    '我已经识别到华东区域和销售额指标，请确认时间范围和“提高 5%”的含义。',
    {
      timeout: 30_000
    }
  )
  await expect(page.getByTestId('ask-clarification-card')).toContainText('已识别信息', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-clarification-card')).toContainText('华东', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-clarification-card')).toContainText('销售额', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-clarification-card')).toContainText('时间', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-clarification-card')).toContainText('调整方式', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-clarification-card')).toContainText('增加 5 个百分点', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-runtime-control-unavailable')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-conversation-id')).toBeVisible({ timeout: 30_000 })

  await sendXpertQuestion(page, '再看上月同比')

  await expect(page.getByTestId('ask-conversation-badge')).toHaveText(initialConversation ?? '', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-conversation-id')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-bubble').last()).toContainText('已按华东继续，并给出上月同比结果。', {
    timeout: 30_000
  })
  await expect(page.locator('.chat-assistant-answer-chart')).toHaveCount(1, { timeout: 30_000 })
})

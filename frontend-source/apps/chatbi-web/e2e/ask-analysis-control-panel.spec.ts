import { expect, test, type Page } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

function buildChatSseBody() {
  const events = [
    {
      type: 'event',
      event: 'on_conversation_start',
      data: { id: 'conv-analysis-1' }
    },
    {
      type: 'event',
      event: 'on_message_start',
      data: { id: 'msg-analysis-1' }
    },
    {
      type: 'message',
      data: {
        id: 'msg-analysis-1',
        type: 'text',
        text: '上月收入趋势如下。'
      }
    },
    {
      type: 'event',
      event: 'on_message_end',
      data: {
        id: 'msg-analysis-1',
        status: 'success',
        answer: {
          text: '上月收入趋势如下。'
        }
      }
    },
    {
      type: 'event',
      event: 'on_conversation_end',
      data: {
        id: 'conv-analysis-1',
        messages: [{ id: 'msg-analysis-1', role: 'assistant' }]
      }
    }
  ]

  return events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
}

async function mockAskWorkspaceApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'analysis-user',
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
          items: [],
          total: 0
        }
      }
    })
  })
  await page.route('**/api/xpert/chat-message/my?*', async route => {
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
          items: ['按区域拆分', '补充解释']
        }
      }
    })
  })
  await page.route('**/api/xpert/chat', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildChatSseBody()
    })
  })
}

test('ask workspace keeps xpert-only controls available', async ({ page }) => {
  await mockAskWorkspaceApis(page)
  await page.goto('/chat')

  await expect(page.getByTestId('ask-xpert-track-badge')).toBeVisible()
  await sendXpertQuestion(page, '上月收入趋势')

  await expect(page.getByTestId('ask-feedback-like')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-feedback-dislike')).toBeVisible({ timeout: 30_000 })
})

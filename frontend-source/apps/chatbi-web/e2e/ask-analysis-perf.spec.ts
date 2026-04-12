import { expect, test, type Page } from '@playwright/test'

async function mockAskPerfApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'perf-user',
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
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [], total: 0 } } })
  })
  await page.route('**/api/xpert/chat-message/my?*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [], total: 0 } } })
  })
  await page.route('**/api/xpert/chat-message-feedback/my?*', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: [] } } })
  })
  await page.route('**/api/xpert/chat-message/*/suggested-questions', async route => {
    await route.fulfill({ json: { apiVersion: 'v1', data: { items: ['继续分析'] } } })
  })

  await page.route('**/api/xpert/chat', async route => {
    const events = [
      { type: 'event', event: 'on_conversation_start', data: { id: 'conv-perf' } },
      { type: 'event', event: 'on_message_start', data: { id: 'msg-perf' } },
      { type: 'message', data: { text: '这是性能测试响应。' } },
      {
        type: 'event',
        event: 'on_message_end',
        data: { id: 'msg-perf', status: 'success', answer: { text: '这是性能测试响应。' } }
      },
      { type: 'event', event: 'on_conversation_end', data: { id: 'conv-perf', messages: [{ id: 'msg-perf' }] } }
    ]
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
    })
  })
}

test('ask xpert stream returns within performance budget', async ({ page }) => {
  await mockAskPerfApis(page)
  await page.goto('/chat')

  const startedAt = Date.now()
  const streamResponse = page.waitForResponse(
    response => response.url().includes('/api/xpert/chat') && response.request().method() === 'POST'
  )

  await page.getByTestId('ask-input').fill('上月收入趋势')
  await page.getByTestId('ask-submit').click()

  const response = await streamResponse
  const elapsed = Date.now() - startedAt

  expect(response.status()).toBe(200)
  expect(elapsed).toBeLessThan(10_000)

  await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
    timeout: 30_000
  })
})

import { expect, test } from '@playwright/test'

test('canonical chat route streams real xpert response', async ({ page }) => {
  await page.goto('/chat')

  const streamResponse = page.waitForResponse(
    response => response.url().includes('/api/xpert/chat') && response.request().method() === 'POST'
  )

  await page.getByTestId('ask-input').fill('上月收入趋势')
  await page.getByTestId('ask-submit').click()

  const response = await streamResponse
  expect(response.status()).toBe(200)

  await expect(page.getByTestId('ask-assistant-message').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-turns-list')).toBeVisible({ timeout: 30_000 })
})

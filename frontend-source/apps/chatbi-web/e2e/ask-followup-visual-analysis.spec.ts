import { expect, test } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

test('ask workspace supports suggested question quick follow-up', async ({ page }) => {
  await page.goto('/chat')

  await sendXpertQuestion(page, '上月收入趋势')

  const suggestions = page.getByTestId('ask-suggested-questions')
  if (await suggestions.isVisible().catch(() => false)) {
    const nextRequest = page.waitForResponse(
      response => response.url().includes('/api/xpert/chat') && response.request().method() === 'POST'
    )
    const buttons = suggestions.locator('button')
    if ((await buttons.count()) > 0) {
      await buttons.first().click()
      const response = await nextRequest
      expect(response.status()).toBe(200)
      await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
        timeout: 30_000
      })
    }
  }

  await expect(page.getByTestId('ask-turns-list')).toBeVisible({ timeout: 30_000 })
})

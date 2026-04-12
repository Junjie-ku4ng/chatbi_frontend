import { expect, type Page } from '@playwright/test'

export async function sendXpertQuestion(page: Page, question: string) {
  const streamResponse = page.waitForResponse(
    response => response.url().includes('/api/xpert/chat') && response.request().method() === 'POST'
  )

  await page.getByTestId('ask-input').fill(question)
  await page.getByTestId('ask-submit').click()

  const response = await streamResponse
  expect(response.ok()).toBe(true)

  await expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, {
    timeout: 30_000
  })
}

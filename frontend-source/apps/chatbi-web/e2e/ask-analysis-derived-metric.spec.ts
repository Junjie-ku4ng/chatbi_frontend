import { expect, test } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

test('ask workspace keeps conversation continuity across multiple questions', async ({ page }) => {
  await page.goto('/chat')

  await sendXpertQuestion(page, '上月收入趋势')
  const conversationText = await page.getByTestId('ask-conversation-badge').textContent()
  expect(conversationText).toBeTruthy()

  await sendXpertQuestion(page, '再看本月收入趋势')
  await expect(page.getByTestId('ask-conversation-badge')).toHaveText(conversationText ?? '', {
    timeout: 30_000
  })
  await expect(page.getByTestId('ask-turns-list')).toBeVisible({ timeout: 30_000 })
})

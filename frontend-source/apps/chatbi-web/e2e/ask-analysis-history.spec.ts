import { expect, test } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

test('ask workspace supports new conversation reset', async ({ page }) => {
  await page.goto('/chat')

  await sendXpertQuestion(page, '上月收入趋势')
  await expect(page.getByTestId('ask-conversation-badge')).toBeVisible({ timeout: 30_000 })

  await page.getByTestId('ask-new-conversation').click()
  await expect(page.getByTestId('ask-conversation-badge')).toHaveCount(0)

  await sendXpertQuestion(page, '本周销售额走势')
  await expect(page.getByTestId('ask-conversation-badge')).toBeVisible({ timeout: 30_000 })
})

import { expect, test } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

test('ask workspace keeps runtime controls unavailable in native xpert mode', async ({ page }) => {
  await page.goto('/chat')

  await sendXpertQuestion(page, '上月收入趋势')
  await expect(page.getByTestId('ask-runtime-control-unavailable')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-conversation-badge')).toBeVisible({ timeout: 30_000 })
})

import { expect, test } from '@playwright/test'
import { sendXpertQuestion } from './helpers/xpert-chat'

test('ask workspace supports feedback toggle for latest answer', async ({ page }) => {
  await page.goto('/chat')

  await sendXpertQuestion(page, '上月收入趋势')

  await page.getByTestId('ask-feedback-like').click()
  await expect(page.getByTestId('ask-feedback-status')).toBeVisible({ timeout: 30_000 })

  await page.getByTestId('ask-feedback-dislike').click()
  await expect(page.getByTestId('ask-feedback-status')).toBeVisible({ timeout: 30_000 })
})

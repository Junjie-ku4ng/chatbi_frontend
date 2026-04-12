import { expect, test } from '@playwright/test'

test('chat canonical route loads ask workspace UI', async ({ page }) => {
  await page.goto('/chat')

  await expect(page.getByTestId('ask-xpert-track-badge')).toBeVisible()
})

test('ask legacy route is removed', async ({ request }) => {
  const response = await request.get('/ask', { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})

test('deep chat route redirects to canonical conversation query and shows conversation badge', async ({ page }) => {
  await page.goto('/chat/x/common/c/test-conv-1')

  await expect(page).toHaveURL(/\/chat\?conversationId=test-conv-1$/)
  await expect(page.getByTestId('ask-conversation-badge')).toContainText('test-conv-1')
})

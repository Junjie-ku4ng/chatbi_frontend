import { expect, test } from '@playwright/test'

test('release-cycle-1 keeps canonical chat route reachable', async ({ page, request }) => {
  await page.goto('/chat')
  await expect(page.getByTestId('ask-xpert-track-badge')).toBeVisible()
  await expect(page.locator('#workspace-jump')).toHaveValue('/chat')

  const response = await request.get('/ask', { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})

test('release-cycle-1 deep chat routes resolve to canonical query URL', async ({ page }) => {
  await page.goto('/chat/c/release1-conv?modelId=release1-model')

  await expect(page).toHaveURL(/\/chat\?/)
  await expect(page.getByTestId('ask-conversation-badge')).toContainText('release1-conv')

  const firstUrl = new URL(page.url())
  expect(firstUrl.pathname).toBe('/chat')
  expect(firstUrl.searchParams.get('conversationId')).toBe('release1-conv')

  await page.goto('/chat/x/common/c/release1-conv-2?modelId=release1-model-2')

  await expect(page).toHaveURL(/\/chat\?/)
  await expect(page.getByTestId('ask-conversation-badge')).toContainText('release1-conv-2')

  const secondUrl = new URL(page.url())
  expect(secondUrl.pathname).toBe('/chat')
  expect(secondUrl.searchParams.get('conversationId')).toBe('release1-conv-2')
})

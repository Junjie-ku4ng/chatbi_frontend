import { expect, test } from '@playwright/test'

test('actions are disabled with missing scope reason when write capability is absent', async ({ page }) => {
  await page.route('**/auth/capabilities', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: 'v1',
        data: {
          authType: 'dev',
          scopes: {
            read: ['allow:model:*'],
            write: [],
            denyRead: [],
            denyWrite: []
          }
        }
      })
    })
  })

  const capabilityResponse = page.waitForResponse(response => response.url().includes('/auth/capabilities'))
  await page.goto('/models')
  await capabilityResponse
  await expect(page.getByTestId('bi-models-runtime-governance')).toBeVisible()

  const batchVote = page.getByTestId('semantic-queue-batch-vote')
  await expect(batchVote).toBeDisabled()
  await expect(batchVote).toHaveAttribute('title', /Missing required scopes/i)

  const retryFailed = page.getByTestId('semantic-queue-retry-failed')
  await expect(retryFailed).toBeDisabled()
  await expect(retryFailed).toHaveAttribute('title', /Missing required scopes/i)
})

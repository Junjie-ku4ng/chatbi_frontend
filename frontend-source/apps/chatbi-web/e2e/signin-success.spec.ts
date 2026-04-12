import { expect, test } from '@playwright/test'

function mockCapabilities(page: import('@playwright/test').Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  const routes = ['**/api/pa/auth/capabilities*', '**/api/xpert/auth/capabilities*']
  return Promise.all(
    routes.map(pattern =>
      page.route(pattern, async route => {
        await route.fulfill({ json: payload })
      })
    )
  )
}

test('sign-in success page supports callback continue flow', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/sign-in/success?next=%2Fsettings')
  await expect(page.getByTestId('signin-success-title')).toContainText('Sign-in success')
  await expect(page.getByTestId('signin-success-next')).toContainText('/settings')

  await page.getByTestId('signin-success-continue').click()
  await expect(page).toHaveURL(/\/settings$/)
})

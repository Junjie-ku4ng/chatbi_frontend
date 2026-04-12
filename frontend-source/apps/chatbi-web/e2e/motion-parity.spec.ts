import { expect, test } from '@playwright/test'

function parseTransitionSeconds(durationValue: string) {
  const segments = durationValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      if (item.endsWith('ms')) {
        return Number(item.slice(0, -2)) / 1000
      }
      if (item.endsWith('s')) {
        return Number(item.slice(0, -1))
      }
      return Number(item)
    })
    .filter(value => Number.isFinite(value))

  if (segments.length === 0) {
    return 0
  }
  return Math.max(...segments)
}

async function mockCapabilities(page: import('@playwright/test').Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'motion-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
}

test('workspace motion keeps transition rhythm and honors reduced-motion', async ({ page }) => {
  await mockCapabilities(page)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/dashboard')
  await expect(page.getByTestId('bi-dashboard-home')).toBeVisible()

  const normalDurationRaw = await page.locator('.workspace-rail-item').first().evaluate(element => {
    return window.getComputedStyle(element).transitionDuration
  })
  const normalDuration = parseTransitionSeconds(normalDurationRaw)
  expect(normalDuration).toBeGreaterThan(0.05)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/dashboard')
  await expect(page.getByTestId('bi-dashboard-home')).toBeVisible()

  const reducedDurationRaw = await page.locator('.workspace-rail-item').first().evaluate(element => {
    return window.getComputedStyle(element).transitionDuration
  })
  const reducedDuration = parseTransitionSeconds(reducedDurationRaw)
  expect(reducedDuration).toBeLessThan(0.001)
})

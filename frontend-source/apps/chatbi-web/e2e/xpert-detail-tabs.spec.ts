import { expect, test } from '@playwright/test'

type CapabilityMode = 'full' | 'readOnly'

function mockCapabilities(page: import('@playwright/test').Page, mode: CapabilityMode = 'full') {
  const writeScopes = mode === 'full' ? ['allow:write:model:*'] : []
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: writeScopes,
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

async function gotoWithRetry(page: import('@playwright/test').Page, path: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('ERR_ABORTED') || attempt === 1) {
        throw error
      }
    }
  }
}

test('xpert expert tabs are reachable and render base data blocks', async ({ page }) => {
  test.setTimeout(90_000)
  await mockCapabilities(page, 'full')

  const expertId = 'expert-a'

  await gotoWithRetry(page, `/xpert/x/${expertId}/agents`)
  await expect(page.getByTestId('xpert-expert-breadcrumb')).toContainText(`xpert / x / ${expertId} / agents`)
  await expect(page.getByTestId('xpert-expert-route-mode')).toContainText('Preview-only route')
  await expect(page.getByTestId('xpert-expert-agents-count')).toContainText('2')
  await gotoWithRetry(page, `/xpert/x/${expertId}/monitor`)
  await page.getByTestId('xpert-expert-tab-logs').click()
  await expect(page).toHaveURL(new RegExp(`/xpert/x/${expertId}/logs$`), { timeout: 60_000 })
  await expect(page.getByTestId('xpert-expert-log-row-0')).toBeVisible({ timeout: 60_000 })
})

const routeCases = [
  { name: 'auth tab', pathTemplate: (expertId: string) => `/xpert/x/${expertId}/auth`, marker: 'xpert-expert-auth-policy' },
  { name: 'monitor tab', pathTemplate: (expertId: string) => `/xpert/x/${expertId}/monitor`, marker: 'xpert-expert-monitor-kpi-latency' },
  { name: 'memory store tab', pathTemplate: (expertId: string) => `/xpert/x/${expertId}/memory/store`, marker: 'xpert-expert-memory-store-row-0' },
  {
    name: 'memory database tab',
    pathTemplate: (expertId: string) => `/xpert/x/${expertId}/memory/database`,
    marker: 'xpert-expert-memory-database-row-0'
  },
  {
    name: 'copilot create tab',
    pathTemplate: (expertId: string) => `/xpert/x/${expertId}/copilot/create`,
    marker: 'xpert-expert-copilot-create-title'
  },
  {
    name: 'copilot testing tab',
    pathTemplate: (expertId: string) => `/xpert/x/${expertId}/copilot/testing`,
    marker: 'xpert-expert-copilot-testing-row-0'
  },
  {
    name: 'copilot detail route',
    pathTemplate: (expertId: string) => `/xpert/x/${expertId}/copilot/seed-1`,
    marker: 'xpert-expert-copilot-detail-id'
  }
]

for (const routeCase of routeCases) {
  test(`xpert expert route ${routeCase.name} is reachable`, async ({ page }) => {
    test.setTimeout(90_000)
    await mockCapabilities(page, 'full')
    const expertId = 'expert-a'
    const path = routeCase.pathTemplate(expertId)
    await gotoWithRetry(page, path)
    await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
    await expect(page.getByTestId('xpert-expert-tab-nav')).toBeVisible()
    await expect(page.getByTestId('xpert-expert-route-mode')).toContainText('Preview-only route')
    await expect(page.getByTestId(routeCase.marker)).toBeVisible()
  })
}

test('xpert copilot create route keeps publish disabled until canonical workspace flow is chosen', async ({ page }) => {
  await mockCapabilities(page, 'full')

  const expertId = 'expert-a'

  await gotoWithRetry(page, `/xpert/x/${expertId}/copilot/create`)

  await expect(page.getByTestId('xpert-expert-workspace-note')).toContainText('Workspace selected from /xpert/w')
  await expect(page.getByTestId('xpert-expert-copilot-preview-note')).toContainText('Preview-only action')
  await expect(page.getByTestId('xpert-expert-copilot-publish')).toBeDisabled()
})

test('xpert copilot create page shows hidden and disabled state for read-only capabilities', async ({ page }) => {
  await mockCapabilities(page, 'readOnly')

  const expertId = 'expert-rbac'

  await gotoWithRetry(page, `/xpert/x/${expertId}/copilot/create`)

  await expect(page.getByTestId('xpert-expert-copilot-hidden-write')).toBeVisible()
  await expect(page.getByTestId('xpert-expert-copilot-preview-note')).toContainText('Preview-only action')
  await expect(page.getByTestId('xpert-expert-copilot-publish')).toBeDisabled()
})

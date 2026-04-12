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

const routeCases = [
  { path: '/dashboard', marker: 'bi-dashboard-home', runtimeMarker: 'insights-page-root' },
  { path: '/dashboard/catalog', marker: 'bi-dashboard-catalog', runtimeMarker: 'collections-page-root' },
  { path: '/dashboard/trending', marker: 'bi-dashboard-trending', runtimeMarker: 'feed-model-select' },
  { path: '/models', marker: 'bi-models-home', runtimeMarker: 'semantic-queue-filter-form' },
  { path: '/project', marker: 'bi-project-home', runtimeMarker: 'stories-create-form' },
  { path: '/project/members', marker: 'bi-project-members', runtimeMarker: 'settings-page-users' },
  { path: '/project/files', marker: 'bi-project-files', runtimeMarker: 'project-files-table' },
  { path: '/project/indicators', marker: 'bi-project-indicators', runtimeMarker: 'indicator-ops-model-select' },
  { path: '/project/indicators/approvals', marker: 'bi-project-indicators-approvals', runtimeMarker: 'bi-project-indicators-approvals-runtime' },
  { path: '/project/indicator', marker: 'bi-project-indicator', runtimeMarker: 'indicator-contract-model-select' },
  { path: '/project/indicator/contract-e2e', marker: 'bi-project-indicator-detail', runtimeMarker: 'bi-project-indicator-detail-runtime' },
  { path: '/indicator/market', marker: 'bi-indicator-market-home', runtimeMarker: 'indicator-contract-model-select' },
  { path: '/data', marker: 'bi-data-home', runtimeMarker: 'settings-page-data-sources' },
  { path: '/indicator-app', marker: 'bi-indicator-app-home', runtimeMarker: 'indicator-consumers-page-root' },
  { path: '/organization', marker: 'bi-organization-home', runtimeMarker: 'settings-page-organizations' }
]

test('canonical BI routes are reachable and host live functional modules', async ({ page }) => {
  await mockCapabilities(page)

  for (const routeCase of routeCases) {
    await page.goto(routeCase.path)
    await expect(page).toHaveURL(new RegExp(routeCase.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
    await expect(page.getByTestId('bi-canonical-tab-nav')).toBeVisible()
    await expect(page.getByTestId(routeCase.marker)).toBeVisible()
    await expect(page.getByTestId(routeCase.runtimeMarker)).toBeVisible()
  }
})

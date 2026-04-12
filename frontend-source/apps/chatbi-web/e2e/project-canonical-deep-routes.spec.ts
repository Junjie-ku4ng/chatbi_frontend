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

test('project members route hosts users module surface', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/project/members')

  await expect(page.getByTestId('bi-project-members')).toBeVisible()
  await expect(page.getByTestId('settings-page-users')).toBeVisible()
  await expect(page.getByTestId('settings-users-invite')).toBeVisible()
})

test('project files route supports upload and same-name version bump', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/project/files')

  await expect(page.getByTestId('bi-project-files')).toBeVisible()
  const upload = page.getByTestId('project-files-upload-input')
  await upload.setInputFiles({
    name: 'budget.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('col,value\nrevenue,10\n')
  })

  await expect(page.getByTestId('project-files-count')).toContainText('files: 1')
  await expect(page.getByTestId('project-files-table')).toContainText('budget.csv')
  await expect(page.getByTestId('project-files-table')).toContainText('v1')

  await upload.setInputFiles({
    name: 'budget.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('col,value\nrevenue,20\n')
  })

  await expect(page.getByTestId('project-files-count')).toContainText('files: 1')
  await expect(page.getByTestId('project-files-table')).toContainText('v2')
})

test('project indicator approvals route hosts indicator ops runtime', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/project/indicators/approvals')

  await expect(page.getByTestId('bi-project-indicators-approvals')).toBeVisible()
  await expect(page.getByTestId('bi-project-indicators-approvals-runtime')).toBeVisible()
  await expect(page.getByTestId('indicator-ops-model-select')).toBeVisible()
})

test('project indicator register route hosts contracts runtime', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/project/indicator')

  await expect(page.getByTestId('bi-project-indicator')).toBeVisible()
  await expect(page.getByTestId('bi-project-indicator-runtime')).toBeVisible()
  await expect(page.getByTestId('indicator-contract-model-select')).toBeVisible()
})

test('project indicator detail route is reachable with canonical wrapper', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/project/indicator/contract-e2e')

  await expect(page.getByTestId('bi-project-indicator-detail')).toBeVisible()
  await expect(page.getByTestId('bi-project-indicator-detail-runtime')).toBeVisible()
})

import { expect, test } from '@playwright/test'

async function mockIndicatorOpsPerfApis(page: import('@playwright/test').Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'perf-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })

  await page.route('**/api/xpert/semantic-model?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'model-perf', name: 'Perf Model', cube: 'sales', runtime: 'chatbi' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/indicators/governance/workbench?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          modelId: 'model-perf',
          windowHours: 72,
          importJobs: [],
          approvals: { items: [], total: 0, limit: 100, offset: 0 },
          templates: [],
          auditSummary: [],
          summary: {
            importThroughput: {
              totalJobs: 1,
              completedJobs: 1,
              partialJobs: 0,
              processedItems: 1000,
              failedItems: 0,
              successRate: 1
            },
            approvalBacklog: {
              pendingItems: 0
            },
            failureHotspots: []
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/indicators/import-jobs?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'job-perf-1',
              modelId: 'model-perf',
              sourceType: 'manual',
              payload: {},
              status: 'completed',
              totalItems: 1000,
              processedItems: 1000,
              failedItems: 0,
              result: {}
            }
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          nextCursor: null
        }
      }
    })
  })

  await page.route('**/api/xpert/indicators/approvals/queue?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [],
          total: 0,
          limit: 100,
          offset: 0
        }
      }
    })
  })

  await page.route('**/api/xpert/indicators/approvals/history?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          nextCursor: null
        }
      }
    })
  })

  await page.route('**/api/xpert/indicators/registry/templates?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: []
      }
    })
  })

  await page.route('**/api/xpert/indicators/import-jobs/job-perf-1/items?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: Array.from({ length: 5 }).map((_, index) => ({
            id: `job-item-${index + 1}`,
            jobId: 'job-perf-1',
            itemKey: `perf-${index + 1}`,
            payload: {},
            status: 'completed',
            attemptCount: 1
          })),
          total: 5,
          page: 1,
          pageSize: 100,
          nextCursor: null
        }
      }
    })
  })
}

test('indicator ops ready state stays within budget with large import-item dataset', async ({ page }) => {
  await mockIndicatorOpsPerfApis(page)

  const startedAt = Date.now()
  await page.goto('/indicator-app')
  await page.getByTestId('indicator-ops-model-select').selectOption('model-perf')
  await expect(page.getByTestId('indicator-ops-ready')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('indicator-ops-import-view-job-perf-1').click()
  await expect(page.getByTestId('indicator-ops-job-items-table')).toBeVisible({ timeout: 30_000 })
  const elapsed = Date.now() - startedAt

  expect(elapsed).toBeLessThan(1800)
})

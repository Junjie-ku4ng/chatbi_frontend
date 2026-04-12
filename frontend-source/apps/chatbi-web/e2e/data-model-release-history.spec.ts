import { expect, test } from '@playwright/test'

function mockCapabilities(page: import('@playwright/test').Page) {
  const payload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'e2e-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*', 'allow:data-source:*', 'allow:source-model:*'],
        write: ['allow:write:model:*', 'allow:write:data-source:*', 'allow:write:source-model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  const routes = ['**/api/pa/auth/capabilities*', '**/api/xpert/auth/capabilities*']
  return Promise.all(routes.map(pattern => page.route(pattern, async route => route.fulfill({ json: payload }))))
}

test('data model release workbench shows deployment-scoped load and refresh history tables', async ({ page }) => {
  const draftId = 'source-draft-history'
  const dataSourceId = 'ds-history'
  const semanticModelId = 'semantic-draft-history'
  const deploymentId = 'deployment-history'

  await mockCapabilities(page)

  await page.route(`**/api/xpert/source-model-drafts/${draftId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: draftId,
          name: 'History Source Draft',
          dataSourceId,
          draftVersion: 6,
          latestIntrospection: { tables: 2, relations: 1 },
          tables: [{ id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' }],
          relations: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/semantic-model-drafts`, async route => {
    await route.fulfill({ json: { data: { id: semanticModelId, name: 'History semantic draft', cube: 'Sales' } } })
  })

  await page.route(`**/api/xpert/semantic-model/${semanticModelId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: semanticModelId,
          name: 'History semantic draft',
          cube: 'Sales',
          dataSourceId
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/pa-deployments`, async route => {
    await route.fulfill({ json: { data: { id: deploymentId, status: 'released', targetCube: 'Sales' } } })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: deploymentId,
          semanticModelId,
          status: 'released',
          targetCube: 'Sales'
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/load-jobs`, async route => {
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              id: 'job-history-2',
              mode: 'incremental',
              status: 'failed',
              retryCount: 2,
              reconciliation: { status: 'failed' }
            },
            {
              id: 'job-history-1',
              mode: 'full_snapshot',
              status: 'succeeded',
              retryCount: 0,
              reconciliation: { status: 'passed' }
            }
          ],
          total: 2
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/refresh-policies`, async route => {
    await route.fulfill({
      json: {
        data: {
          deploymentId,
          mode: 'scheduled',
          cadence: '0 * * * *',
          incrementalKey: 'updated_at',
          watermark: { column: 'updated_at', maxValue: '2026-03-28T09:30:00.000Z' },
          backfill: {}
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/refresh-runs`, async route => {
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              id: 'refresh-history-2',
              mode: 'incremental',
              status: 'failed',
              reconciliation: { status: 'failed', blockers: ['source_row_count_mismatch'] },
              watermarkAfter: { maxValue: '2026-03-28T09:30:00.000Z' }
            },
            {
              id: 'refresh-history-1',
              mode: 'incremental',
              status: 'succeeded',
              reconciliation: { status: 'passed', blockers: [] },
              watermarkAfter: { maxValue: '2026-03-28T09:00:00.000Z' }
            }
          ],
          total: 2
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/release`, async route => {
    await route.fulfill({
      json: {
        data: {
          deploymentId,
          status: 'allowed',
          blockers: [],
          freshness: { lagMinutes: 15, budgetMinutes: 60 },
          sourceReconciliation: {
            scope: 'refresh_run',
            status: 'passed',
            blockers: []
          }
        }
      }
    })
  })

  await page.goto(`/data-model-release?dataSourceId=${dataSourceId}&draftId=${draftId}`)

  await page.getByTestId('data-model-release-create-semantic-draft').click()
  await page.getByTestId('data-model-release-create-deployment').click()

  await expect(page.getByTestId('data-model-release-load-history-row-job-history-2')).toContainText('failed')
  await expect(page.getByTestId('data-model-release-load-history-row-job-history-2')).toContainText('retry 2')
  await expect(page.getByTestId('data-model-release-load-history-row-job-history-1')).toContainText('succeeded')
  await expect(page.getByTestId('data-model-release-refresh-run-row-refresh-history-2')).toContainText('failed')
  await expect(page.getByTestId('data-model-release-refresh-run-row-refresh-history-1')).toContainText('succeeded')
})

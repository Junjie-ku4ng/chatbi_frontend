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

test('data model release workbench surfaces load reconciliation and ask readiness together', async ({ page }) => {
  const draftId = 'source-draft-reconciliation'
  const dataSourceId = 'ds-reconciliation'
  const semanticModelId = 'semantic-draft-reconciliation'
  const deploymentId = 'deployment-reconciliation'
  const loadJobId = 'load-reconciliation'

  await mockCapabilities(page)

  await page.route(`**/api/xpert/source-model-drafts/${draftId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: draftId,
          name: 'Reconciliation Source Draft',
          dataSourceId,
          draftVersion: 5,
          latestIntrospection: { tables: 2, relations: 1 },
          tables: [{ id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' }],
          relations: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/semantic-model-drafts`, async route => {
    await route.fulfill({ json: { data: { id: semanticModelId, name: 'Sales semantic draft', cube: 'Sales' } } })
  })

  await page.route(`**/api/xpert/semantic-model/${semanticModelId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: semanticModelId,
          name: 'Sales semantic draft',
          cube: 'Sales',
          dataSourceId
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/pa-deployments`, async route => {
    await route.fulfill({ json: { data: { id: deploymentId, status: 'approved', targetCube: 'Sales' } } })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: deploymentId,
          semanticModelId,
          status: 'approved',
          targetCube: 'Sales'
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/load-jobs`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          data: {
            items: [
              {
                id: 'job-reconciliation-1',
                mode: 'incremental',
                status: 'failed',
                retryCount: 1,
                reconciliation: { status: 'failed' }
              }
            ],
            total: 1
          }
        }
      })
      return
    }

    await route.fulfill({
      json: {
        data: {
          id: loadJobId,
          status: 'failed',
          retryCount: 1,
          writeSummary: { writtenCells: 10 },
          reconciliation: {
            status: 'failed',
            blockers: ['freshness_budget_exceeded']
          }
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
          cadence: '0 */2 * * *',
          incrementalKey: 'updated_at',
          watermark: { column: 'updated_at', maxValue: '2026-03-28T09:00:00.000Z' },
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
              id: 'refresh-reconciliation-1',
              mode: 'incremental',
              status: 'failed',
              reconciliation: { status: 'failed', blockers: ['freshness_budget_exceeded'] },
              watermarkAfter: { maxValue: '2026-03-28T09:00:00.000Z' }
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}/release`, async route => {
    await route.fulfill({
      json: {
        data: {
          deploymentId,
          status: 'blocked',
          blockers: ['freshness_budget_exceeded'],
          freshness: { lagMinutes: 120, budgetMinutes: 60 },
          sourceReconciliation: {
            scope: 'refresh_run',
            status: 'failed',
            blockers: ['freshness_budget_exceeded']
          }
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-load-jobs/${loadJobId}/items`, async route => {
    await route.fulfill({
      json: {
        data: {
          items: [{ itemType: 'reconciliation', status: 'failed' }],
          total: 1
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-load-jobs/${loadJobId}/reconciliation`, async route => {
    await route.fulfill({
      json: {
        data: {
          scope: 'load_job',
          status: 'failed',
          blockers: ['freshness_budget_exceeded'],
          freshness: { runtimeMetadata: 'stale' },
          metrics: { lagSeconds: 7200 }
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model/${semanticModelId}/ask-readiness`, async route => {
    await route.fulfill({
      json: {
        data: {
          status: 'blocked',
          blockers: ['freshness_budget_exceeded'],
          checks: [{ code: 'runtime_metadata_freshness', status: 'failed' }]
        }
      }
    })
  })

  await page.goto(`/data-model-release?dataSourceId=${dataSourceId}&draftId=${draftId}`)

  await page.getByTestId('data-model-release-create-semantic-draft').click()
  await page.getByTestId('data-model-release-create-deployment').click()
  await page.getByTestId('data-model-release-create-load-job').click()
  await page.getByTestId('data-model-release-readiness').click()

  await expect(page.getByTestId('data-model-release-reconciliation-panel')).toContainText('freshness_budget_exceeded')
  await expect(page.getByTestId('data-model-release-readiness-panel')).toContainText('blocked')
  await expect(page.getByTestId('data-model-release-refresh-panel')).toContainText('0 */2 * * *')
  await expect(page.getByTestId('data-model-release-refresh-panel')).toContainText('refresh-reconciliation-1')
  await expect(page.getByTestId('data-model-release-release-gate-panel')).toContainText('freshness_budget_exceeded')
  await expect(page.getByTestId('data-model-release-release-gate-panel')).toContainText('Lag 120m')
})

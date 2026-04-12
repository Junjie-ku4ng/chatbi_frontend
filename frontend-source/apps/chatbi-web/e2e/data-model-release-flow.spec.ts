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

test('data model release workbench covers source modeling, indicator candidates, deployment, and load flow', async ({ page }) => {
  const draftId = 'source-draft-flow'
  const dataSourceId = 'ds-flow'
  const semanticModelId = 'semantic-draft-flow'
  const deploymentId = 'deployment-flow'
  const loadJobId = 'load-flow'
  const loadHistory = [
    {
      id: 'job-history-2',
      mode: 'incremental',
      status: 'failed',
      retryCount: 2,
      reconciliation: { status: 'failed' },
      writeSummary: { sourceRowCount: 125, targetLeafWriteCount: 120 }
    },
    {
      id: 'job-history-1',
      mode: 'full_snapshot',
      status: 'succeeded',
      retryCount: 0,
      reconciliation: { status: 'passed' },
      writeSummary: { sourceRowCount: 120, targetLeafWriteCount: 120 }
    }
  ]

  await mockCapabilities(page)

  await page.route(`**/api/xpert/source-model-drafts/${draftId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: draftId,
          name: 'Flow Source Draft',
          dataSourceId,
          draftVersion: 4,
          latestIntrospection: { tables: 2, relations: 1, inferredAt: '2026-03-30T00:00:00.000Z' },
          tables: [
            { id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' },
            { id: 'dim-product', sourcePath: 'public.dim_product', role: 'dimension' }
          ],
          relations: [{ fromTableId: 'fact-sales', toTableId: 'dim-product', joinType: 'left' }]
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/introspect`, async route => {
    await route.fulfill({ json: { data: { tables: [{ sourcePath: 'public.fact_sales' }], relationSuggestions: [{ fromTableId: 'fact-sales', toTableId: 'dim-product' }] } } })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/compile-semantic-preview`, async route => {
    await route.fulfill({ json: { data: { schemaSnapshot: { cube: 'Sales', measures: ['Sales', 'Profit'] } } } })
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

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/indicator-candidates/preview`, async route => {
    await route.fulfill({
      json: {
        data: {
          previewStatus: 'ready',
          blockers: [],
          candidates: [
            { code: 'SALES', name: 'Sales', status: 'new', action: 'create_draft' },
            { code: 'PROFIT_RATE', name: 'Profit Rate', status: 'new', action: 'create_draft', derivationRule: 'profit_rate_from_profit_and_sales' }
          ]
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/indicator-candidates/apply`, async route => {
    await route.fulfill({
      json: {
        data: {
          modelId: semanticModelId,
          applied: [{ code: 'SALES' }, { code: 'PROFIT_RATE' }],
          skipped: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/pa-deployments/preview`, async route => {
    await route.fulfill({ json: { data: { targetCube: 'Sales', deploymentDiffSummary: { createCount: 3, updateCount: 1, deleteCount: 0 } } } })
  })

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/pa-deployments`, async route => {
    await route.fulfill({ json: { data: { id: deploymentId, status: 'draft', targetCube: 'Sales' } } })
  })

  await page.route(`**/api/xpert/pa-deployments/${deploymentId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: deploymentId,
          semanticModelId,
          status: 'draft',
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
            items: loadHistory,
            total: loadHistory.length
          }
        }
      })
      return
    }

    await route.fulfill({
      json: {
        data: {
          id: loadJobId,
          status: 'succeeded',
          retryCount: 0,
          writeSummary: { writtenCells: 12 },
          reconciliation: { status: 'passed', blockers: [] }
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
              id: 'refresh-flow-2',
              mode: 'incremental',
              status: 'failed',
              reconciliation: { status: 'failed', blockers: ['source_row_count_mismatch'] },
              watermarkAfter: { maxValue: '2026-03-28T09:30:00.000Z' }
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
          blockers: ['source_row_count_mismatch'],
          freshness: { lagMinutes: 75, budgetMinutes: 60 },
          sourceReconciliation: {
            scope: 'refresh_run',
            status: 'failed',
            blockers: ['source_row_count_mismatch']
          }
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-load-jobs/${loadJobId}/items`, async route => {
    await route.fulfill({
      json: {
        data: {
          items: [
            { itemType: 'extract', status: 'succeeded' },
            { itemType: 'write', status: 'succeeded' },
            { itemType: 'reconciliation', status: 'succeeded' }
          ],
          total: 3
        }
      }
    })
  })

  await page.route(`**/api/xpert/pa-load-jobs/${loadJobId}/reconciliation`, async route => {
    await route.fulfill({
      json: {
        data: {
          scope: 'load_job',
          status: 'passed',
          blockers: [],
          metrics: { rowCount: { source: 12, target: 12 } }
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model/${semanticModelId}/ask-readiness`, async route => {
    await route.fulfill({ json: { data: { status: 'ready', blockers: [] } } })
  })

  await page.goto(`/data-model-release?dataSourceId=${dataSourceId}&draftId=${draftId}`)
  await expect(page.getByTestId('data-model-release-page')).toBeVisible()

  await expect(page.getByTestId('data-model-release-source-modeling-panel')).toContainText('fact: public.fact_sales')
  await expect(page.getByTestId('data-model-release-source-modeling-panel')).toContainText('fact-sales left dim-product')

  await page.getByTestId('data-model-release-introspect').click()
  await page.getByTestId('data-model-release-compile').click()
  await page.getByTestId('data-model-release-create-semantic-draft').click()

  await page.getByTestId('data-model-release-preview-indicator-candidates').click()
  await expect(page.getByTestId('data-model-release-indicator-candidates-panel')).toContainText('PROFIT_RATE')

  await page.getByTestId('data-model-release-apply-indicator-candidates').click()
  await expect(page.getByTestId('data-model-release-indicator-candidates-panel')).toContainText('"applied"')

  await page.getByTestId('data-model-release-deployment-preview').click()
  await page.getByTestId('data-model-release-create-deployment').click()
  await expect(page.getByTestId('data-model-release-deployment-record')).toContainText(deploymentId)
  await expect(page.getByTestId('data-model-release-deployment-diff-summary')).toContainText('Create 3')
  await expect(page.getByTestId('data-model-release-deployment-diff-summary')).toContainText('Update 1')
  await expect(page.getByTestId('data-model-release-load-history-panel')).toContainText('job-history-2')
  await expect(page.getByTestId('data-model-release-load-history-panel')).toContainText('retry 2')
  await expect(page.getByTestId('data-model-release-release-gate-panel')).toContainText('blocked')
  await expect(page.getByTestId('data-model-release-release-gate-panel')).toContainText('source_row_count_mismatch')

  await page.getByTestId('data-model-release-create-load-job').click()
  await expect(page.getByTestId('data-model-release-load-panel')).toContainText(loadJobId)
  await expect(page.getByTestId('data-model-release-load-panel')).toContainText('writtenCells')
})

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
  return Promise.all(
    routes.map(pattern =>
      page.route(pattern, async route => {
        await route.fulfill({ json: payload })
      })
    )
  )
}

test('data model release workbench shows draft, introspection, compile, deployment preview, and readiness state', async ({
  page
}) => {
  const draftId = 'source-draft-e2e'
  const dataSourceId = 'ds-e2e'
  const semanticModelId = 'semantic-draft-e2e'

  await mockCapabilities(page)

  await page.route(`**/api/xpert/source-model-drafts/${draftId}`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: draftId,
          name: 'E2E Source Draft',
          dataSourceId,
          draftVersion: 3,
          latestIntrospection: {
            tables: 2,
            relations: 1,
            inferredAt: '2026-03-30T00:00:00.000Z'
          },
          tables: [
            { id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' },
            { id: 'dim-product', sourcePath: 'public.dim_product', role: 'dimension' }
          ],
          relations: [
            {
              fromTableId: 'fact-sales',
              toTableId: 'dim-product',
              joinType: 'left',
              columnMappings: [{ fromColumn: 'product_id', toColumn: 'product_id' }]
            }
          ]
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/introspect`, async route => {
    await route.fulfill({
      json: {
        data: {
          tables: [
            { sourcePath: 'public.fact_sales', role: 'fact', columns: ['sale_id', 'sold_at', 'sales', 'profit'] },
            { sourcePath: 'public.dim_product', role: 'dimension', columns: ['product_id', 'product_name', 'category'] }
          ],
          relationSuggestions: [{ fromTableId: 'fact-sales', toTableId: 'dim-product', confidence: 0.98 }]
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/compile-semantic-preview`, async route => {
    await route.fulfill({
      json: {
        data: {
          schemaSnapshot: {
            cube: 'Sales',
            measures: ['Sales', 'Profit'],
            dimensions: ['Product', 'Time']
          },
          sourceModel: {
            compilerVersion: 'v1',
            inputFingerprint: 'draft-fingerprint'
          }
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/semantic-model-drafts`, async route => {
    await route.fulfill({
      json: {
        data: {
          id: semanticModelId,
          name: 'Sales semantic draft',
          cube: 'Sales'
        }
      }
    })
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

  await page.route(`**/api/xpert/semantic-models/${semanticModelId}/pa-deployments/preview`, async route => {
    await route.fulfill({
      json: {
        data: {
          targetCube: 'Sales',
          deploymentDiffSummary: {
            createCount: 3,
            updateCount: 1,
            deleteCount: 0
          },
          loadMode: 'full_snapshot'
        }
      }
    })
  })

  await page.route(`**/api/xpert/semantic-model/${semanticModelId}/ask-readiness`, async route => {
    await route.fulfill({
      json: {
        data: {
          status: 'ready',
          blockers: [],
          checks: [
            { code: 'semantic_published', status: 'passed' },
            { code: 'deployment_released', status: 'passed' }
          ]
        }
      }
    })
  })

  await page.goto(`/data-model-release?dataSourceId=${dataSourceId}&draftId=${draftId}`)

  await expect(page.getByTestId('data-model-release-page')).toBeVisible()
  await expect(page.getByTestId(`data-model-release-draft-row-${draftId}`)).toBeVisible()

  await page.getByTestId('data-model-release-introspect').click()
  await expect(page.getByTestId('data-model-release-introspection-panel')).toContainText('public.fact_sales')

  await page.getByTestId('data-model-release-compile').click()
  await expect(page.getByTestId('data-model-release-compile-panel')).toContainText('schemaSnapshot')

  await page.getByTestId('data-model-release-create-semantic-draft').click()
  await expect(page.getByTestId('data-model-release-semantic-model-id')).toHaveText(semanticModelId)

  await page.getByTestId('data-model-release-deployment-preview').click()
  await expect(page.getByTestId('data-model-release-deployment-panel')).toContainText('PA deployment preview')

  await page.getByTestId('data-model-release-readiness').click()
  await expect(page.getByTestId('data-model-release-readiness-panel')).toContainText('readiness')
})

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

test('data source to release bootstrap path starts modeling from settings and creates a draft in one flow', async ({ page }) => {
  const dataSourceId = 'ds-bootstrap'
  const draftId = 'draft-bootstrap'

  await mockCapabilities(page)

  await page.route('**/api/xpert/data-source?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: dataSourceId,
              name: 'Bootstrap Warehouse',
              type: 'pa-tm1'
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route(`**/api/xpert/data-sources/${dataSourceId}/source-catalog/tables*`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: [
          {
            name: 'public.fact_sales',
            label: 'public.fact_sales'
          },
          {
            name: 'public.dim_product',
            label: 'public.dim_product'
          }
        ]
      }
    })
  })

  await page.route(`**/api/xpert/data-sources/${dataSourceId}/source-catalog/columns*`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: [
          { name: 'sale_id', type: 'string' },
          { name: 'sales', type: 'number' }
        ]
      }
    })
  })

  await page.route(`**/api/xpert/data-sources/${dataSourceId}/source-model-drafts`, async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: draftId,
          name: 'Bootstrap Source Draft',
          dataSourceId,
          draftVersion: 1,
          tables: [{ id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' }],
          relations: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/introspect`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          tables: [{ sourcePath: 'public.fact_sales' }],
          relationSuggestions: [{ fromTableId: 'fact-sales', toTableId: 'dim-product' }]
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/joins/infer`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          applied: true,
          relations: [{ fromTableId: 'fact-sales', toTableId: 'dim-product' }]
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/fact-dimension/preview`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          factTableId: 'fact-sales',
          dimensionTableIds: ['dim-product']
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: draftId,
          name: 'Bootstrap Source Draft',
          dataSourceId,
          draftVersion: 1,
          tables: [{ id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' }],
          relations: []
        }
      }
    })
  })

  await page.route(`**/api/xpert/source-model-drafts/${draftId}/compile-semantic-preview`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          schemaSnapshot: {
            cube: 'Sales',
            measures: ['Sales', 'Profit']
          }
        }
      }
    })
  })

  await page.goto('/settings/data-sources')

  await expect(page.getByTestId('settings-data-sources-start-modeling-ds-bootstrap')).toBeVisible()
  await page.getByTestId('settings-data-sources-start-modeling-ds-bootstrap').click()

  await expect(page).toHaveURL(new RegExp(`/data-model-release\\?dataSourceId=${dataSourceId}`))
  await expect(page.getByTestId('data-model-release-bootstrap-panel')).toBeVisible()

  await page.getByTestId('data-model-release-load-source-catalog').click()
  await expect(page.getByTestId('data-model-release-source-catalog-panel')).toContainText('public.fact_sales')

  await page.getByTestId('data-model-release-create-source-model-draft').click()
  await expect(page).toHaveURL(new RegExp(`draftId=${draftId}`))
  await expect(page.getByTestId('data-model-release-compile')).toBeVisible()
  await page.getByTestId('data-model-release-compile').click()
  await expect(page.getByTestId('data-model-release-compile-panel')).toContainText('schemaSnapshot')
})

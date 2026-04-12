import { expect, test } from '@playwright/test'

test('public index, token story, and onboarding readonly flow are reachable', async ({ page }) => {
  const publicStoryPayload = {
    apiVersion: 'v1',
    data: {
      story: {
        id: 'story-public-1',
        modelId: 'model-public',
        name: 'Public Story Token View',
        description: 'public story',
        status: 'RELEASED',
        options: {
          latestVersion: 1,
          items: [],
          canvas: {}
        }
      },
      canvas: {
        storyId: 'story-public-1',
        version: 1,
        canvas: {},
        metadata: {},
        widgets: []
      },
      shareLink: {
        id: 'share-public-1',
        storyId: 'story-public-1',
        token: 'token-demo',
        status: 'active'
      }
    }
  }

  await page.route('**/api/xpert/public/stories/token-demo', async route => {
    await route.fulfill({ json: publicStoryPayload })
  })

  await page.route('**/api/xpert/story-point/public/*', async route => {
    await route.fulfill({ json: publicStoryPayload })
  })

  await page.route('**/api/xpert/story-point/story-public-1', async route => {
    await route.fulfill({ json: publicStoryPayload })
  })

  await page.route('**/api/xpert/story-widget/my?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [],
          total: 0
        }
      }
    })
  })

  await page.route('**/api/xpert/data-source?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'ds-1',
              name: 'PA Sales Source',
              typeCode: 'pa-tm1',
              host: 'http://localhost:4000',
              authType: 'basic',
              status: 'active'
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/data-sources/*/pa/cubes?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ name: 'sales_cube', dimensions: ['time', 'region'] }],
          total: 1,
          limit: 20
        }
      }
    })
  })

  await page.route('**/api/xpert/data-sources/*/pa/cubes/*/metadata*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          cube: 'sales_cube',
          metricDimension: 'metric',
          dimensions: ['time', 'region'],
          measures: ['revenue', 'profit'],
          schemaSnapshot: {}
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/onboard-from-pa', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          model: {
            id: 'model-onboard-1',
            name: 'readonly-sales',
            cube: 'sales_cube',
            dataSourceId: 'ds-1'
          },
          syncProfile: {
            id: 'sync-1',
            modelId: 'model-onboard-1',
            mode: 'readonly_binding',
            deletePolicy: 'no_delete',
            relationMaterialization: 'metadata_cube',
            enabled: true
          },
          metadata: {
            cube: 'sales_cube',
            metricDimension: 'metric',
            dimensions: ['time', 'region'],
            measures: ['revenue', 'profit'],
            schemaSnapshot: {}
          }
        }
      }
    })
  })

  await page.goto('/public')
  await expect(page.getByTestId('public-home-title')).toContainText('Public')
  await page.getByTestId('public-home-open-demo-story').click()

  await expect(page).toHaveURL(/\/public\/story\/token-demo$/)
  await expect(page.getByRole('heading', { name: 'Public Story Token View' })).toBeVisible()

  await page.goto('/onboarding')
  await expect(page.getByTestId('onboarding-home-title')).toContainText('Onboarding')
  await page.getByTestId('onboarding-open-semantic-readonly').click()

  await expect(page).toHaveURL(/\/onboarding\/semantic-readonly$/)
  await page.getByTestId('onboarding-datasource-select').selectOption('ds-1')
  await page.getByTestId('onboarding-query').fill('sales')
  await page.getByTestId('onboarding-load-cubes').click()
  await expect(page.getByTestId('onboarding-cube-sales_cube')).toBeVisible()

  await page.getByTestId('onboarding-cube-sales_cube').click()
  await page.getByTestId('onboarding-load-metadata').click()
  await expect(page.getByTestId('onboarding-metadata-metric')).toContainText('metric')

  await page.getByTestId('onboarding-apply').click()
  await expect(page.getByTestId('onboarding-result-model')).toContainText('model-onboard-1')
  await expect(page.getByTestId('onboarding-open-canonical-release')).toBeVisible()
  await expect(page.getByTestId('onboarding-open-canonical-release')).toHaveAttribute(
    'href',
    '/data-model-release?dataSourceId=ds-1&modelId=model-onboard-1'
  )
})

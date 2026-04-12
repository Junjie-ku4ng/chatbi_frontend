import { expect, test } from '@playwright/test'

function buildInsight(id: number) {
  return {
    id: `virt-${id}`,
    modelId: 'virtual-model',
    title: `Virtual Insight ${id}`,
    summary: `Synthetic insight ${id}`,
    status: 'active',
    tags: ['virtual'],
    latestVersion: 1
  }
}

test('insights list virtualizes large datasets and loads next pages', async ({ page }) => {
  const model = { id: 'e2e-model' }
  const total = 220
  const pageSize = 50
  const requests: string[] = []

  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({
      json: {
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
    })
  })

  await page.route('**/api/xpert/semantic-model?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: model.id,
              name: 'Virtual Model',
              cube: 'Sales',
              runtime: 'chatbi'
            }
          ]
        }
      }
    })
  })

  await page.route('**/api/xpert/collection/my?*', route => {
    const url = new URL(route.request().url())
    requests.push(url.search)
    const dataRaw = url.searchParams.get('data') ?? '{}'
    const data = JSON.parse(dataRaw) as { skip?: number; take?: number }
    const start = typeof data.skip === 'number' && Number.isFinite(data.skip) && data.skip > 0 ? data.skip : 0
    const take = typeof data.take === 'number' && Number.isFinite(data.take) && data.take > 0 ? data.take : pageSize
    const end = Math.min(total, start + take)
    const items = []
    for (let index = start; index < end; index += 1) {
      items.push(buildInsight(index + 1))
    }
    const nextCursor = end < total ? end : undefined
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiVersion: 'v1',
        data: {
          items,
          total,
          nextCursor
        }
      })
    })
  })

  await page.goto(`/dashboard?modelId=${encodeURIComponent(model.id)}`)
  await expect(page.locator('[data-testid="virtualized-list"] article').first()).toBeVisible({ timeout: 15_000 })

  const renderedBeforeScroll = await page.locator('[data-testid="virtualized-list"] article').count()
  expect(renderedBeforeScroll).toBeLessThan(120)

  const container = page.locator('[data-testid="virtualized-list"]').first()
  await container.evaluate(element => {
    element.scrollTop = element.scrollHeight
  })

  await expect
    .poll(
      () =>
        requests.some(query => {
          const url = new URL(`http://localhost${query}`)
          const dataRaw = url.searchParams.get('data')
          if (!dataRaw) return false
          const data = JSON.parse(dataRaw) as { skip?: number }
          return data.skip === 50
        }),
      {
        timeout: 10_000
      }
    )
    .toBe(true)
})

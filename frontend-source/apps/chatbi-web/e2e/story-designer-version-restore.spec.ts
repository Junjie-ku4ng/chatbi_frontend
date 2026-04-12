import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('story designer supports version diff and restore', async ({ page }) => {
  const now = '2026-02-23T00:00:00.000Z'
  const modelId = 'model-e2e'
  const storyId = 'story-restore-1'

  const story = {
    id: storyId,
    modelId,
    name: 'Designer Version Story',
    description: 'restore test story',
    status: 'RELEASED',
    createdAt: now,
    updatedAt: now,
    options: {
      modelId,
      summary: 'restore test story',
      latestVersion: 2,
      metadata: {},
      items: [
        {
          id: 'item-snapshot-1',
          storyId,
          itemType: 'insight',
          refId: 'widget-snapshot-1',
          sortOrder: 0
        }
      ],
      canvas: {
        layout: { mode: 'grid', columns: 12, gap: 12 },
        theme: { name: 'default' }
      },
      shareLinks: []
    }
  }

  const snapshotWidget = {
    id: 'widget-snapshot-1',
    storyId,
    key: 'widget-snapshot',
    name: 'Snapshot Widget',
    createdAt: now,
    updatedAt: now,
    options: {
      widgetType: 'text',
      widgetKey: 'widget-snapshot',
      title: 'Snapshot Widget',
      payload: { content: 'snapshot' },
      layout: { x: 0, y: 0, w: 6, h: 4 },
      sortOrder: 0,
      status: 'active'
    }
  }

  const transientWidget = {
    id: 'widget-transient-1',
    storyId,
    key: 'widget-transient',
    name: 'Transient Widget',
    createdAt: now,
    updatedAt: now,
    options: {
      widgetType: 'text',
      widgetKey: 'widget-transient',
      title: 'Transient Widget',
      payload: { content: 'transient' },
      layout: { x: 0, y: 1, w: 6, h: 4 },
      sortOrder: 1,
      status: 'active'
    }
  }

  let restored = false

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const json = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ apiVersion: 'v1', data })
  })

  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill(
      json({
        authType: 'dev',
        userId: 'e2e-user',
        scopes: {
          read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
          write: ['allow:write:model:*'],
          denyRead: [],
          denyWrite: []
        }
      })
    )
  })

  await page.route('**/api/xpert/story-template/my?*', async route => {
    await route.fulfill(
      json({
        items: [],
        total: 0
      })
    )
  })

  await page.route('**/api/xpert/story-widget/my?*', async route => {
    const items = restored ? [snapshotWidget] : [snapshotWidget, transientWidget]
    await route.fulfill(
      json({
        items: clone(items),
        total: items.length
      })
    )
  })

  await page.route('**/api/xpert/story-point/*', async route => {
    const request = route.request()
    const method = request.method().toUpperCase()
    if (method === 'GET') {
      await route.fulfill(json(clone(story)))
      return
    }

    if (method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      story.name = String(body.name ?? story.name)
      story.description = String(body.description ?? story.description)
      story.status = String(body.status ?? story.status)
      story.options = {
        ...story.options,
        ...((body.options as Record<string, unknown> | undefined) ?? {})
      }
      story.updatedAt = now
      restored = true
      await route.fulfill(json(clone(story)))
      return
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unsupported method: ${method}`, statusCode: 405 })
    })
  })

  await page.goto(`/project/${storyId}/designer`)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText('Transient Widget')

  const fromSelect = page.getByTestId('story-designer-version-from')
  const versionValue = await fromSelect.locator('option').first().getAttribute('value')
  expect(versionValue).toBeTruthy()
  await fromSelect.selectOption(String(versionValue))
  await page.getByTestId('story-designer-version-to').selectOption(String(versionValue))
  await page.getByTestId('story-designer-version-diff').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Version diff loaded/)

  await page.getByTestId('story-designer-version-restore').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Version restored/)
  await expect(page.getByTestId('story-designer-widget-list')).not.toContainText('Transient Widget')
})

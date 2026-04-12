import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('story designer supports template apply with append and replace modes', async ({ page }) => {
  const now = '2026-02-23T00:00:00.000Z'
  const modelId = 'model-e2e'
  const templateStoryId = 'story-template-1'
  const targetStoryId = 'story-target-1'
  const templateWidgetId = 'widget-template-1'
  const targetWidgetId = 'widget-target-1'

  const stories = new Map<string, Record<string, unknown>>([
    [
      templateStoryId,
      {
        id: templateStoryId,
        modelId,
        name: 'Designer Template Source',
        description: 'template source',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        options: {
          modelId,
          summary: 'template source',
          latestVersion: 1,
          metadata: {},
          items: [
            {
              id: 'item-template-1',
              storyId: templateStoryId,
              itemType: 'insight',
              refId: templateWidgetId,
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
    ],
    [
      targetStoryId,
      {
        id: targetStoryId,
        modelId,
        name: 'Designer Template Target',
        description: 'target story',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        options: {
          modelId,
          summary: 'target story',
          latestVersion: 1,
          metadata: {},
          items: [
            {
              id: 'item-target-1',
              storyId: targetStoryId,
              itemType: 'insight',
              refId: targetWidgetId,
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
    ]
  ])

  const widgets = new Map<string, Record<string, unknown>>([
    [
      templateWidgetId,
      {
        id: templateWidgetId,
        storyId: templateStoryId,
        key: 'widget-template',
        name: 'Template Widget',
        createdAt: now,
        updatedAt: now,
        options: {
          widgetType: 'text',
          widgetKey: 'widget-template',
          title: 'Template Widget',
          payload: { content: 'template content' },
          layout: { x: 0, y: 0, w: 6, h: 4 },
          sortOrder: 0,
          status: 'active'
        }
      }
    ],
    [
      targetWidgetId,
      {
        id: targetWidgetId,
        storyId: targetStoryId,
        key: 'widget-target',
        name: 'Target Widget',
        createdAt: now,
        updatedAt: now,
        options: {
          widgetType: 'text',
          widgetKey: 'widget-target',
          title: 'Target Widget',
          payload: { content: 'target content' },
          layout: { x: 0, y: 0, w: 6, h: 4 },
          sortOrder: 0,
          status: 'active'
        }
      }
    ]
  ])

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const json = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ apiVersion: 'v1', data })
  })

  const getStoryItems = (storyId: string) => {
    const story = stories.get(storyId)
    if (!story) return []
    const options = story.options as Record<string, unknown> | undefined
    return Array.isArray(options?.items) ? (options.items as Array<Record<string, unknown>>) : []
  }

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
        items: [
          {
            id: 'template-record-1',
            storyId: templateStoryId,
            modelId,
            name: 'Template-Story',
            status: 'RELEASED',
            createdAt: now,
            updatedAt: now,
            options: {
              reason: 'e2e template promote',
              sourceStoryId: templateStoryId
            }
          }
        ],
        total: 1
      })
    )
  })

  await page.route('**/api/xpert/story-widget/my?*', async route => {
    const url = new URL(route.request().url())
    const dataRaw = url.searchParams.get('data') ?? '{}'
    const data = JSON.parse(dataRaw) as { where?: { storyId?: string } }
    const storyId = String(data.where?.storyId ?? '')
    const items = getStoryItems(storyId)
      .map(item => widgets.get(String(item.refId ?? '')))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map(item => clone(item))

    await route.fulfill(
      json({
        items,
        total: items.length
      })
    )
  })

  await page.route('**/api/xpert/story-point/*', async route => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = new URL(request.url())
    const storyId = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    const current = stories.get(storyId)

    if (!current) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Story not found', statusCode: 404 })
      })
      return
    }

    if (method === 'GET') {
      await route.fulfill(json(clone(current)))
      return
    }

    if (method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      const currentOptions = (current.options as Record<string, unknown> | undefined) ?? {}
      const nextOptions = {
        ...currentOptions,
        ...((body.options as Record<string, unknown> | undefined) ?? {})
      }
      const updated = {
        ...current,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        options: nextOptions,
        updatedAt: now
      }
      stories.set(storyId, updated)
      await route.fulfill(json(clone(updated)))
      return
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unsupported method: ${method}`, statusCode: 405 })
    })
  })

  await page.goto(`/project/${targetStoryId}/designer`)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText('Target Widget')

  await page.getByTestId('story-designer-template-select').selectOption(templateStoryId)
  await page.getByTestId('story-designer-template-mode').selectOption('append')
  await page.getByTestId('story-designer-template-apply').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Template applied \(append\)/)
  await expect(page.getByTestId('story-designer-widget-list')).toContainText('Template Widget')

  await page.getByTestId('story-designer-template-mode').selectOption('replace')
  await page.getByTestId('story-designer-template-apply').click()
  await expect(page.getByTestId('story-designer-status')).toContainText(/Template applied \(replace\)/)
})

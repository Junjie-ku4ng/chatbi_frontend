import { expect, test } from '@playwright/test'

function mockCapabilities(page: import('@playwright/test').Page) {
  const payload = {
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

  const routes = ['**/api/pa/auth/capabilities*', '**/api/xpert/auth/capabilities*']
  return Promise.all(
    routes.map(pattern =>
      page.route(pattern, async route => {
        await route.fulfill({ json: payload })
      })
    )
  )
}

async function mockWorkspaceApi(page: import('@playwright/test').Page) {
  let archiveCount = 0

  await page.route('**/api/xpert/xpert-workspace/my*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            { id: 'growth-lab', name: 'Growth Lab', code: 'growth-lab' },
            { id: 'finance-core', name: 'Finance Core', code: 'finance-core' }
          ],
          total: 2
        }
      }
    })
  })

  await page.route('**/api/xpert/xpert-workspace/*/archive', async route => {
    if (route.request().method() === 'POST') {
      archiveCount += 1
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: {
            id: 'growth-lab',
            archivedAt: new Date().toISOString()
          }
        }
      })
      return
    }
    await route.fallback()
  })

  return {
    getArchiveCount: () => archiveCount
  }
}

async function mockWorkspaceTabApis(page: import('@playwright/test').Page) {
  await page.route('**/api/xpert/xpert/by-workspace/ws-alpha*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'xpert-1', name: 'Revenue Analyst' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/copilot-knowledge/by-workspace/ws-alpha*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'kb-1', name: 'Revenue KB' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/pa/api/xpert-toolset/by-workspace/ws-alpha*', async route => {
    const url = new URL(route.request().url())
    const category = url.searchParams.get('category')
    const item =
      category === 'custom'
        ? { id: 'tool-custom-1', name: 'Custom SQL Tool', category: 'custom' }
        : category === 'builtin'
          ? { id: 'tool-builtin-1', name: 'Builtin Summarizer', category: 'builtin' }
          : { id: 'tool-1', name: 'MCP Search', category: 'mcp' }
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [item],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'model-1', name: 'Sales Model', runtime: 'chatbi' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/xpert-workspace/ws-alpha/members*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: [{ id: 'u-1', name: 'Alice' }, { id: 'u-2', name: 'Bob' }]
      }
    })
  })

  await page.route('**/api/xpert/xpert-task/my?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'task-1', name: 'Sync revenue KPI', options: { runtimeStatus: 'running' } }],
          total: 1
        }
      }
    })
  })
}

test('explore route is reachable and links to xpert workspace', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/explore')

  await expect(page.getByTestId('xpert-explore-title')).toContainText('Explore')
  await expect(page.getByTestId('xpert-workspace-entry')).toBeVisible()
})

test('xpert workspace routes and tabs are all reachable with breadcrumb', async ({ page }) => {
  await mockCapabilities(page)

  const workspaceId = 'ws-alpha'

  await page.goto(`/xpert/w/${workspaceId}`)
  await expect(page).toHaveURL(new RegExp(`/xpert/w/${workspaceId}$`))
  await expect(page.getByTestId('xpert-workspace-breadcrumb')).toContainText(`xpert / w / ${workspaceId}`)
  await expect(page.getByTestId('xpert-workspace-route-truth')).toContainText('resource inventory surface')

  const tabPaths = [
    { key: 'xperts', path: `/xpert/w/${workspaceId}/xperts`, breadcrumb: `xpert / w / ${workspaceId} / xperts` },
    { key: 'knowledges', path: `/xpert/w/${workspaceId}/knowledges`, breadcrumb: `xpert / w / ${workspaceId} / knowledges` },
    { key: 'custom', path: `/xpert/w/${workspaceId}/custom`, breadcrumb: `xpert / w / ${workspaceId} / custom` },
    { key: 'builtin', path: `/xpert/w/${workspaceId}/builtin`, breadcrumb: `xpert / w / ${workspaceId} / builtin` },
    { key: 'mcp', path: `/xpert/w/${workspaceId}/mcp`, breadcrumb: `xpert / w / ${workspaceId} / mcp` },
    { key: 'database', path: `/xpert/w/${workspaceId}/database`, breadcrumb: `xpert / w / ${workspaceId} / database` }
  ]

  for (const tab of tabPaths) {
    await page.goto(tab.path)
    await expect(page).toHaveURL(new RegExp(tab.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
    await expect(page.getByTestId('xpert-workspace-breadcrumb')).toContainText(tab.breadcrumb)
    await expect(page.getByTestId('xpert-workspace-route-truth')).toContainText('resource inventory surface')
    await expect(page.getByTestId('xpert-workspace-tab-nav')).toBeVisible()
    await expect(page.getByTestId(`xpert-workspace-tab-${tab.key}`)).toBeVisible()
  }
})

test('xpert workspace index renders my workspaces and supports archive action', async ({ page }) => {
  await mockCapabilities(page)
  const workspaceApi = await mockWorkspaceApi(page)

  await page.goto('/xpert/w')

  await expect(page.getByTestId('xpert-workspace-open-growth-lab')).toBeVisible()
  await page.getByTestId('xpert-workspace-archive-growth-lab').click()

  await expect(page.getByTestId('xpert-workspace-status')).toContainText('archived')
  await expect.poll(() => workspaceApi.getArchiveCount()).toBe(1)
})

test('xpert workspace tab pages load real list panels', async ({ page }) => {
  await mockCapabilities(page)
  await mockWorkspaceTabApis(page)

  await page.goto('/xpert/w/ws-alpha/xperts')
  await expect(page.getByTestId('xpert-workspace-xperts-row-0')).toContainText('Revenue Analyst')

  await page.goto('/xpert/w/ws-alpha/knowledges')
  await expect(page.getByTestId('xpert-workspace-knowledges-row-0')).toContainText('Revenue KB')

  await page.goto('/xpert/w/ws-alpha/mcp')
  await expect(page.getByTestId('xpert-workspace-mcp-row-0')).toContainText('MCP Search')

  await page.goto('/xpert/w/ws-alpha/database')
  await expect(page.getByTestId('xpert-workspace-database-row-0')).toContainText('Sales Model')

  await page.goto('/xpert/w/ws-alpha/custom')
  await expect(page.getByTestId('xpert-workspace-custom-row-0')).toContainText('Custom SQL Tool')

  await page.goto('/xpert/w/ws-alpha/builtin')
  await expect(page.getByTestId('xpert-workspace-builtin-row-0')).toContainText('Builtin Summarizer')
})

test('xpert workspace home page shows resource overview cards', async ({ page }) => {
  await mockCapabilities(page)
  await mockWorkspaceTabApis(page)

  await page.goto('/xpert/w/ws-alpha')

  await expect(page.getByTestId('xpert-workspace-route-truth')).toContainText('resource inventory surface')
  await expect(page.getByTestId('xpert-workspace-overview-members')).toContainText('2')
  await expect(page.getByTestId('xpert-workspace-overview-xperts')).toContainText('1')
  await expect(page.getByTestId('xpert-workspace-overview-knowledges')).toContainText('1')
  await expect(page.getByTestId('xpert-workspace-overview-models')).toContainText('1')
  await expect(page.getByTestId('xpert-workspace-overview-task-0')).toContainText('Sync revenue KPI')
})

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

test('chatbi compatibility route is removed in canonical-only mode', async ({ request }) => {
  const response = await request.get('/chatbi', { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})

test('project chat routes resolve to canonical chat query model', async ({ page }) => {
  await mockCapabilities(page)

  await page.goto('/chat/p/project-alpha')
  await expect(page).toHaveURL(/\/chat\?/)
  await expect(page.getByTestId('ask-xpert-track-badge')).toBeVisible()
  const projectUrl = new URL(page.url())
  expect(projectUrl.searchParams.get('projectId')).toBe('project-alpha')

  await page.goto('/chat/p/project-alpha/c/conv-7?modelId=model-7')
  await expect(page).toHaveURL(/\/chat\?/)
  await expect(page.getByTestId('ask-conversation-badge')).toContainText('conv-7')
  const conversationUrl = new URL(page.url())
  expect(conversationUrl.searchParams.get('projectId')).toBe('project-alpha')
  expect(conversationUrl.searchParams.get('conversationId')).toBe('conv-7')
})

test('canonical project detail route hosts live story runtime', async ({ page }) => {
  await mockCapabilities(page)

  await page.route('**/api/xpert/story-point/story-e2e', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'story-e2e',
          modelId: 'model-story',
          name: 'Story Canonical Detail',
          description: 'project story detail',
          status: 'DRAFT',
          options: {
            latestVersion: 1,
            items: [],
            metadata: {}
          }
        }
      }
    })
  })

  await page.goto('/project/story-e2e')

  await expect(page).toHaveURL(/\/project\/story-e2e$/)
  await expect(page.getByTestId('story-detail-id')).toContainText('story-e2e')
})

test('xpert tool detail route is reachable and renders tool runtime marker', async ({ page }) => {
  await mockCapabilities(page)

  await page.route('**/api/pa/api/xpert-toolset/plugin-77', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'plugin-77',
          name: 'Plugin 77',
          status: 'active',
          options: {
            policy: {
              timeoutMs: 5000,
              maxPayloadBytes: 262144,
              maxActionsPerMinute: 120,
              allowedDomains: ['indicator_governance'],
              status: 'active'
            }
          }
        }
      }
    })
  })

  await page.goto('/xpert/tool/plugin-77')

  await expect(page).toHaveURL(/\/xpert\/tool\/plugin-77$/)
  await expect(page.getByTestId('xpert-tool-detail')).toBeVisible()
  await expect(page.getByTestId('xpert-tool-policy-status')).toContainText('active')
  await expect(page.getByTestId('xpert-tool-plugin-catalog-link')).toHaveAttribute('href', '/settings/plugins')
})

test('toolset plugins compat route declares canonical owner explicitly', async ({ page }) => {
  await page.goto('/toolset/plugins')

  await expect(page.getByTestId('toolset-compat-notice')).toContainText('Compatibility surface')
  await expect(page.getByTestId('toolset-canonical-owner-link')).toHaveAttribute('href', '/settings/plugins')
})

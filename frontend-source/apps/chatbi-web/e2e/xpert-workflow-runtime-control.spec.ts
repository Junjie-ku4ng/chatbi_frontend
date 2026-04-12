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

async function gotoWithRetry(page: import('@playwright/test').Page, path: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('ERR_ABORTED') || attempt === 1) {
        throw error
      }
    }
  }
}

async function mockWorkflowApi(page: import('@playwright/test').Page) {
  await page.route('**/api/xpert/xpert/expert-ctl/executions*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'exec-1',
              title: 'Revenue Agent',
              status: 'running',
              totalTokens: 120
            }
          ]
        }
      }
    })
  })

  await page.route('**/api/xpert/xpert-agent-execution/exec-1/log', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'exec-1',
          title: 'Revenue Agent',
          status: 'running',
          messages: [
            {
              id: 'msg-1',
              role: 'assistant',
              content: 'Need confirmation',
              conversationId: 'conv-1'
            }
          ],
          metadata: {
            conversation: {
              conversationId: 'conv-1',
              threadId: 'conv-1',
              turnId: 'turn-1'
            },
            executionLifecycle: {
              status: 'requires_action',
              transitions: ['queued', 'running', 'requires_action']
            },
            pendingActions: [{ id: 'pending-1', action: 'create_indicator' }],
            toolExecutions: [{ callId: 'call-1', tool: 'create_indicator', status: 'requires_confirmation' }]
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/xpert-agent-execution/exec-1/state', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          runtimeControl: {
            command: 'interrupt',
            status: 'requires_action',
            reason: 'manual_review'
          },
          executionLifecycle: {
            status: 'requires_action',
            transitions: ['queued', 'running', 'requires_action']
          }
        }
      }
    })
  })
}

async function mockChatWorkspaceApis(page: import('@playwright/test').Page, conversationId: string) {
  await page.route('**/api/pa/conversations/search', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: conversationId,
              title: 'workflow runtime conversation',
              updatedAt: '2026-02-25T08:00:00.000Z',
              options: { parameters: { modelId: 'model-1' } },
              messages: [{}, {}]
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/my?*', async route => {
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

  await page.route('**/api/xpert/chat-message-feedback/my?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: { items: [] }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/*/suggested-questions', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: ['继续']
        }
      }
    })
  })
}

test('workflow studio runtime control posts interrupt/resume/cancel with expected payload', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await mockCapabilities(page)
  await mockWorkflowApi(page)
  await mockChatWorkspaceApis(page, 'conv-1')

  await gotoWithRetry(page, '/xpert/x/expert-ctl/workflow')

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])

  await expect(page.getByTestId('xpert-expert-operation-control')).toBeVisible()
  await expect(page.getByTestId('xpert-expert-operation-control')).toContainText('conv-1')
  await expect(page.getByTestId('xpert-expert-operation-control-unavailable')).toBeVisible()

  await page.locator('.workspace-rail-nav a[href^="/chat"]').first().click()
  await expect(page).toHaveURL(/\/chat/)
  await expect(page.getByTestId('ask-runtime-execution-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-execution-panel')).toContainText('conversation: conv-1')
  await expect(page.getByTestId('ask-runtime-execution-panel')).toContainText('task: paused')
  await expect(page.getByTestId('ask-runtime-control-unavailable')).toBeVisible()
})

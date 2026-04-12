import { expect, test } from '@playwright/test'

type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

function mockSemanticModels(page: import('@playwright/test').Page, modelId: string) {
  return page.route('**/semantic-model?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: modelId,
              name: 'Chat Tasks Model',
              cube: 'Sales',
              runtime: 'chatbi'
            }
          ]
        }
      }
    })
  })
}

function mockCapabilities(page: import('@playwright/test').Page) {
  return page.route('**/auth/capabilities*', async route => {
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
}

async function mockChatRuntimeSession(
  page: import('@playwright/test').Page,
  input: {
    conversationId: string
    taskId: string
    traceKey: string
    queryLogId: string
  }
) {
  await page.route('**/api/pa/conversations/search', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: input.conversationId,
              title: 'runtime task conversation',
              updatedAt: '2026-02-25T10:00:00.000Z',
              options: { parameters: { modelId: 'model-runtime-task' } },
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
        data: { items: ['继续'] }
      }
    })
  })

  await page.route('**/api/xpert/chat', async route => {
    const events = [
      {
        type: 'event',
        event: 'on_conversation_start',
        data: { id: input.conversationId }
      },
      {
        type: 'event',
        event: 'on_message_start',
        data: { id: 'msg-task-runtime-1' }
      },
      {
        type: 'event',
        event: 'on_tool_start',
        data: {
          id: 'tool-task-runtime',
          toolset: 'analysis',
          tool: 'task_projection',
          status: 'running',
          meta: {
            conversationId: input.conversationId,
            traceKey: input.traceKey,
            taskId: input.taskId,
            queryLogId: input.queryLogId,
            progress: 60,
            total: 100
          }
        }
      },
      {
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: input.conversationId,
          messages: [{ id: 'msg-task-runtime-1', role: 'assistant' }],
          answer: { text: 'runtime done' },
          queryLogId: input.queryLogId,
          meta: {
            conversation: {
              conversationId: input.conversationId
            },
            traceKey: input.traceKey,
            taskId: input.taskId,
            queryLogId: input.queryLogId
          }
        }
      }
    ]

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
    })
  })
}

test('chat tasks page supports list/detail/retry lifecycle', async ({ page }) => {
  const modelId = `model-${Date.now()}`
  const taskId = 'task-1'
  let taskStatus: TaskStatus = 'failed'
  let retryCount = 0

  await mockCapabilities(page)
  await mockSemanticModels(page, modelId)

  await page.route('**/api/xpert/xpert-task/my?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: taskId,
              xpertId: modelId,
              name: 'Weekly analysis task',
              prompt: 'retry from e2e',
              status: 'scheduled',
              options: {
                runtimeStatus: taskStatus,
                progress: taskStatus === 'queued' ? 0 : 100,
                retryCount,
                sourceType: 'chat',
                traceKey: 'trace-task-1',
                conversationId: 'conv-task-1',
                payload: {
                  question: '上周营收与利润对比'
                },
                resultPayload: {},
                metadata: {
                  source: 'chat'
                }
              },
              createdAt: '2026-02-22T10:00:00.000Z',
              updatedAt: '2026-02-22T10:00:00.000Z'
            }
          ],
          total: 1,
          limit: 20,
          offset: 0
        }
      }
    })
  })

  await page.route(`**/api/xpert/xpert-task/${taskId}`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: taskId,
          xpertId: modelId,
          name: 'Weekly analysis task',
          prompt: 'retry from e2e',
          status: 'scheduled',
          options: {
            runtimeStatus: taskStatus,
            progress: taskStatus === 'queued' ? 0 : 100,
            total: 100,
            retryCount,
            sourceType: 'chat',
            traceKey: 'trace-task-1',
            conversationId: 'conv-task-1',
            payload: {
              question: '上周营收与利润对比'
            },
            resultPayload: {},
            metadata: {
              source: 'chat'
            }
          },
          createdAt: '2026-02-22T10:00:00.000Z',
          updatedAt: '2026-02-22T10:00:00.000Z'
        }
      }
    })
  })

  await page.route(`**/api/xpert/xpert-task/${taskId}/test`, async route => {
    taskStatus = 'queued'
    retryCount += 1
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          ok: true
        }
      }
    })
  })

  await page.goto('/chat/tasks')
  await expect(page.getByTestId('chat-task-model-select')).toBeVisible()
  await expect(page.getByTestId(`chat-task-row-${taskId}`)).toBeVisible()
  await expect(page.getByTestId(`chat-task-status-${taskId}`)).toContainText('failed')

  await page.getByTestId(`chat-task-open-${taskId}`).click()
  await expect(page).toHaveURL(new RegExp(`/chat/tasks/${taskId}(\\?.*)?$`))
  await expect(page.getByTestId('chat-task-detail-title')).toContainText('Weekly analysis task')
  await expect(page.getByTestId('chat-task-detail-status')).toContainText('failed')

  await page.getByTestId('chat-task-retry-submit').click()
  await expect(page.getByTestId('chat-task-detail-status')).toContainText('queued')
  await expect(page.getByTestId('chat-task-detail-retry-count')).toContainText('1')
})

test('chat tasks page renders empty state', async ({ page }) => {
  const modelId = `model-empty-${Date.now()}`

  await mockCapabilities(page)
  await mockSemanticModels(page, modelId)

  await page.route('**/api/xpert/xpert-task/my?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      }
    })
  })

  await page.goto('/chat/tasks')
  await expect(page.getByText('No chat tasks')).toBeVisible()
})

test('chat tasks overlays runtime hint from active chat session without refetch', async ({ page }) => {
  const modelId = 'model-runtime-task'
  const taskId = 'task-runtime-overlay-1'
  const conversationId = 'conv-runtime-overlay-1'
  const traceKey = 'trace-runtime-overlay-1'
  const queryLogId = 'query-log-runtime-overlay-1'

  await mockCapabilities(page)
  await mockSemanticModels(page, modelId)
  await mockChatRuntimeSession(page, {
    conversationId,
    taskId,
    traceKey,
    queryLogId
  })

  await page.route('**/api/xpert/xpert-task/my?**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: taskId,
              xpertId: modelId,
              name: 'Runtime Overlay Task',
              prompt: 'overlay status',
              status: 'scheduled',
              options: {
                runtimeStatus: 'failed',
                progress: 0,
                retryCount: 0,
                sourceType: 'chat',
                traceKey,
                conversationId
              },
              createdAt: '2026-02-25T10:00:00.000Z',
              updatedAt: '2026-02-25T10:00:00.000Z'
            }
          ],
          total: 1,
          limit: 20,
          offset: 0
        }
      }
    })
  })

  await page.route(`**/api/xpert/xpert-task/${taskId}`, async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: taskId,
          xpertId: modelId,
          name: 'Runtime Overlay Task',
          prompt: 'overlay status',
          status: 'scheduled',
          options: {
            runtimeStatus: 'failed',
            progress: 0,
            retryCount: 0,
            sourceType: 'chat',
            traceKey,
            conversationId
          }
        }
      }
    })
  })

  await page.goto('/chat')
  await page.getByTestId('ask-input').fill('触发runtime任务状态')
  await page.getByTestId('ask-submit').click()
  await expect(page.getByTestId('ask-runtime-execution-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-progress')).toContainText('100%', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-terminal-state')).toContainText('success', { timeout: 30_000 })
  await expect(page.getByTestId('ask-runtime-analysis-link')).toHaveAttribute(
    'href',
    `/chat?queryLogId=${queryLogId}#analysis`
  )
  await expect(page.getByTestId('ask-runtime-trace-link')).toHaveAttribute('href', `/ops/traces/${traceKey}`)

  await page.locator('.chat-assistant-task-link').click()
  await expect(page).toHaveURL(/\/chat\/tasks/)
  await expect(page.getByTestId(`chat-task-status-${taskId}`)).toContainText('succeeded', { timeout: 30_000 })
  await expect(page.getByTestId(`chat-task-runtime-updated-${taskId}`)).toBeVisible({ timeout: 30_000 })

  await page.getByTestId(`chat-task-open-${taskId}`).click()
  await expect(page.getByTestId('chat-task-detail-status')).toContainText('succeeded', { timeout: 30_000 })
  await expect(page.getByTestId('chat-task-detail-runtime-updated')).toBeVisible({ timeout: 30_000 })
})

test('chat tasks page renders retryable error state', async ({ page }) => {
  const modelId = `model-error-${Date.now()}`

  await mockCapabilities(page)
  await mockSemanticModels(page, modelId)

  await page.route('**/api/xpert/xpert-task/my?**', async route => {
    await route.fulfill({
      status: 500,
      json: {
        message: 'task domain failure'
      }
    })
  })

  await page.goto('/chat/tasks')
  await expect(page.getByText('Retryable Error')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('task domain failure')).toBeVisible({ timeout: 20_000 })
})

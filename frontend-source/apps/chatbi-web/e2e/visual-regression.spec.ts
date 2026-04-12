import { test } from '@playwright/test'
import { createSemanticModelFixture, pickModelFixture } from './helpers/api-fixture'

async function selectModelIfAvailable(input: { page: Parameters<typeof test>[0]['page']; testId: string; modelId: string }) {
  const select = input.page.getByTestId(input.testId)
  await test.expect(select).toBeVisible()

  const optionValue = await select.evaluate((element, modelId) => {
    const options = Array.from((element as HTMLSelectElement).options)
    return options.some(option => option.value === modelId) ? modelId : options[0]?.value ?? null
  }, input.modelId)

  if (optionValue) {
    await select.selectOption(optionValue)
  }
}

async function mockNexusCapabilities(page: import('@playwright/test').Page) {
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

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: payload })
  })
}

async function mockChatWorkspaceVisualApis(page: import('@playwright/test').Page) {
  await page.route('**/api/pa/conversations/search', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'conv-visual-1',
              title: 'Revenue diagnostics',
              updatedAt: '2026-02-23T10:00:00.000Z',
              options: { parameters: { modelId: 'model-visual' } },
              messages: [{}, {}]
            },
            {
              id: 'conv-visual-2',
              title: 'Monthly growth by region',
              updatedAt: '2026-02-23T10:05:00.000Z',
              options: { parameters: { modelId: 'model-visual' } },
              messages: [{}, {}, {}]
            }
          ],
          total: 2
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/my?*', async route => {
    const requestUrl = new URL(route.request().url())
    const rawData = requestUrl.searchParams.get('data')
    let conversationId = ''

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData) as { where?: { conversationId?: string } }
        conversationId = parsed.where?.conversationId ?? ''
      } catch {
        conversationId = ''
      }
    }

    if (conversationId !== 'conv-visual-1' && conversationId !== 'conv-stream-visual') {
      await route.fulfill({
        json: {
          apiVersion: 'v1',
          data: { items: [], total: 0 }
        }
      })
      return
    }

    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'msg-visual-user',
              role: 'user',
              status: 'success',
              content: [{ text: '去年每个月销售额走势' }],
              createdAt: '2026-02-23T10:00:30.000Z'
            },
            {
              id: 'msg-visual-assistant',
              role: 'assistant',
              status: 'success',
              content: [{ text: '这是流式返回内容。' }],
              createdAt: '2026-02-23T10:01:00.000Z'
            }
          ],
          total: 2
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback/my?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: []
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message/*/suggested-questions', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: ['继续按区域拆分', '给出环比结论']
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback', async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'feedback-visual-1',
          conversationId: 'conv-stream-visual',
          messageId: 'msg-stream-visual',
          rating: 'LIKE'
        }
      }
    })
  })

  await page.route('**/api/xpert/chat-message-feedback/*', async route => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback()
      return
    }
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          deleted: true
        }
      }
    })
  })

  await page.route('**/api/xpert/chat', async route => {
    const events = [
      {
        type: 'event',
        event: 'on_conversation_start',
        data: { id: 'conv-stream-visual' }
      },
      {
        type: 'event',
        event: 'on_message_start',
        data: { id: 'msg-stream-visual' }
      },
      {
        type: 'message',
        data: { text: '这是流式返回内容。' }
      },
      {
        type: 'event',
        event: 'on_message_end',
        data: {
          id: 'msg-stream-visual',
          status: 'success',
          answer: {
            components: [
              {
                type: 'kpi',
                payload: {
                  label: '月销售额',
                  formatted: '128 万',
                  delta: '+12.4%'
                }
              },
              {
                type: 'table',
                payload: {
                  columns: ['月份', '销售额'],
                  rows: [
                    { 月份: '2025-01', 销售额: '98 万' },
                    { 月份: '2025-02', 销售额: '103 万' },
                    { 月份: '2025-03', 销售额: '109 万' }
                  ]
                }
              }
            ]
          },
          result: {
            rowCount: 12,
            preview: [{ formatted: '128 万' }]
          }
        }
      },
      {
        type: 'event',
        event: 'on_conversation_end',
        data: {
          id: 'conv-stream-visual',
          messages: [{ id: 'msg-stream-visual', role: 'assistant' }]
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

async function mockAiGovernanceVisualApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/ai/providers*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'provider-visual-1', code: 'finance-llm', name: 'Finance LLM' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/providers/*/rotation-runs*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'rotation-run-1', status: 'succeeded', createdAt: '2026-04-06T10:00:00.000Z' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/providers/*/rotation-events*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'rotation-event-1', eventType: 'credential_rotated', createdAt: '2026-04-06T10:05:00.000Z' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/quotas', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'quota-visual-1', task: 'nl2plan_llm', dailyLimit: 1000, status: 'active' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/quotas/usage', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'usage-visual-1', task: 'nl2plan_llm', windowHour: 24, used: 342 }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/policy-templates', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'policy-template-1', name: 'Standard Rotation', code: 'standard_rotation' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/overview*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          providers: { total: 2, active: 2, disabled: 0 },
          models: { total: 5, active: 5, disabled: 0 },
          bindings: { total: 4, healthyCount: 4, unhealthyCount: 0 },
          rotation: { totalRuns: 12, failedRuns: 1, failureRate: 0.08 },
          quota: { requestCount: 120, successCount: 118, errorCount: 2, errorRate: 0.02, tokenCount: 5000 },
          alerts: { open: 1 }
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/crypto/providers', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: [
          {
            adapterId: 'aws-kms',
            provider: 'aws-kms',
            configured: true,
            liveReady: true,
            lastValidationAt: '2026-04-06T10:30:00.000Z',
            lastErrorCode: null
          }
        ]
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/crypto/validations*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'crypto-validation-1',
              provider: 'aws-kms',
              mode: 'live',
              success: true,
              requestId: 'req-visual-1',
              createdAt: '2026-04-06T10:35:00.000Z'
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ai/governance/crypto/policy', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          policyMode: 'compat',
          allowMock: true,
          requireProviderValidation: false,
          validationTtlHours: 24
        }
      }
    })
  })
}

async function mockOpsReportsVisualApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/ops/reports/consumption/table*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ groupKey: 'tenant-alpha', deliveries: 128, success: 123, failed: 5, dlq: 1 }],
          total: 1,
          summary: {
            subscriptionCount: 24,
            deliveries: 128,
            failed: 5,
            dlq: 1,
            audits: 17
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/indicator-webhooks/governance/reports/consumption*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          windowHours: 720,
          items: [{ groupKey: 'tenant-alpha', deliveries: 128, failed: 5 }]
        }
      }
    })
  })

  await page.route('**/api/xpert/ask-review/cases/*/summary*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          totalCases: 8,
          pendingDecisionCases: 2,
          slaBreachedCases: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ask-certifications/lanes/*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          status: 'blocked',
          blockers: ['review_backlog'],
          metrics: {
            reviewState: 'backlog',
            certificationBlockerClass: 'review_backlog'
          }
        }
      }
    })
  })

  await page.route('**/api/xpert/ops/alerts/events*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [{ id: 'alert-event-1', metricCode: 'ask_quality_guard' }],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/ops/alerts/events/*/dispatch-logs*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'dispatch-log-1',
              channel: 'email',
              status: 'failed',
              createdAt: '2026-04-06T11:00:00.000Z',
              traceKey: 'trace-visual-1',
              errorMessage: 'SMTP timeout'
            }
          ],
          total: 1
        }
      }
    })
  })
}

async function mockDataModelReleaseVisualApis(page: import('@playwright/test').Page) {
  await mockNexusCapabilities(page)

  await page.route('**/api/xpert/source-model-drafts/*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'draft-visual-1',
          name: 'Sales Release Draft',
          draftVersion: 4,
          latestIntrospection: { tables: 2, relations: 1, inferredAt: '2026-04-06T09:00:00.000Z' },
          tables: [
            { id: 'fact-sales', sourcePath: 'public.fact_sales', role: 'fact' },
            { id: 'dim-product', sourcePath: 'public.dim_product', role: 'dimension' }
          ],
          relations: [{ fromTableId: 'fact-sales', toTableId: 'dim-product', joinType: 'left' }]
        }
      }
    })
  })

  await page.route('**/api/xpert/semantic-model/model-visual-1', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'model-visual-1',
          name: 'Sales Semantic Draft',
          cube: 'Sales'
        }
      }
    })
  })

  await page.route('**/api/xpert/pa-deployments/deployment-visual-1', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'deployment-visual-1',
          semanticModelId: 'model-visual-1',
          status: 'draft',
          targetCube: 'Sales'
        }
      }
    })
  })

  await page.route('**/api/xpert/pa-deployments/deployment-visual-1/load-jobs', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'load-job-visual-1',
              mode: 'incremental',
              status: 'failed',
              retryCount: 2,
              reconciliation: { status: 'failed' }
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/pa-deployments/deployment-visual-1/refresh-policies', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          deploymentId: 'deployment-visual-1',
          mode: 'scheduled',
          cadence: '0 */2 * * *',
          incrementalKey: 'updated_at',
          watermark: { maxValue: '2026-04-06T12:00:00.000Z' }
        }
      }
    })
  })

  await page.route('**/api/xpert/pa-deployments/deployment-visual-1/refresh-runs', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: [
            {
              id: 'refresh-run-visual-1',
              mode: 'incremental',
              status: 'failed',
              reconciliation: { status: 'failed' },
              watermarkAfter: { maxValue: '2026-04-06T12:00:00.000Z' }
            }
          ],
          total: 1
        }
      }
    })
  })

  await page.route('**/api/xpert/pa-deployments/deployment-visual-1/release', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          deploymentId: 'deployment-visual-1',
          status: 'blocked',
          blockers: ['freshness_budget_exceeded'],
          freshness: { lagMinutes: 120, budgetMinutes: 60 },
          sourceReconciliation: {
            scope: 'refresh_run',
            status: 'failed'
          }
        }
      }
    })
  })
}

test('home visual baseline', async ({ page }) => {
  await page.goto('/')
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('home.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('login visual baseline', async ({ page }) => {
  await page.goto('/login')
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('login.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('semantic studio graph v2 visual baseline', async ({ page }) => {
  const model = await createSemanticModelFixture()
  await page.goto(`/semantic-studio/${model.id}?graphV2=1`)
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page.getByTestId('semantic-graph-canvas')).toBeVisible({ timeout: 30_000 })
  await test.expect(page.getByTestId('semantic-graph-canvas')).toHaveScreenshot('semantic-studio-graph-v2.png', {
    maxDiffPixelRatio: 0.005
  })
})

test('chat analysis visual baseline', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto(`/chat?modelId=${encodeURIComponent(model.id)}&analysisV2=1`)
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page.getByRole('main')).toHaveScreenshot('ask-analysis.png', {
    maxDiffPixelRatio: 0.005
  })
})

test('governance worklist visual baseline', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto('/governance?hub=1')
  await selectModelIfAvailable({ page, testId: 'governance-overview-model', modelId: model.id })
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('governance-worklist.png', {
    maxDiffPixelRatio: 0.005
  })
})

test('indicator ops visual baseline', async ({ page }) => {
  const model = await pickModelFixture({ requireQuerySuccess: true })
  await page.goto('/indicator-app')
  await selectModelIfAvailable({ page, testId: 'indicator-ops-model-select', modelId: model.id })
  await page.setViewportSize({ width: 1440, height: 900 })
  const headerCard = page.getByTestId('indicator-ops-model-select').locator('xpath=ancestor::header[1]')
  await test.expect(headerCard).toHaveScreenshot('indicator-ops.png', {
    maxDiffPixelRatio: 0.005,
    mask: [
      page.getByTestId('indicator-ops-model-select'),
      page.getByTestId('indicator-ops-status'),
      page.getByTestId('indicator-ops-ready')
    ]
  })
})

test('ai governance page visual baseline', async ({ page }) => {
  await mockAiGovernanceVisualApis(page)

  await page.goto('/ai/governance')
  await page.setViewportSize({ width: 1440, height: 1200 })
  await test.expect(page.getByTestId('ai-governance-overview-table')).toBeVisible()
  await test.expect(page).toHaveScreenshot('ai-governance-page.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('ops reports page visual baseline', async ({ page }) => {
  await mockOpsReportsVisualApis(page)

  await page.goto('/ops/reports')
  await page.setViewportSize({ width: 1440, height: 1200 })
  await test.expect(page.getByTestId('ops-reports-table')).toBeVisible()
  await test.expect(page).toHaveScreenshot('ops-reports-page.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('data model release page visual baseline', async ({ page }) => {
  await mockDataModelReleaseVisualApis(page)

  await page.goto('/data-model-release?dataSourceId=source-visual-1&draftId=draft-visual-1&modelId=model-visual-1&deploymentId=deployment-visual-1')
  await page.setViewportSize({ width: 1440, height: 1400 })
  await test.expect(page.getByTestId('data-model-release-page')).toBeVisible()
  await test.expect(page).toHaveScreenshot('data-model-release-page.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus chat workspace visual baseline', async ({ page }) => {
  await mockNexusCapabilities(page)
  await mockChatWorkspaceVisualApis(page)

  await page.goto('/chat')
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('pa-nexus-chat.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus chat workspace midstate visual baseline', async ({ page }) => {
  await mockNexusCapabilities(page)
  await mockChatWorkspaceVisualApis(page)

  await page.goto('/chat')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('ask-conversation-item-conv-visual-1').click()
  await page.getByTestId('ask-input').fill('去年每个月销售额走势')
  await page.getByTestId('ask-submit').click()

  await test.expect(page.getByTestId('ask-events-count')).toContainText(/(Events|事件)\s*[:：]\s*[1-9]/i, { timeout: 30_000 })
  await test.expect(page.getByTestId('ask-feedback-like')).toBeVisible({ timeout: 30_000 })
  await test.expect(page.getByTestId('ask-suggested-questions')).toBeVisible({ timeout: 30_000 })

  await test.expect(page).toHaveScreenshot('pa-nexus-chat-midstate.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus settings shell visual baseline', async ({ page }) => {
  await mockNexusCapabilities(page)

  await page.goto('/settings')
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('pa-nexus-settings.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus xpert workspace visual baseline', async ({ page }) => {
  await mockNexusCapabilities(page)

  await page.goto('/xpert/w')
  await page.setViewportSize({ width: 1440, height: 900 })
  await test.expect(page).toHaveScreenshot('pa-nexus-xpert-workspace.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus chat shell v2 region baseline', async ({ page }) => {
  await mockNexusCapabilities(page)
  await mockChatWorkspaceVisualApis(page)

  await page.goto('/chat')
  await page.setViewportSize({ width: 1440, height: 900 })

  await test.expect(page.locator('.chat-assistant-shell-v2')).toHaveScreenshot('pa-nexus-chat-shell-v2-region.png', {
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus settings shell v2 header baseline', async ({ page }) => {
  await mockNexusCapabilities(page)

  await page.goto('/settings')
  await page.setViewportSize({ width: 1440, height: 900 })

  await test.expect(page.getByTestId('settings-shell-header')).toHaveScreenshot('pa-nexus-settings-shell-v2-header.png', {
    maxDiffPixelRatio: 0.005
  })
})

test('pa nexus xpert shell v2 header baseline', async ({ page }) => {
  await mockNexusCapabilities(page)

  await page.goto('/xpert/w')
  await page.setViewportSize({ width: 1440, height: 900 })

  await test.expect(page.getByTestId('xpert-workspace-header')).toHaveScreenshot('pa-nexus-xpert-shell-v2-header.png', {
    maxDiffPixelRatio: 0.005
  })
})

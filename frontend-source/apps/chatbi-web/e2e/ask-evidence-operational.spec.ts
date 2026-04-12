import { expect, test, type Page } from '@playwright/test'

function buildEvidencePayload() {
  return {
    columns: ['Month', 'Revenue'],
    rows: [
      { Month: '2026-01', Revenue: 1200 },
      { Month: '2026-02', Revenue: 1285 }
    ],
    queryLogId: 'query-log-evidence-1',
    traceKey: 'trace-evidence-1',
    analysisHandoff: {
      queryLogId: 'query-log-evidence-1',
      traceKey: 'trace-evidence-1',
      modelId: 'model-evidence-1',
      cube: 'Finance',
      metricCodes: ['Revenue'],
      dimensionCodes: ['Month'],
      analysisShape: 'trend',
      preferredShape: 'table',
      appliedFilters: [{ dimension: 'Region', members: ['East'] }]
    },
    interaction: {
      availableViews: ['table', 'chart'],
      defaultView: 'table',
      explain: {
        enabled: true,
        warnings: ['latest year incomplete'],
        queryLogId: 'query-log-evidence-1',
        traceKey: 'trace-evidence-1',
        refs: [
          {
            kind: 'query_reference',
            label: 'Revenue result set',
            queryLogId: 'query-log-evidence-1',
            traceKey: 'trace-evidence-1',
            warningCount: 1
          }
        ]
      },
      fullscreen: {
        enabled: true,
        title: 'Revenue trend'
      },
      story: {
        enabled: true,
        widgetType: 'table',
        title: 'Revenue trend'
      }
    }
  }
}

function buildEvidenceSseBody() {
  const payload = buildEvidencePayload()
  const events = [
    {
      type: 'event',
      event: 'on_conversation_start',
      data: { id: 'conv-evidence-1' }
    },
    {
      type: 'event',
      event: 'on_message_start',
      data: { id: 'msg-evidence-1' }
    },
    {
      type: 'message',
      data: {
        id: 'msg-evidence-1',
        type: 'text',
        text: 'Revenue evidence answer'
      }
    },
    {
      type: 'event',
      event: 'on_message_end',
      data: {
        id: 'msg-evidence-1',
        status: 'success',
        meta: {
          queryLogId: 'query-log-evidence-1',
          traceKey: 'trace-evidence-1'
        },
        answer: {
          text: 'Revenue evidence answer',
          components: [
            {
              type: 'table',
              payload
            }
          ]
        },
        result: {
          rowCount: 2,
          preview: payload.rows
        }
      }
    },
    {
      type: 'event',
      event: 'on_conversation_end',
      data: {
        id: 'conv-evidence-1',
        messages: [{ id: 'msg-evidence-1', role: 'assistant' }]
      }
    }
  ]

  return events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
}

async function mockEvidenceChatApis(page: Page) {
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'evidence-user',
      scopes: {
        read: ['allow:model:*', 'allow:cube:*', 'allow:indicator:*', 'allow:dimension:*'],
        write: ['allow:write:model:*'],
        denyRead: [],
        denyWrite: []
      }
    }
  }

  await page.route('**/api/pa/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })
  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({ json: capabilityPayload })
  })
  await page.route('**/api/pa/conversations/search', async route => {
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
          items: ['补充解释', '打开追踪']
        }
      }
    })
  })
  await page.route('**/api/xpert/ops/traces/**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          traceKey: 'trace-evidence-1'
        }
      }
    })
  })
  await page.route('**/api/xpert/chat', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildEvidenceSseBody()
    })
  })
}

test('ask evidence panel renders xpert operational sections', async ({ page }) => {
  await mockEvidenceChatApis(page)

  await page.goto('/chat')
  await page.getByTestId('ask-input').fill('上月收入趋势')
  await page.getByTestId('ask-submit').click()

  await expect(page.getByTestId('ask-events-count')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-turns-list')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-feedback-like')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-trace-link')).toHaveAttribute('href', /\/ops\/traces\/trace-evidence-1$/)

  await page.getByTestId('answer-surface-explain').click()

  await expect(page.getByTestId('answer-evidence-drawer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-evidence-query-log-id')).toContainText('query-log-evidence-1')
  await expect(page.getByTestId('answer-evidence-trace-key')).toContainText('trace-evidence-1')
  await expect(page.getByTestId('answer-evidence-warning-0')).toContainText('latest year incomplete')
  await expect(page.getByTestId('answer-evidence-ref-0')).toContainText('Revenue result set')
  await expect(page.getByTestId('answer-evidence-open-analysis')).toHaveAttribute('href', /queryLogId=query-log-evidence-1/)
  await expect(page.getByTestId('answer-evidence-open-trace')).toHaveAttribute('href', /\/ops\/traces\/trace-evidence-1$/)
})

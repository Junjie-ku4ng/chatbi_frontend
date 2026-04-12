import { expect, test, type Page } from '@playwright/test'

function buildParityPayload() {
  return {
    columns: ['Month', 'Revenue'],
    rows: [
      { Month: '2026-01', Revenue: 1200 },
      { Month: '2026-02', Revenue: 1285 }
    ],
    option: {
      xAxis: { type: 'category', data: ['2026-01', '2026-02'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [1200, 1285] }]
    },
    queryLogId: 'query-log-parity-1',
    traceKey: 'trace-parity-1',
    analysisHandoff: {
      queryLogId: 'query-log-parity-1',
      traceKey: 'trace-parity-1',
      modelId: 'model-parity-1',
      cube: 'Finance',
      metricCodes: ['Revenue'],
      dimensionCodes: ['Month'],
      analysisShape: 'trend',
      preferredShape: 'chart',
      appliedFilters: [{ dimension: 'Region', members: ['East'] }]
    },
    interaction: {
      availableViews: ['table', 'chart'],
      defaultView: 'table',
      sort: {
        enabled: true,
        metrics: ['Revenue'],
        current: { by: 'Revenue', dir: 'DESC' }
      },
      ranking: {
        enabled: true,
        currentLimit: 10,
        presets: [5, 10, 20]
      },
      slicers: {
        enabled: true,
        dimensions: ['Region', 'Channel'],
        applied: [{ dimension: 'Region', members: ['East'] }]
      },
      explain: {
        enabled: true,
        warnings: ['latest year incomplete'],
        queryLogId: 'query-log-parity-1',
        traceKey: 'trace-parity-1',
        refs: [
          {
            kind: 'query_reference',
            label: 'Revenue result set',
            queryLogId: 'query-log-parity-1',
            traceKey: 'trace-parity-1',
            warningCount: 1
          }
        ]
      },
      story: {
        enabled: true,
        widgetType: 'table',
        title: 'Revenue trend'
      },
      fullscreen: {
        enabled: true,
        title: 'Revenue trend'
      }
    }
  }
}

function buildChatSseBody() {
  const payload = buildParityPayload()
  const events = [
    {
      type: 'event',
      event: 'on_conversation_start',
      data: { id: 'conv-parity-1' }
    },
    {
      type: 'event',
      event: 'on_message_start',
      data: { id: 'msg-parity-1' }
    },
    {
      type: 'message',
      data: {
        id: 'msg-parity-1',
        type: 'text',
        text: 'Revenue trend answer'
      }
    },
    {
      type: 'event',
      event: 'on_message_end',
      data: {
        id: 'msg-parity-1',
        status: 'success',
        answer: {
          text: 'Revenue trend answer',
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
        id: 'conv-parity-1',
        messages: [{ id: 'msg-parity-1', role: 'assistant' }]
      }
    }
  ]

  return events.map(item => `data: ${JSON.stringify(item)}`).join('\n\n')
}

async function mockParityChatApis(page: Page) {
  const captured = {
    createStoryBody: null as Record<string, unknown> | null,
    addWidgetBody: null as Record<string, unknown> | null
  }
  const capabilityPayload = {
    apiVersion: 'v1',
    data: {
      authType: 'dev',
      userId: 'parity-user',
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
          items: ['按区域拆分', '补充解释']
        }
      }
    })
  })
  await page.route('**/api/xpert/story-point/**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          id: 'story-parity-1'
        }
      }
    })
  })
  await page.route('**/api/xpert/story-widget/**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          items: []
        }
      }
    })
  })
  await page.route('**/api/xpert/stories', async route => {
    captured.createStoryBody = (route.request().postDataJSON() as Record<string, unknown>) ?? null
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          story: {
            id: 'story-parity-chat-1',
            modelId: 'model-parity-1',
            title: 'Revenue trend',
            status: 'draft',
            latestVersion: 1,
            items: []
          }
        }
      }
    })
  })
  await page.route('**/api/xpert/stories/*/widgets', async route => {
    captured.addWidgetBody = (route.request().postDataJSON() as Record<string, unknown>) ?? null
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          widget: {
            id: 'widget-parity-chat-1',
            storyId: 'story-parity-chat-1',
            widgetType: 'table',
            widgetKey: 'chat-answer-table',
            title: 'Revenue trend',
            payload: buildParityPayload(),
            layout: { x: 0, y: 0, w: 6, h: 4 },
            sortOrder: 0,
            status: 'active'
          }
        }
      }
    })
  })
  await page.route('**/api/xpert/ops/traces/**', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          traceKey: 'trace-parity-1'
        }
      }
    })
  })
  await page.route('**/api/xpert/chat', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildChatSseBody()
    })
  })

  return captured
}

test('chat answer surface exposes parity-grade result interactions without regenerating the answer', async ({ page }) => {
  const captured = await mockParityChatApis(page)

  await page.goto('/chat')
  await page.getByTestId('ask-input').fill('看 2026 年 Revenue 趋势')
  await page.getByTestId('ask-submit').click()

  await expect(page.getByTestId('ask-assistant-message')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-view-table')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-view-chart')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-open-analysis')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-sort')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-top')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-slicer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-explain')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-add-to-story')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-fullscreen')).toBeVisible({ timeout: 30_000 })

  const messageCountBefore = await page.getByTestId('ask-assistant-message').count()
  await page.getByTestId('answer-surface-view-chart').click()
  await expect(page.getByTestId('answer-surface-body-chart')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('ask-assistant-message')).toHaveCount(messageCountBefore)

  await page.getByTestId('answer-surface-sort').click()
  await expect(page.getByTestId('answer-sort-top-panel')).toBeVisible({ timeout: 30_000 })

  await page.getByTestId('answer-surface-slicer').click()
  await expect(page.getByTestId('answer-slicer-panel')).toBeVisible({ timeout: 30_000 })

  await page.getByTestId('answer-surface-explain').click()
  await expect(page.getByTestId('answer-evidence-drawer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-evidence-query-log-id')).toContainText('query-log-parity-1')
  await expect(page.getByTestId('answer-evidence-trace-key')).toContainText('trace-parity-1')
  await expect(page.getByTestId('answer-evidence-warning-0')).toContainText('latest year incomplete')
  await expect(page.getByTestId('answer-evidence-ref-0')).toContainText('Revenue result set')
  await expect(page.getByTestId('answer-evidence-ref-0')).toContainText('warningCount')
  await expect(page.getByTestId('answer-evidence-open-analysis')).toHaveAttribute('href', /queryLogId=query-log-parity-1/)
  await expect(page.getByTestId('answer-evidence-open-analysis')).toHaveAttribute('href', /traceKey=trace-parity-1/)
  await expect(page.getByTestId('answer-evidence-open-trace')).toHaveAttribute('href', /\/ops\/traces\/trace-parity-1$/)

  const openAnalysis = page.getByTestId('answer-surface-open-analysis')
  await expect(openAnalysis).toHaveAttribute('href', /queryLogId=query-log-parity-1/)
  await expect(openAnalysis).toHaveAttribute('href', /traceKey=trace-parity-1/)
  await expect(openAnalysis).toHaveAttribute('href', /analysisDraft=/)

  await page.getByTestId('answer-surface-add-to-story').click()
  await expect(page.getByTestId('answer-story-save-dialog')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-story-save-title')).toHaveValue('Revenue trend')
  await page.getByTestId('answer-story-save-submit').click()
  await expect(page.getByTestId('answer-story-save-status')).toContainText('Story saved', { timeout: 30_000 })
  await expect(page.getByTestId('answer-story-save-open-story')).toHaveAttribute('href', '/project/story-parity-chat-1/designer')
  expect(captured.createStoryBody).toMatchObject({
    modelId: 'model-parity-1',
    title: 'Revenue trend',
    traceKey: 'trace-parity-1'
  })
  expect(captured.addWidgetBody).toMatchObject({
    widgetType: 'table',
    title: 'Revenue trend',
    widgetKey: 'chat-answer-table'
  })

  await page.getByTestId('answer-surface-fullscreen').click()
  await expect(page.getByTestId('answer-surface-fullscreen-dialog')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('answer-surface-fullscreen-close').click()
  await expect(page.getByTestId('answer-surface-fullscreen-dialog')).toHaveCount(0)
})

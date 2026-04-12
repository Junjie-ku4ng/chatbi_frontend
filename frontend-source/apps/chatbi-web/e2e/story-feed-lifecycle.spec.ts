import { expect, test } from '@playwright/test'

function buildStoryWidgetPayload() {
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
    queryLogId: 'query-log-story-1',
    traceKey: 'trace-story-1',
    analysisHandoff: {
      queryLogId: 'query-log-story-1',
      traceKey: 'trace-story-1',
      modelId: 'model-story-1',
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
      explain: {
        enabled: true,
        warnings: ['latest year incomplete'],
        queryLogId: 'query-log-story-1',
        traceKey: 'trace-story-1',
        refs: [
          {
            kind: 'query_reference',
            label: 'Revenue result set',
            queryLogId: 'query-log-story-1',
            traceKey: 'trace-story-1',
            warningCount: 1
          }
        ]
      },
      fullscreen: {
        enabled: true,
        title: 'Revenue trend'
      }
    }
  }
}

test('saved story widgets reopen with the same answer surface fidelity', async ({ page }) => {
  const storyId = 'story-chat-answer-1'
  const widgetId = 'widget-chat-answer-1'
  const payload = buildStoryWidgetPayload()

  await page.route('**/api/xpert/auth/capabilities*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          authType: 'dev',
          userId: 'story-user',
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

  await page.route('**/api/xpert/stories/templates?*', async route => {
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

  await page.route('**/api/xpert/stories/story-chat-answer-1/designer/state?*', async route => {
    await route.fulfill({
      json: {
        apiVersion: 'v1',
        data: {
          story: {
            id: storyId,
            modelId: 'model-story-1',
            title: 'Revenue trend',
            status: 'draft',
            latestVersion: 1,
            items: []
          },
          canvas: {
            storyId,
            version: 1,
            canvas: {
              layout: { mode: 'grid', columns: 12, gap: 12 },
              theme: { name: 'default' }
            },
            metadata: {},
            widgets: []
          },
          widgets: [
            {
              id: widgetId,
              storyId,
              widgetType: 'table',
              widgetKey: 'chat-answer-table',
              title: 'Revenue trend',
              payload,
              layout: { x: 0, y: 0, w: 6, h: 4 },
              sortOrder: 0,
              status: 'active'
            }
          ],
          versions: {
            items: [],
            total: 0
          },
          shareLinks: {
            items: [],
            total: 0
          },
          templateMeta: {},
          capabilities: {
            canEdit: true
          }
        }
      }
    })
  })

  await page.goto(`/project/${storyId}/designer`)

  await expect(page.getByTestId(`story-designer-widget-card-${widgetId}`)).toContainText('Revenue trend', { timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-body-table')).toBeVisible({ timeout: 30_000 })

  await page.getByTestId('answer-surface-view-chart').click()
  await expect(page.getByTestId('answer-surface-body-chart')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-surface-open-analysis')).toHaveAttribute('href', /queryLogId=query-log-story-1/)

  await page.getByTestId('answer-surface-explain').click()
  await expect(page.getByTestId('answer-evidence-drawer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('answer-evidence-ref-0')).toContainText('Revenue result set')
  await expect(page.getByTestId('answer-evidence-open-trace')).toHaveAttribute('href', /\/ops\/traces\/trace-story-1$/)
})

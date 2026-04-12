import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = path.resolve(__dirname, '../../../../app/(workspace)/ops/reports/page.tsx')

function readPageSource() {
  return fs.readFileSync(pagePath, 'utf8')
}

describe('ops reports page ask hardening visibility contract', () => {
  it('declares ask review and certification operator test ids', () => {
    const source = readPageSource()

    expect(source).toContain('data-testid="ops-reports-filter-form"')
    expect(source).toContain('data-testid="ops-reports-window"')
    expect(source).toContain('data-testid="ops-reports-group-by"')
    expect(source).toContain('data-testid="ops-reports-refresh"')
    expect(source).toContain('data-testid="ops-reports-export-csv"')
    expect(source).toContain('testId="ops-reports-summary-strip"')
    expect(source).toContain('testId="ops-reports-table"')
    expect(source).toContain('data-testid="ops-reports-ask-lane"')
    expect(source).toContain('testId="ops-reports-ask-ops-strip"')
    expect(source).toContain('data-testid="ops-reports-certification-status"')
    expect(source).toContain('data-testid="ops-reports-certification-blockers"')
    expect(source).toContain('testId="ops-reports-ask-ops-json"')
  })

  it('renders ask hardening visibility before dispatch logs', () => {
    const source = readPageSource()

    const askStripIndex = source.indexOf('testId="ops-reports-ask-ops-strip"')
    const dispatchLogsIndex = source.indexOf('<strong>投递日志</strong>')

    expect(askStripIndex).toBeGreaterThanOrEqual(0)
    expect(dispatchLogsIndex).toBeGreaterThanOrEqual(0)
    expect(askStripIndex).toBeLessThan(dispatchLogsIndex)
  })

  it('freezes dispatch-log controls and detail drawer anchors for operator cleanup', () => {
    const source = readPageSource()

    expect(source).toContain('data-testid="ops-reports-event-select"')
    expect(source).toContain('data-testid="ops-reports-dispatch-status"')
    expect(source).toContain('data-testid="ops-reports-dispatch-channel"')
    expect(source).toContain('data-testid="ops-reports-dispatch-page"')
    expect(source).toContain('testId="ops-reports-detail-drawer"')
    expect(source).toContain('testId="ops-reports-legacy-json"')
  })

  it('requires accessible names on operator filter controls and dispatch selectors', () => {
    const source = readPageSource()

    expect(source).toContain('data-testid="ops-reports-window"')
    expect(source).toContain('aria-label="Ops reports window"')
    expect(source).toContain('data-testid="ops-reports-group-by"')
    expect(source).toContain('aria-label="Ops reports group by"')
    expect(source).toContain('data-testid="ops-reports-event-select"')
    expect(source).toContain('aria-label="Dispatch alert event"')
    expect(source).toContain('data-testid="ops-reports-dispatch-status"')
    expect(source).toContain('aria-label="Dispatch status filter"')
    expect(source).toContain('data-testid="ops-reports-dispatch-channel"')
    expect(source).toContain('aria-label="Dispatch channel filter"')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = path.resolve(__dirname, '../../../../app/(workspace)/ai/governance/page.tsx')

function readPageSource() {
  return fs.readFileSync(pagePath, 'utf8')
}

describe('ai governance page operational layout contract', () => {
  it('declares operational summary/table/drawer test ids for overview and crypto sections', () => {
    const source = readPageSource()

    expect(source).toContain('data-testid="ai-governance-provider-select"')
    expect(source).toContain('data-testid="ai-governance-upsert-rotation-policy"')
    expect(source).toContain('data-testid="ai-governance-status"')
    expect(source).toContain('testId="ai-governance-overview-strip"')
    expect(source).toContain('testId="ai-governance-overview-table"')
    expect(source).toContain('data-testid="ai-governance-crypto-policy-form"')
    expect(source).toContain('testId="ai-governance-crypto-strip"')
    expect(source).toContain('testId="ai-governance-crypto-provider-table"')
    expect(source).toContain('testId="ai-governance-detail-drawer"')
    expect(source).toContain('testId="ai-governance-overview"')
  })

  it('places operational table before advanced JSON panel in overview section', () => {
    const source = readPageSource()

    const tableIndex = source.indexOf('testId="ai-governance-overview-table"')
    const advancedJsonIndex = source.indexOf('testId="ai-governance-overview"')

    expect(tableIndex).toBeGreaterThanOrEqual(0)
    expect(advancedJsonIndex).toBeGreaterThanOrEqual(0)
    expect(tableIndex).toBeLessThan(advancedJsonIndex)
  })

  it('uses specific loading labels across AI governance loadable sections', () => {
    const source = readPageSource()

    expect(source).toContain('loadingLabel="Loading AI governance overview..."')
    expect(source).toContain('loadingLabel="Loading crypto providers..."')
    expect(source).toContain('loadingLabel="Loading crypto validation history..."')
    expect(source).toContain('loadingLabel="Loading rotation runs..."')
    expect(source).toContain('loadingLabel="Loading rotation events..."')
    expect(source).toContain('loadingLabel="Loading quota policies..."')
    expect(source).toContain('loadingLabel="Loading quota usage..."')
    expect(source).toContain('loadingLabel="Loading AI policy templates..."')
  })

  it('freezes table-first operator surfaces after the action rows', () => {
    const source = readPageSource()

    expect(source).toContain('testId="ai-governance-rotation-runs-table"')
    expect(source).toContain('testId="ai-governance-rotation-events-table"')
    expect(source).toContain('testId="ai-governance-quota-table"')
    expect(source).toContain('testId="ai-governance-usage-table"')
    expect(source).toContain('testId="ai-governance-policy-template-table"')
    expect(source).toContain('data-testid="ai-governance-crypto-provider-validate"')
    expect(source).toContain('data-testid="ai-governance-quota-submit"')
  })

  it('requires accessible names on operator controls used in governance forms', () => {
    const source = readPageSource()

    expect(source).toContain('data-testid="ai-governance-provider-select"')
    expect(source).toContain('aria-label="AI governance provider"')
    expect(source).toContain('data-testid="ai-governance-crypto-policy-mode"')
    expect(source).toContain('aria-label="Crypto policy mode"')
    expect(source).toContain('data-testid="ai-governance-crypto-provider-select"')
    expect(source).toContain('aria-label="Crypto validation provider"')
    expect(source).toContain('data-testid="ai-governance-crypto-validate-mode"')
    expect(source).toContain('aria-label="Crypto validation mode"')
    expect(source).toContain('data-testid="ai-governance-quota-task"')
    expect(source).toContain('aria-label="Quota task"')
    expect(source).toContain('data-testid="ai-governance-quota-limit"')
    expect(source).toContain('aria-label="Daily quota limit"')
  })
})

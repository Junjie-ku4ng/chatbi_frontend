import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = path.resolve(__dirname, '../page.tsx')
const journeyStepperPath = path.resolve(__dirname, '../release-journey-stepper.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('data model release visual contract', () => {
  it('declares the release workbench hero and journey anchors', () => {
    const source = readSource(pagePath)
    const stepper = readSource(journeyStepperPath)

    expect(source).toContain('data-testid="data-model-release-page"')
    expect(source).toContain('testId="data-model-release-overview"')
    expect(source).toContain('title="Release Pipeline"')
    expect(source).toContain(
      'description="Drive source-model draft to semantic preview, semantic draft creation, PA deployment preview and ask readiness without leaving the canonical BI workspace."'
    )
    expect(stepper).toContain('data-testid="data-model-release-journey"')
    expect(stepper).toContain('data-testid={`data-model-release-journey-step-${step.key}`}')
  })

  it('freezes the primary workbench action row before layout cleanup lands', () => {
    const source = readSource(pagePath)

    expect(source).toContain('data-testid="data-model-release-introspect"')
    expect(source).toContain('data-testid="data-model-release-compile"')
    expect(source).toContain('data-testid="data-model-release-create-semantic-draft"')
    expect(source).toContain('data-testid="data-model-release-preview-indicator-candidates"')
    expect(source).toContain('data-testid="data-model-release-apply-indicator-candidates"')
    expect(source).toContain('data-testid="data-model-release-deployment-preview"')
    expect(source).toContain('data-testid="data-model-release-create-deployment"')
    expect(source).toContain('data-testid="data-model-release-create-load-job"')
    expect(source).toContain('data-testid="data-model-release-readiness"')
  })

  it('declares hero, stepper and review panels for cleanup-owned surfaces', () => {
    const source = readSource(pagePath)

    expect(source).toContain('data-testid={draftQuery.data ? `data-model-release-draft-row-${draftQuery.data.id}` : \'data-model-release-draft-row-loading\'}')
    expect(source).toContain('data-testid="data-model-release-source-modeling-panel"')
    expect(source).toContain('data-testid="data-model-release-introspection-panel"')
    expect(source).toContain('data-testid="data-model-release-compile-panel"')
    expect(source).toContain('data-testid="data-model-release-indicator-candidates-panel"')
    expect(source).toContain('data-testid="data-model-release-deployment-panel"')
    expect(source).toContain('data-testid="data-model-release-load-history-panel"')
    expect(source).toContain('data-testid="data-model-release-refresh-panel"')
    expect(source).toContain('data-testid="data-model-release-release-gate-panel"')
    expect(source).toContain('data-testid="data-model-release-load-panel"')
    expect(source).toContain('data-testid="data-model-release-reconciliation-panel"')
    expect(source).toContain('data-testid="data-model-release-readiness-panel"')
  })
})

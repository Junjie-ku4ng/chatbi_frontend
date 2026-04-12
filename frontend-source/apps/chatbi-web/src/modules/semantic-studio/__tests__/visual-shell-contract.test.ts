import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const detailPagePath = path.resolve(__dirname, '../../../../app/(workspace)/semantic-studio/[id]/page.tsx')
const syncPreviewPanelPath = path.resolve(__dirname, '../sync-preview-panel.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('semantic studio visual shell contract', () => {
  it('declares high-fidelity semantic hero anchors', () => {
    const source = readSource(detailPagePath)

    expect(source).toContain('className="card semantic-detail-hero semantic-detail-hero-v2"')
    expect(source).toContain('className="semantic-detail-hero-glow"')
    expect(source).toContain('className="semantic-detail-hero-gridline"')
    expect(source).toContain('className="semantic-detail-badge-row"')
    expect(source).toContain('className="semantic-detail-telemetry-strip"')
    expect(source).toContain('className="semantic-detail-toolbar-row"')
  })

  it('declares CSS blocks for semantic visual shell v2', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.semantic-detail-hero-v2')
    expect(css).toContain('.semantic-detail-hero-glow')
    expect(css).toContain('.semantic-detail-hero-gridline')
    expect(css).toContain('.semantic-detail-badge-row')
    expect(css).toContain('.semantic-detail-telemetry-strip')
    expect(css).toContain('.semantic-detail-toolbar-row')
    expect(css).toContain('.semantic-sync-card')
    expect(css).toContain('.semantic-sync-blockers')
    expect(css).toContain('.semantic-sync-table')
  })

  it('freezes sync preview bridge and readonly guidance anchors', () => {
    const source = readSource(syncPreviewPanelPath)

    expect(source).toContain('data-testid="semantic-sync-bridge-warning"')
    expect(source).toContain('data-testid="semantic-sync-bridge-link"')
    expect(source).toContain('data-testid="semantic-sync-preview-table"')
    expect(source).toContain('data-testid="semantic-sync-preview-refresh"')
    expect(source).toContain('data-testid="semantic-sync-run-manual"')
    expect(source).toContain('Hard-delete bridge runs stay blocked until an operator generates a matching delete confirmation token.')
  })
})

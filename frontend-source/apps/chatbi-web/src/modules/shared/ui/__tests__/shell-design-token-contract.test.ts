import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const globalsCssPath = path.resolve(__dirname, '../../../../../app/globals.css')
const primitivesPath = path.resolve(__dirname, '../primitives.tsx')
const statusChipPath = path.resolve(__dirname, '../../chips/status-chip.tsx')
const operationalTablePath = path.resolve(__dirname, '../../data-grid/operational-table.tsx')
const detailDrawerPath = path.resolve(__dirname, '../../panels/detail-drawer.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('shell design token contract', () => {
  it('declares shared shell tokens for cloud surfaces', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('--nx-shell-surface-border')
    expect(css).toContain('--nx-shell-surface-bg')
    expect(css).toContain('--nx-shell-inner-border')
    expect(css).toContain('--nx-shell-header-bg')
    expect(css).toContain('--nx-shell-stage-border')
    expect(css).toContain('--nx-shell-stage-bg')
    expect(css).toContain('--nx-shell-dock-border')
    expect(css).toContain('--nx-shell-dock-bg')
    expect(css).toContain('--nx-shell-header-glow')
    expect(css).toContain('--nx-shell-telemetry-strip')
    expect(css).toContain('--nx-shell-section-gap')
    expect(css).toContain('--nx-shell-panel-gap')
    expect(css).toContain('--nx-shell-table-cell-y')
    expect(css).toContain('--nx-shell-readonly-border')
    expect(css).toContain('--nx-shell-readonly-bg')
  })

  it('uses shared shell tokens in chat, settings and xpert v2 blocks', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.chat-assistant-shell-v2')
    expect(css).toContain('border-color: var(--nx-shell-surface-border);')
    expect(css).toContain('background: var(--nx-shell-surface-bg);')

    expect(css).toContain('.chat-assistant-stage-v2')
    expect(css).toContain('border-color: var(--nx-shell-stage-border);')
    expect(css).toContain('background: var(--nx-shell-stage-bg);')

    expect(css).toContain('.chat-assistant-dock-v2')
    expect(css).toContain('border-color: var(--nx-shell-dock-border);')
    expect(css).toContain('background: var(--nx-shell-dock-bg);')
    expect(css).toContain('.chat-assistant-telemetry-strip')
    expect(css).toContain('background: var(--nx-shell-telemetry-strip);')

    expect(css).toContain('.settings-shell-v2')
    expect(css).toContain('.settings-x-head-v2')
    expect(css).toContain('.settings-x-head-glow')
    expect(css).toContain('.settings-x-telemetry-strip')

    expect(css).toContain('.xpert-surface-v2')
    expect(css).toContain('.xpert-surface-head-v2')
    expect(css).toContain('.xpert-surface-head-glow')
    expect(css).toContain('.xpert-surface-telemetry')
    expect(css).toContain('.nx-shell-panel')
    expect(css).toContain('.nx-shell-section')
    expect(css).toContain('.nx-shell-meta-row')
    expect(css).toContain('.nx-shell-readonly-note')
    expect(css).toContain('.nx-status-chip')
    expect(css).toContain('.nx-detail-drawer')
    expect(css).toContain('.nx-detail-drawer-head')
    expect(css).toContain('.nx-detail-drawer-close')
  })

  it('routes shared primitives through explicit disabled and readonly affordance classes', () => {
    const source = readSource(primitivesPath)

    expect(source).toContain('is-disabled')
    expect(source).toContain('is-readonly')
  })

  it('uses the shared cleanup vocabulary in status chip, operational table and detail drawer', () => {
    const statusChip = readSource(statusChipPath)
    const operationalTable = readSource(operationalTablePath)
    const detailDrawer = readSource(detailDrawerPath)

    expect(statusChip).toContain('nx-status-chip')
    expect(operationalTable).toContain('nx-operational-table-wrap nx-shell-panel')
    expect(operationalTable).toContain('nx-operational-table-row')
    expect(detailDrawer).toContain('nx-detail-drawer')
    expect(detailDrawer).toContain('nx-detail-drawer-head')
    expect(detailDrawer).toContain('nx-detail-drawer-close')
    expect(detailDrawer).toContain('nx-detail-drawer-body')
  })
})

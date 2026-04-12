import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const shellPath = path.resolve(__dirname, '../canonical-shell.tsx')
const dashboardPagePath = path.resolve(__dirname, '../../../../app/(workspace)/dashboard/page.tsx')
const projectPagePath = path.resolve(__dirname, '../../../../app/(workspace)/project/page.tsx')
const indicatorAppPagePath = path.resolve(__dirname, '../../../../app/(workspace)/indicator-app/page.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('bi canonical visual contract', () => {
  it('declares upgraded shell visual anchors', () => {
    const source = readSource(shellPath)

    expect(source).toContain('bi-canonical-shell bi-canonical-shell-v2')
    expect(source).toContain('className="bi-canonical-hero-aurora"')
    expect(source).toContain('className="bi-canonical-hero-gridline"')
    expect(source).toContain('className="bi-canonical-hero-head"')
    expect(source).toContain('className="bi-canonical-hero-orbit"')
    expect(source).toContain('className="bi-canonical-hero-signal"')
  })

  it('declares per-page runtime frame anchors', () => {
    const dashboard = readSource(dashboardPagePath)
    const project = readSource(projectPagePath)
    const indicatorApp = readSource(indicatorAppPagePath)

    expect(dashboard).toContain('data-testid="bi-dashboard-runtime-frame"')
    expect(project).toContain('data-testid="bi-project-runtime-frame"')
    expect(indicatorApp).toContain('data-testid="bi-indicator-app-runtime-frame"')
    expect(indicatorApp).toContain('className="bi-canonical-runtime-grid"')
  })

  it('declares visual CSS blocks for high-fidelity canonical surfaces', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.bi-canonical-shell-v2')
    expect(css).toContain('.bi-canonical-hero-aurora')
    expect(css).toContain('.bi-canonical-hero-gridline')
    expect(css).toContain('.bi-canonical-hero-signal')
    expect(css).toContain('.bi-canonical-hero-orbit')
    expect(css).toContain('.bi-canonical-runtime-frame')
    expect(css).toContain('.bi-canonical-runtime-grid')
  })
})

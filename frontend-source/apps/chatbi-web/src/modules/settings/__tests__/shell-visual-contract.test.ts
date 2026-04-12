import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const settingsShellPath = path.resolve(__dirname, '../shell.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('settings visual shell contract', () => {
  it('declares stable shell anchors for settings layout zones', () => {
    const source = readSource(settingsShellPath)

    expect(source).toContain('settings-assistant-shell settings-x-shell settings-shell-v2')
    expect(source).toContain('settings-assistant-header settings-x-head settings-x-head-v2')
    expect(source).toContain('settings-x-head-glow')
    expect(source).toContain('settings-x-telemetry-strip')
    expect(source).toContain('data-testid="settings-shell-layout"')
    expect(source).toContain('data-testid="settings-shell-header"')
    expect(source).toContain('data-testid="settings-shell-body"')
  })

  it('declares assistant settings css blocks', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.settings-shell-v2')
    expect(css).toContain('.settings-x-head-v2')
    expect(css).toContain('.settings-x-head-glow')
    expect(css).toContain('.settings-x-telemetry-strip')
    expect(css).toContain('.settings-assistant-shell')
    expect(css).toContain('.settings-assistant-header')
    expect(css).toContain('.settings-assistant-nav')
    expect(css).toContain('.settings-x-nav-group')
    expect(css).toContain('.settings-x-nav-group-title')
    expect(css).toContain('.settings-x-nav-group-items')
    expect(css).toContain('.settings-x-head-meta')
    expect(css).toContain('.settings-x-head-links')
    expect(css).toContain('.settings-panel-head')
    expect(css).toContain('.settings-panel-body')
    expect(css).toContain('.settings-x-nav-item-link')
    expect(css).toContain('grid-template-rows: auto minmax(0, 1fr)')
  })

  it('declares grouped settings navigation anchors', () => {
    const source = readSource(settingsShellPath)

    expect(source).toContain('data-testid={`settings-nav-group-${group.id}`}')
    expect(source).toContain('settings-x-nav-group-title')
    expect(source).toContain('className="settings-panel-head"')
    expect(source).toContain('className="settings-panel-body"')
  })

  it('declares the shell search input as an active filter control', () => {
    const source = readSource(settingsShellPath)

    expect(source).toContain('data-testid="settings-search-launcher"')
    expect(source).toContain('placeholder="搜索设置..."')
    expect(source).toContain('value={settingsSearch}')
    expect(source).toContain('onChange={event => setSettingsSearch(event.target.value)}')
  })

  it('freezes header meta and grouped navigation rows for cleanup-only edits', () => {
    const source = readSource(settingsShellPath)

    expect(source).toContain('settings-x-head-meta nx-shell-meta-row')
    expect(source).toContain('settings-x-head-links nx-shell-meta-row')
    expect(source).toContain('settings-x-nav-group nx-shell-panel')
    expect(source).toContain('settings-panel-body nx-shell-panel')
    expect(source).toContain('settings-x-nav-item-link')
    expect(source).toContain('data-testid="settings-preview-notice" tone="neutral" className="nx-shell-readonly-note"')
  })
})

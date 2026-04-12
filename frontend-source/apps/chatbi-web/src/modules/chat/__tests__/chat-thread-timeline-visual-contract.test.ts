import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const diagnosticsDrawerPath = path.resolve(__dirname, '../components/thread/thread-diagnostics-drawer.tsx')
const analysisFollowupCardPath = path.resolve(__dirname, '../components/thread/thread-analysis-followup-card.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('chat thread timeline visual contract', () => {
  it('declares dedicated component class hooks for diagnostics and answer analysis attachments', () => {
    const drawer = readSource(diagnosticsDrawerPath)
    const analysisCard = readSource(analysisFollowupCardPath)

    expect(drawer).toContain('chat-thread-diagnostics-drawer')
    expect(drawer).toContain('chat-thread-diagnostics-title')
    expect(drawer).toContain('chat-thread-diagnostics-toggle')
    expect(drawer).toContain('chat-thread-diagnostics-collapsed')
    expect(analysisCard).toContain('chat-answer-analysis-card')
    expect(analysisCard).toContain('chat-answer-analysis-card-title')
    expect(analysisCard).toContain('chat-answer-analysis-card-meta')
    expect(analysisCard).toContain('chat-answer-analysis-card-body')
  })

  it('provides css blocks for diagnostics drawer and answer-attached analysis cards', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.chat-thread-diagnostics-drawer')
    expect(css).toContain('.chat-thread-diagnostics-head')
    expect(css).toContain('.chat-thread-diagnostics-toggle')
    expect(css).toContain('.chat-thread-diagnostics-collapsed')
    expect(css).toContain('.chat-answer-analysis-card')
    expect(css).toContain('.chat-answer-analysis-card-head')
    expect(css).toContain('.chat-answer-analysis-card-title')
    expect(css).toContain('.chat-answer-analysis-card-meta')
    expect(css).toContain('.chat-answer-analysis-card-body')
  })
})

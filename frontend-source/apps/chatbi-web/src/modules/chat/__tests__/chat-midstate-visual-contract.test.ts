import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const chatWorkspacePath = path.resolve(__dirname, '../pages/chat-workspace-page.tsx')
const messageRendererPath = path.resolve(__dirname, '../components/message-renderer.tsx')
const clarificationPath = path.resolve(__dirname, '../components/clarification-card.tsx')
const threadTimelinePath = path.resolve(__dirname, '../components/thread/thread-timeline-message.tsx')
const threadToolStepPath = path.resolve(__dirname, '../components/thread/thread-tool-step-card.tsx')
const threadPlanStepPath = path.resolve(__dirname, '../components/thread/thread-plan-step-card.tsx')
const answerSurfaceShellPath = path.resolve(__dirname, '../components/answer-components/answer-surface-shell.tsx')
const tableComponentPath = path.resolve(__dirname, '../components/answer-components/table-component.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('chat midstate visual contract', () => {
  it('declares explicit class anchors for runtime, suggestion and feedback zones', () => {
    const source = readSource(chatWorkspacePath)

    expect(source).toContain('className="chat-assistant-shell chat-assistant-shell-v2"')
    expect(source).toContain('className="chat-assistant-stage chat-assistant-stage-v2"')
    expect(source).toContain('className="chat-assistant-dock chat-assistant-dock-v2"')
    expect(source).toContain('className="chat-assistant-telemetry-strip"')
    expect(source).toContain('data-testid="ask-diagnostics-launcher"')
    expect(source).toContain('chat-assistant-suggested nx-shell-panel')
    expect(source).toContain('chat-assistant-feedback-panel nx-shell-panel')
    expect(source).toContain('chat-assistant-conversation-group')
    expect(source).toContain('chat-assistant-conversation-actions')
    expect(source).toContain('<ThreadDiagnosticsDrawer')
    expect(source).toContain('<ThreadAnalysisFollowupCard')
    expect(source).not.toContain('chat-assistant-runtime-row')
    expect(source).not.toContain('data-testid="ask-runtime-row"')
  })

  it('declares explicit class anchors for message running state and component cards', () => {
    const renderer = readSource(messageRendererPath)
    const clarification = readSource(clarificationPath)
    const threadTimeline = readSource(threadTimelinePath)
    const threadToolStep = readSource(threadToolStepPath)
    const threadPlanStep = readSource(threadPlanStepPath)
    const answerSurface = readSource(answerSurfaceShellPath)
    const tableComponent = readSource(tableComponentPath)

    expect(renderer).toContain('chat-assistant-message-text')
    expect(renderer).toContain('chat-assistant-running-badge')
    expect(renderer).toContain('chat-assistant-message-tone')
    expect(threadTimeline).toContain('chat-assistant-thread-timeline')
    expect(threadTimeline).toContain('data-thread-item-kind')
    expect(threadToolStep).toContain('chat-assistant-thread-step-card-tool')
    expect(threadPlanStep).toContain('chat-assistant-thread-step-card-plan')
    expect(clarification).toContain('chat-assistant-clarification-card')
    expect(answerSurface).toContain('chat-assistant-answer-surface nx-shell-panel')
    expect(answerSurface).toContain('chat-assistant-answer-surface-meta nx-shell-meta-row')
    expect(tableComponent).toContain('chat-assistant-answer-table-wrap nx-shell-panel')
    expect(tableComponent).toContain('chat-assistant-answer-table')
  })

  it('provides dedicated css blocks for new midstate classes', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.chat-assistant-shell-v2')
    expect(css).toContain('.chat-assistant-stage-v2')
    expect(css).toContain('.chat-assistant-dock-v2')
    expect(css).toContain('.chat-assistant-telemetry-strip')
    expect(css).toContain('.chat-assistant-message-focus')
    expect(css).toContain('.chat-assistant-feedback-panel')
    expect(css).toContain('.chat-assistant-clarification-card')
    expect(css).toContain('.chat-assistant-running-badge')
    expect(css).toContain('.chat-assistant-message-tone')
    expect(css).toContain('.chat-assistant-thread-timeline')
    expect(css).toContain('.chat-assistant-thread-step-card')
    expect(css).toContain('.chat-assistant-thread-step-card-tool')
    expect(css).toContain('.chat-assistant-thread-step-card-plan')
    expect(css).toContain('.chat-thread-diagnostics-drawer')
    expect(css).toContain('.chat-answer-analysis-card')
    expect(css).toContain('.chat-assistant-conversation-group')
    expect(css).toContain('.chat-assistant-answer-table-wrap')
    expect(css).toContain('.chat-assistant-answer-table')
  })
})

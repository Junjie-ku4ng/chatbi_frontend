import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const chatWorkspacePath = path.resolve(__dirname, '../pages/chat-workspace-page.tsx')
const runtimeExecutionPanelPath = path.resolve(__dirname, '../components/runtime-execution-panel.tsx')
const globalsCssPath = path.resolve(__dirname, '../../../../app/globals.css')
const analysisPanelPath = path.resolve(__dirname, '../analysis/analysis-panel.tsx')
const diagnosticsDrawerPath = path.resolve(__dirname, '../components/thread/thread-diagnostics-drawer.tsx')
const analysisFollowupCardPath = path.resolve(__dirname, '../components/thread/thread-analysis-followup-card.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('chat workspace assistant shell contract', () => {
  it('declares stable shell anchors for layout zones', () => {
    const source = readSource(chatWorkspacePath)
    const drawer = readSource(diagnosticsDrawerPath)
    const analysisCard = readSource(analysisFollowupCardPath)

    expect(source).toContain('data-testid="ask-chat-sidebar-panel"')
    expect(source).toContain('data-contract="ask.sidebar.panel"')
    expect(source).toContain('data-testid="ask-chat-main-header"')
    expect(source).toContain('data-contract="ask.header.main"')
    expect(source).toContain('data-testid="ask-chat-thread-stage"')
    expect(source).toContain('data-contract="ask.thread.stage"')
    expect(source).toContain('data-testid="ask-chat-composer-dock"')
    expect(source).toContain('data-contract="ask.composer.dock"')
    expect(drawer).toContain('data-testid="ask-thread-diagnostics-drawer"')
    expect(drawer).toContain('data-contract="ask.diagnostics.drawer"')
    expect(drawer).toContain('data-testid="ask-thread-diagnostics-toggle"')
    expect(analysisCard).toContain('data-testid="ask-answer-analysis-card"')
  })

  it('freezes header, history and runtime meta rows for narrow cleanup work', () => {
    const source = readSource(chatWorkspacePath)

    expect(source).toContain('data-testid="ask-conversation-search"')
    expect(source).toContain('chat-assistant-conversation-meta-row nx-shell-meta-row')
    expect(source).toContain('chat-assistant-conversation-actions nx-shell-meta-row')
    expect(source).toContain('chat-assistant-header-meta nx-shell-meta-row')
    expect(source).toContain('className="chat-assistant-header-search"')
    expect(source).toContain('className="chat-assistant-telemetry-strip"')
    expect(source).toContain('chat-assistant-header-controls nx-shell-meta-row')
    expect(source).toContain('data-testid="ask-diagnostics-launcher"')
    expect(source).not.toContain('data-testid="ask-runtime-row"')
    expect(source).not.toContain('data-testid="ask-turns-list"')
  })

  it('keeps runtime panel capability-only under native xpert cutover', () => {
    const workspace = readSource(chatWorkspacePath)
    const panel = readSource(runtimeExecutionPanelPath)

    expect(workspace).not.toContain('resumeConversation(')
    expect(workspace).not.toContain('controlConversationRuntime(')
    expect(workspace).not.toContain('data-testid="ask-resume-button"')
    expect(panel).toContain('data-testid="ask-runtime-control-unavailable"')
    expect(panel).toContain('data-testid="ask-runtime-control-interrupt"')
    expect(panel).toContain('data-testid="ask-runtime-control-resume"')
    expect(panel).toContain('data-testid="ask-runtime-control-cancel"')
    expect(panel).toContain('Action transport not connected in this surface.')
    expect(panel).toContain('No runtime actions are available for phase')
  })

  it('provides dedicated assistant-shell css blocks', () => {
    const css = readSource(globalsCssPath)

    expect(css).toContain('.chat-assistant-shell')
    expect(css).toContain('.chat-assistant-sidebar')
    expect(css).toContain('.chat-assistant-main')
    expect(css).toContain('.chat-assistant-stage-inner')
    expect(css).toContain('.chat-assistant-header-controls')
    expect(css).toContain('.chat-assistant-conversation-meta-row')
    expect(css).toContain('.chat-assistant-hero-eyebrow')
  })

  it('mounts analysis console and consumes query-log draft handoff from url state', () => {
    const workspace = readSource(chatWorkspacePath)
    const panel = readSource(analysisPanelPath)
    const analysisCard = readSource(analysisFollowupCardPath)

    expect(workspace).toContain('const fromQueryLogId = params.get(\'queryLogId\')')
    expect(workspace).toContain('const fromTraceKey = params.get(\'traceKey\')')
    expect(workspace).toContain('const fromAnalysisDraft = params.get(\'analysisDraft\')')
    expect(workspace).toContain('<AskAnalysisPanel')
    expect(workspace).toContain('queryLogId={analysisQueryLogId}')
    expect(workspace).toContain('initialDraft={analysisDraft}')
    expect(workspace).toContain('analysisFollowup: pendingAnalysisFollowup')
    expect(workspace).toContain('onAnalysisFollowupConsumed: () => {')
    expect(workspace).toContain('onQueueAnalysisFollowup={draft => {')
    expect(workspace).toContain('<ThreadAnalysisFollowupCard')
    expect(analysisCard).toContain('data-testid="ask-answer-analysis-card"')
    expect(workspace).not.toContain('{analysisQueryLogId ? (\n                <AnalysisConsoleSection')
    expect(panel).toContain('initialDraft?: {')
  })

  it('wires the header search input to the active conversation filter state', () => {
    const workspace = readSource(chatWorkspacePath)

    expect(workspace).toContain('data-testid="ask-search-launcher"')
    expect(workspace).toContain('placeholder="搜索..."')
    expect(workspace).toContain('value={conversationSearch}')
    expect(workspace).toContain('onChange={event => setConversationSearch(event.target.value)}')
  })
})

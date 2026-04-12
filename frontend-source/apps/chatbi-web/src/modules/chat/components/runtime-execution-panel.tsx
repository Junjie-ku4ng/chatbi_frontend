'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'
import { useChatRuntimeStore } from '../runtime/chat-runtime-store'
import {
  type RuntimeControlState,
  type RuntimeExecutionNode,
  type RuntimeMessageStep,
  type RuntimeTaskHints
} from '../runtime/chat-runtime-projection'

function toneByStatus(status: string | undefined): 'brand' | 'ok' | 'danger' | 'neutral' {
  const normalized = status?.toLowerCase()
  if (!normalized) {
    return 'neutral'
  }
  if (normalized === 'failed' || normalized === 'error' || normalized === 'cancelled') {
    return 'danger'
  }
  if (normalized === 'running' || normalized === 'succeeded' || normalized === 'success') {
    return 'ok'
  }
  return 'neutral'
}

function toneByNodeStatus(status: RuntimeExecutionNode['status']): 'brand' | 'ok' | 'danger' | 'neutral' {
  if (status === 'error') {
    return 'danger'
  }
  if (status === 'success') {
    return 'ok'
  }
  if (status === 'running') {
    return 'brand'
  }
  return 'neutral'
}

function toneByStepStatus(status: RuntimeMessageStep['status']): 'brand' | 'ok' | 'danger' | 'neutral' {
  return toneByStatus(status ?? undefined)
}

type RuntimeExecutionPanelProps = {
  conversationId?: string
  nodes: RuntimeExecutionNode[]
  runtimeControlState: RuntimeControlState
  taskRuntimeHints: RuntimeTaskHints
  runtimeControlActions?: {
    resume?: {
      onExecute?: () => void
      pending?: boolean
      error?: string | null
      disabledReason?: string | null
    }
    toolDecision?: {
      onConfirm?: () => void
      onReject?: () => void
      pending?: 'confirm' | 'reject' | null
      error?: string | null
      disabledReason?: string | null
    }
  }
}

export function RuntimeExecutionPanel({
  conversationId,
  nodes,
  runtimeControlState,
  taskRuntimeHints,
  runtimeControlActions
}: RuntimeExecutionPanelProps) {
  const messageStepsByMessageId = useChatRuntimeStore(state => state.messageStepsByMessageId)
  const messageGroups = useMemo(
    () =>
      Object.entries(messageStepsByMessageId)
        .map(([messageId, steps]) => ({
          key: messageId,
          messageId: messageId === '__default__' ? null : messageId,
          label: messageId === '__default__' ? 'message · current' : `message · ${messageId}`,
          steps: [...steps].sort((left, right) => left.runtimeEventId - right.runtimeEventId),
          latestRuntimeEventId: steps.reduce((max, step) => Math.max(max, step.runtimeEventId), 0)
        }))
        .sort((left, right) => left.latestRuntimeEventId - right.latestRuntimeEventId),
    [messageStepsByMessageId]
  )
  const resumeAction = runtimeControlActions?.resume
  const toolDecisionAction = runtimeControlActions?.toolDecision
  const resumeEnabled = Boolean(resumeAction?.onExecute) && !resumeAction?.pending && !resumeAction?.disabledReason
  const toolDecisionEnabled =
    Boolean(toolDecisionAction?.onConfirm) &&
    Boolean(toolDecisionAction?.onReject) &&
    !toolDecisionAction?.pending &&
    !toolDecisionAction?.disabledReason
  const unsupportedActions: string[] = []
  const hasSupportedActions = Boolean(resumeAction) || Boolean(toolDecisionAction)

  if (runtimeControlState.canInterrupt) {
    unsupportedActions.push('Interrupt')
  }
  if (runtimeControlState.canResume && !resumeAction && !toolDecisionAction) {
    unsupportedActions.push('Resume')
  }
  if (runtimeControlState.canCancel) {
    unsupportedActions.push('Cancel')
  }

  const actionStatus =
    unsupportedActions.length === 0
      ? null
      : !hasSupportedActions
        ? 'Action transport not connected in this surface.'
        : `${unsupportedActions.join('/')} transport not connected in this surface.`
  const hasRuntimeActions =
    runtimeControlState.canInterrupt || runtimeControlState.canResume || runtimeControlState.canCancel

  return (
    <NexusCard className="chat-assistant-panel chat-assistant-runtime-execution nx-shell-panel">
      <div className="chat-assistant-runtime-execution-head nx-shell-meta-row">
        <strong>执行面板</strong>
        <div className="chat-assistant-runtime-execution-badges">
          <NexusBadge tone="neutral">phase: {runtimeControlState.phase}</NexusBadge>
          <NexusBadge tone={toneByStatus(taskRuntimeHints.statusHint)}>task: {taskRuntimeHints.statusHint}</NexusBadge>
          {conversationId ? <NexusBadge tone="brand">conversation: {conversationId}</NexusBadge> : null}
        </div>
      </div>

      <div className="chat-assistant-runtime-execution-badges nx-shell-meta-row">
        {taskRuntimeHints.progressPercent !== null ? (
          <NexusBadge data-testid="ask-runtime-progress" tone="brand">
            progress: {taskRuntimeHints.progressPercent}%
          </NexusBadge>
        ) : null}
        {(taskRuntimeHints.statusHint === 'success' || taskRuntimeHints.statusHint === 'error') ? (
          <NexusBadge data-testid="ask-runtime-terminal-state" tone={toneByStatus(taskRuntimeHints.statusHint)}>
            terminal: {taskRuntimeHints.statusHint}
          </NexusBadge>
        ) : null}
        {taskRuntimeHints.queryLogId ? (
          <Link
            data-testid="ask-runtime-analysis-link"
            href={`/chat?queryLogId=${encodeURIComponent(taskRuntimeHints.queryLogId)}#analysis`}
          >
            <NexusBadge tone="neutral">Analysis</NexusBadge>
          </Link>
        ) : null}
        {taskRuntimeHints.traceKey ? (
          <Link
            data-testid="ask-runtime-trace-link"
            href={`/ops/traces/${encodeURIComponent(taskRuntimeHints.traceKey)}`}
          >
            <NexusBadge tone="neutral">Trace</NexusBadge>
          </Link>
        ) : null}
      </div>

      <div className="chat-assistant-runtime-execution-badges nx-shell-meta-row">
        {runtimeControlState.canInterrupt ? (
          <NexusButton data-testid="ask-runtime-control-interrupt" type="button" disabled>
            Interrupt
          </NexusButton>
        ) : null}
        {runtimeControlState.canResume ? (
          toolDecisionAction ? (
            <>
              <NexusButton
                data-testid="ask-runtime-control-confirm"
                type="button"
                disabled={!toolDecisionEnabled}
                onClick={() => {
                  if (toolDecisionEnabled) {
                    toolDecisionAction?.onConfirm?.()
                  }
                }}
              >
                {toolDecisionAction.pending === 'confirm' ? 'Confirming...' : 'Confirm'}
              </NexusButton>
              <NexusButton
                data-testid="ask-runtime-control-reject"
                type="button"
                disabled={!toolDecisionEnabled}
                onClick={() => {
                  if (toolDecisionEnabled) {
                    toolDecisionAction?.onReject?.()
                  }
                }}
              >
                {toolDecisionAction.pending === 'reject' ? 'Rejecting...' : 'Reject'}
              </NexusButton>
            </>
          ) : (
            <NexusButton
              data-testid="ask-runtime-control-resume"
              type="button"
              disabled={!resumeEnabled}
              onClick={() => {
                if (resumeEnabled) {
                  resumeAction?.onExecute?.()
                }
              }}
            >
              {resumeAction?.pending ? 'Resuming...' : 'Resume'}
            </NexusButton>
          )
        ) : null}
        {runtimeControlState.canCancel ? (
          <NexusButton data-testid="ask-runtime-control-cancel" type="button" disabled>
            Cancel
          </NexusButton>
        ) : null}
      </div>

      {actionStatus ? <NexusBadge tone="neutral">{actionStatus}</NexusBadge> : null}
      {!hasRuntimeActions ? (
        <NexusBadge data-testid="ask-runtime-control-unavailable" tone="neutral">
          No runtime actions are available for phase {runtimeControlState.phase}.
        </NexusBadge>
      ) : null}
      {resumeAction?.error ? <NexusBadge tone="danger">{resumeAction.error}</NexusBadge> : null}
      {toolDecisionAction?.error ? <NexusBadge tone="danger">{toolDecisionAction.error}</NexusBadge> : null}

      <div className="chat-assistant-runtime-node-list">
        {nodes.length === 0 ? <span className="chat-assistant-runtime-empty">No execution nodes yet.</span> : null}
        {nodes.map((node, index) => (
          <article
            key={node.key}
            data-testid={`ask-runtime-node-${index}`}
            className="chat-assistant-runtime-node-item"
          >
            <div className="chat-assistant-runtime-node-main">
              <strong>{node.label}</strong>
              <span className="chat-assistant-runtime-node-meta">
                {node.kind} · {node.id}
                {node.messageId ? ` · ${node.messageId}` : ''}
              </span>
            </div>
            <NexusBadge tone={toneByNodeStatus(node.status)}>{node.status}</NexusBadge>
          </article>
        ))}
      </div>

      {messageGroups.length > 0 ? (
        <div className="chat-assistant-runtime-node-list">
          {messageGroups.map((group, index) => (
            <section
              key={group.key}
              data-testid={`ask-runtime-message-group-${index}`}
              className="chat-assistant-runtime-node-item"
            >
              <div className="chat-assistant-runtime-node-main">
                <strong>{group.label}</strong>
                <span className="chat-assistant-runtime-node-meta">
                  {group.messageId ?? 'current'} · {group.steps.length} steps
                </span>
              </div>
              <div className="chat-assistant-runtime-node-list">
                {group.steps.map(step => (
                  <article key={step.id} className="chat-assistant-runtime-node-item">
                    <div className="chat-assistant-runtime-node-main">
                      <strong>{step.title ?? step.kind}</strong>
                      <span className="chat-assistant-runtime-node-meta">
                        {step.kind}
                        {step.sourceEvent ? ` · ${step.sourceEvent}` : ''}
                        {step.queryLogId ? ` · ${step.queryLogId}` : ''}
                        {step.traceKey ? ` · ${step.traceKey}` : ''}
                      </span>
                    </div>
                    <NexusBadge tone={toneByStepStatus(step.status)}>{step.status ?? 'pending'}</NexusBadge>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </NexusCard>
  )
}

import { describe, expect, it } from 'vitest'
import { mapExecutionViewModel, mapStateViewModel } from '../expert-studio-mapper'
import type { ExpertExecutionLogRecord, ExpertExecutionRecord } from '../workspace-api'

function createExecution(id: string): ExpertExecutionRecord {
  return {
    id,
    title: 'Revenue Agent',
    status: 'running',
    totalTokens: 321
  }
}

function createLog(id: string): ExpertExecutionLogRecord {
  return {
    id,
    title: 'Revenue Agent',
    status: 'running',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Need confirmation',
        conversationId: 'conv-9'
      }
    ],
    metadata: {
      conversation: {
        conversationId: 'conv-9',
        threadId: 'conv-9',
        turnId: 'turn-7'
      },
      executionLifecycle: {
        status: 'requires_action',
        transitions: ['queued', 'running', 'requires_action']
      },
      pendingActions: [{ id: 'pending-7', action: 'create_indicator' }],
      toolExecutions: [
        {
          callId: 'call-7',
          tool: 'create_indicator',
          status: 'requires_confirmation',
          summary: 'waiting for confirm'
        }
      ]
    }
  }
}

describe('expert studio mapper', () => {
  it('maps execution/runtime context into stable structured fields', () => {
    const execution = createExecution('exec-7')
    const log = createLog('exec-7')
    const state = {
      runtimeControl: {
        command: 'interrupt',
        status: 'requires_action',
        reason: 'manual_review'
      },
      executionLifecycle: {
        status: 'requires_action',
        transitions: ['queued', 'running', 'requires_action']
      },
      checkpoint: {
        id: 11
      }
    }

    const mapped = mapExecutionViewModel({
      execution,
      log,
      state
    })

    expect(mapped.executionId).toBe('exec-7')
    expect(mapped.conversationId).toBe('conv-9')
    expect(mapped.lifecycleStatus).toBe('requires_action')
    expect(mapped.runtimeControl.command).toBe('interrupt')
    expect(mapped.pendingActionCount).toBe(1)
    expect(mapped.toolCalls).toHaveLength(1)
    expect(mapped.toolCalls[0]).toMatchObject({
      id: 'call-7',
      name: 'create_indicator',
      status: 'requires_confirmation'
    })
  })

  it('maps state summary with fallbacks from log timeline', () => {
    const state = {
      runtimeControl: {
        command: 'resume',
        status: 'running'
      }
    }
    const log = {
      ...createLog('exec-9'),
      metadata: {
        executionLifecycle: {
          status: 'succeeded',
          transitions: ['queued', 'running', 'succeeded']
        }
      }
    } satisfies ExpertExecutionLogRecord

    const mapped = mapStateViewModel({
      state,
      log
    })

    expect(mapped.lifecycleStatus).toBe('succeeded')
    expect(mapped.transitions).toEqual(['queued', 'running', 'succeeded'])
    expect(mapped.messageCount).toBe(1)
    expect(mapped.runtimeControl.command).toBe('resume')
  })

  it('falls back to runtime kernel context when execution state lacks conversation fields', () => {
    const mapped = mapExecutionViewModel({
      execution: createExecution('exec-kernel'),
      log: {
        id: 'exec-kernel',
        title: 'Kernel',
        status: 'running',
        metadata: {}
      },
      state: {},
      runtimeContext: {
        conversationId: 'conv-kernel',
        traceKey: 'trace-kernel',
        runtimeControl: {
          command: 'interrupt',
          status: 'requires_action'
        }
      }
    })

    expect(mapped.conversationId).toBe('conv-kernel')
    expect(mapped.traceKey).toBe('trace-kernel')
    expect(mapped.runtimeControl.command).toBe('interrupt')
    expect(mapped.runtimeControl.status).toBe('requires_action')
  })
})

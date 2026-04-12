'use client'

import { create } from 'zustand'

export type WorkbenchStage = 'idle' | 'running' | 'clarification' | 'answered' | 'error'

type WorkbenchEvent =
  | { type: 'QUERY_START' }
  | { type: 'CLARIFICATION_NEEDED' }
  | { type: 'ANSWER_READY' }
  | { type: 'ERROR' }
  | {
      type: 'QUERY_DONE'
      payload?: {
        intent?: string
        traceKey?: string
        queryLogId?: string
        requestId?: string
        toolPlan?: string[]
        statusMessage?: string
      }
    }
  | { type: 'RESET' }

type WorkbenchState = {
  stage: WorkbenchStage
  activeModelId?: string
  activeConversationId?: string
  activeTraceKey?: string
  lastQueryLogId?: string
  lastRequestId?: string
  lastToolPlan?: string[]
  lastStatusMessage?: string
  lastIntentKind?: string
  statusMessage?: string
  lastEventType?: WorkbenchEvent['type']
  lastUpdatedAt?: string
  setActiveModelId: (modelId?: string) => void
  setActiveConversationId: (conversationId?: string) => void
  setActiveTraceKey: (traceKey?: string) => void
  setLastIntentKind: (intent?: string) => void
  setStatusMessage: (statusMessage?: string) => void
  clearLastQueryContext: () => void
  dispatch: (event: WorkbenchEvent) => void
}

const transitionMap: Record<Exclude<WorkbenchEvent['type'], 'QUERY_DONE'>, WorkbenchStage> = {
  QUERY_START: 'running',
  CLARIFICATION_NEEDED: 'clarification',
  ANSWER_READY: 'answered',
  ERROR: 'error',
  RESET: 'idle'
}

export const useWorkbenchMachine = create<WorkbenchState>(set => ({
  stage: 'idle',
  activeModelId: undefined,
  activeConversationId: undefined,
  activeTraceKey: undefined,
  lastQueryLogId: undefined,
  lastRequestId: undefined,
  lastToolPlan: undefined,
  lastStatusMessage: undefined,
  lastIntentKind: undefined,
  statusMessage: undefined,
  lastEventType: undefined,
  lastUpdatedAt: undefined,
  setActiveModelId: modelId => set({ activeModelId: modelId }),
  setActiveConversationId: conversationId => set({ activeConversationId: conversationId }),
  setActiveTraceKey: traceKey => set({ activeTraceKey: traceKey }),
  setLastIntentKind: intent => set({ lastIntentKind: intent }),
  setStatusMessage: statusMessage => set({ statusMessage }),
  clearLastQueryContext: () =>
    set({
      lastQueryLogId: undefined,
      lastRequestId: undefined,
      lastToolPlan: undefined,
      lastStatusMessage: undefined,
      statusMessage: undefined
    }),
    dispatch: event =>
    set(state => {
      const nextStage = event.type === 'QUERY_DONE' ? state.stage : transitionMap[event.type] ?? state.stage
      const nextUpdatedAt = new Date().toISOString()

      if (event.type === 'RESET') {
        return {
          stage: transitionMap.RESET,
          lastEventType: event.type,
          lastUpdatedAt: nextUpdatedAt,
          lastStatusMessage: undefined,
          statusMessage: '已重置',
          lastIntentKind: undefined,
          lastQueryLogId: undefined,
          lastRequestId: undefined,
          lastToolPlan: undefined,
          activeTraceKey: undefined
        }
      }

      if (event.type === 'QUERY_DONE') {
        const payload = event.payload ?? {}
        const updates: Partial<WorkbenchState> = {
          stage: 'answered',
          lastEventType: event.type,
          lastUpdatedAt: nextUpdatedAt,
          lastIntentKind: payload.intent ?? state.lastIntentKind,
          lastQueryLogId: payload.queryLogId ?? state.lastQueryLogId,
          lastRequestId: payload.requestId ?? state.lastRequestId,
          lastToolPlan: payload.toolPlan ?? state.lastToolPlan,
          lastStatusMessage: payload.statusMessage ?? state.lastStatusMessage,
          activeTraceKey: payload.traceKey ?? state.activeTraceKey,
          statusMessage: payload.statusMessage ?? state.statusMessage
        }
        return updates
      }

      return {
        stage: nextStage,
        lastEventType: event.type,
        lastUpdatedAt: nextUpdatedAt,
        lastStatusMessage: state.lastStatusMessage,
        statusMessage:
          event.type === 'CLARIFICATION_NEEDED'
            ? '系统进入澄清环节'
            : event.type === 'QUERY_START'
                ? '处理中'
              : event.type === 'ANSWER_READY'
                ? '分析已完成'
                : event.type === 'ERROR'
                  ? '执行失败'
                  : state.statusMessage
      }
    })
}))

export function resolveStageLabel(stage: WorkbenchStage) {
  switch (stage) {
    case 'running':
      return '执行中'
    case 'clarification':
      return '待澄清'
    case 'answered':
      return '已完成'
    case 'error':
      return '异常'
    default:
      return '空闲'
  }
}

import { resolveAskHarnessXpertId } from './ask-harness'

type AnalysisFollowupInput = {
  prompt: string
  patch?: Record<string, unknown>
  analysisAction?: string
  baseQueryLogId?: string
}

type StandardChatRequestInput = {
  question: string
  modelId?: string
  xpertId?: string
  conversationId?: string
  analysisFollowup?: AnalysisFollowupInput
}

type RuntimeControlResumeInput = {
  action: 'resume'
  conversationId: string
  modelId?: string
  xpertId?: string
  resume: Record<string, unknown>
  update?: Record<string, unknown>
}

type RuntimeControlToolCallUpdateInput = {
  action: 'tool_call_update'
  conversationId: string
  modelId?: string
  xpertId?: string
  toolCalls: Array<{
    id: string
    args: Record<string, unknown>
  }>
}

export type RuntimeControlRequestInput = RuntimeControlResumeInput | RuntimeControlToolCallUpdateInput

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function buildOptions(input?: { xpertId?: string; analysisFollowup?: AnalysisFollowupInput }) {
  const resolvedXpertId = resolveAskHarnessXpertId(asNonEmptyString(input?.xpertId))
  return {
    ...(resolvedXpertId ? { xpertId: resolvedXpertId } : {}),
    ...(input?.analysisFollowup ? { analysisFollowup: input.analysisFollowup } : {})
  }
}

function buildRequestInput(modelId?: string) {
  return {
    input: '',
    files: [],
    ...(modelId ? { modelId } : {})
  }
}

export function buildXpertChatRequestBody(input: StandardChatRequestInput) {
  return {
    request: {
      input: {
        input: input.question,
        files: [],
        ...(input.modelId ? { modelId: input.modelId } : {})
      },
      ...(input.conversationId ? { conversationId: input.conversationId } : {})
    },
    options: buildOptions({
      xpertId: input.xpertId,
      analysisFollowup: input.analysisFollowup
    })
  }
}

export function buildXpertRuntimeControlRequestBody(
  input:
    | RuntimeControlRequestInput
    | ({ action: string; conversationId: string; modelId?: string; xpertId?: string } & Record<string, unknown>)
) {
  if (input.action === 'resume') {
    return {
      request: {
        input: buildRequestInput(input.modelId),
        conversationId: input.conversationId,
        command: {
          resume: input.resume,
          ...(input.update ? { update: input.update } : {})
        }
      },
      options: buildOptions({
        xpertId: input.xpertId
      })
    }
  }

  if (input.action === 'tool_call_update') {
    return {
      request: {
        input: buildRequestInput(input.modelId),
        conversationId: input.conversationId,
        command: {
          toolCalls: input.toolCalls
        }
      },
      options: buildOptions({
        xpertId: input.xpertId
      })
    }
  }

  throw new Error(`Unsupported runtime control action: ${input.action}`)
}

export type PublishedAgentStatus = 'published'

export type AskPageState = 'idle' | 'bootstrapping' | 'ready' | 'submitting' | 'streaming' | 'clarifying' | 'failed'

export type AskMessageState = 'pending' | 'streaming' | 'complete' | 'error'

export type MessageRole = 'user' | 'assistant'

export type FeedbackRating = 'up' | 'down'

export type AnswerBlockType =
  | 'markdown'
  | 'kpi'
  | 'chart'
  | 'table'
  | 'sources'
  | 'followups'
  | 'clarification'
  | 'empty'
  | 'error'

export type PublishedAgentContext = {
  agentId: string
  slug: string
  name: string
  status: PublishedAgentStatus
  domain: string
  summary: string
  cube: string
  defaultScenario: string
  starterQuestions: string[]
}

export type ConversationSummary = {
  conversationId: string
  title: string
  lastQuestion: string
  lastUpdatedAt: string
}

export type AnswerKpiBlock = {
  type: 'kpi'
  items: Array<{
    label: string
    value: string
    trend?: string
  }>
}

export type AnswerChartBlock = {
  type: 'chart'
  chartType: 'line' | 'bar'
  title: string
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
}

export type AnswerTableBlock = {
  type: 'table'
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export type AnswerSourcesBlock = {
  type: 'sources'
  items: Array<{
    label: string
    value: string
  }>
}

export type AnswerFollowupsBlock = {
  type: 'followups'
  questions: string[]
}

export type AnswerClarificationBlock = {
  type: 'clarification'
  prompt: string
  options: string[]
}

export type AnswerEmptyBlock = {
  type: 'empty'
  title: string
  detail: string
}

export type AnswerErrorBlock = {
  type: 'error'
  title: string
  detail: string
}

export type AnswerMarkdownBlock = {
  type: 'markdown'
  text: string
}

export type AnswerBlock =
  | AnswerMarkdownBlock
  | AnswerKpiBlock
  | AnswerChartBlock
  | AnswerTableBlock
  | AnswerSourcesBlock
  | AnswerFollowupsBlock
  | AnswerClarificationBlock
  | AnswerEmptyBlock
  | AnswerErrorBlock

export type ConversationMessage = {
  messageId: string
  role: MessageRole
  state: AskMessageState
  text: string
  createdAt: string
  feedback?: FeedbackRating | null
  blocks?: AnswerBlock[]
}

export type CreateConversationRequest = {
  title?: string
}

export type CreateConversationResponse = {
  agentId: string
  conversationId: string
  title: string
}

export type SubmitAskMessageRequest = {
  conversationId?: string
  question: string
  scenario?: 'sales-summary' | 'clarification-needed' | 'no-data'
}

export type SubmitAskMessageResponse = {
  agentId: string
  conversationId: string
  userMessageId: string
  assistantMessageId: string
  streamUrl: string
  scenario: string
}

export type SubmitMessageFeedbackRequest = {
  rating: FeedbackRating
  reason?: string
}

export type SessionStartedEvent = {
  type: 'session.started'
  conversationId: string
  assistantMessageId: string
  occurredAt: string
}

export type AssistantThinkingEvent = {
  type: 'assistant.thinking'
  message: string
  occurredAt: string
}

export type AnalysisPlanEvent = {
  type: 'analysis.plan'
  steps: string[]
  occurredAt: string
}

export type AnswerDeltaEvent = {
  type: 'answer.delta'
  delta: string
  occurredAt: string
}

export type ClarificationRequestedEvent = {
  type: 'clarification.requested'
  prompt: string
  options: string[]
  occurredAt: string
}

export type ChartReadyEvent = {
  type: 'chart.ready'
  block: AnswerChartBlock
  occurredAt: string
}

export type TableReadyEvent = {
  type: 'table.ready'
  block: AnswerTableBlock
  occurredAt: string
}

export type SourcesReadyEvent = {
  type: 'sources.ready'
  block: AnswerSourcesBlock
  occurredAt: string
}

export type AnswerCompletedEvent = {
  type: 'answer.completed'
  messageText: string
  blocks: AnswerBlock[]
  followups: string[]
  occurredAt: string
}

export type AnswerFailedEvent = {
  type: 'answer.failed'
  code: string
  message: string
  occurredAt: string
}

export type AskStreamEvent =
  | SessionStartedEvent
  | AssistantThinkingEvent
  | AnalysisPlanEvent
  | AnswerDeltaEvent
  | ClarificationRequestedEvent
  | ChartReadyEvent
  | TableReadyEvent
  | SourcesReadyEvent
  | AnswerCompletedEvent
  | AnswerFailedEvent

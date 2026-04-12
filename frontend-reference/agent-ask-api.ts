import type {
  ConversationMessage,
  ConversationSummary,
  CreateConversationRequest,
  CreateConversationResponse,
  PublishedAgentContext,
  SubmitAskMessageRequest,
  SubmitAskMessageResponse,
  SubmitMessageFeedbackRequest
} from '../contracts/published-agent-ask-contract'

export type AskRuntimeListener = (event: { type: string; payload: unknown }) => void

export class PublishedAgentAskApi {
  constructor(private readonly baseUrl: string) {}

  async getAgentContext(agentId: string): Promise<PublishedAgentContext> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}`)
    return response.json()
  }

  async listSuggestions(agentId: string): Promise<{ items: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/suggestions`)
    return response.json()
  }

  async listConversations(agentId: string): Promise<{ items: ConversationSummary[] }> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/conversations`)
    return response.json()
  }

  async createConversation(agentId: string, body: CreateConversationRequest): Promise<CreateConversationResponse> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/conversations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async listMessages(agentId: string, conversationId: string): Promise<{ items: ConversationMessage[] }> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/conversations/${conversationId}/messages`)
    return response.json()
  }

  async submitQuestion(agentId: string, body: SubmitAskMessageRequest): Promise<SubmitAskMessageResponse> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async submitFeedback(agentId: string, messageId: string, body: SubmitMessageFeedbackRequest): Promise<{ ok: true }> {
    const response = await fetch(`${this.baseUrl}/api/published-agents/${agentId}/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  stream(streamUrl: string, listener: AskRuntimeListener) {
    const source = new EventSource(`${this.baseUrl}${streamUrl}`)
    const eventTypes = [
      'session.started',
      'assistant.thinking',
      'analysis.plan',
      'answer.delta',
      'clarification.requested',
      'chart.ready',
      'table.ready',
      'sources.ready',
      'answer.completed',
      'answer.failed'
    ]

    for (const type of eventTypes) {
      source.addEventListener(type, event => {
        const messageEvent = event as MessageEvent<string>
        listener({
          type,
          payload: JSON.parse(messageEvent.data)
        })
      })
    }

    return () => {
      source.close()
    }
  }
}

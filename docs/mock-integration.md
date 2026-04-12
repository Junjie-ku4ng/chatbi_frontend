# Mock Integration Guide

## Purpose

The mock service simulates the published agent ask backend so the frontend team can complete the page without any real backend implementation exposure.

## Base URL

```text
http://localhost:3790
```

## API Summary

### `GET /health`

Returns service health.

### `GET /api/published-agents/:agentId`

Returns published agent page context.

### `GET /api/published-agents/:agentId/suggestions`

Returns starter or follow-up questions.

### `GET /api/published-agents/:agentId/conversations`

Returns conversation summaries for the current agent.

### `POST /api/published-agents/:agentId/conversations`

Creates a conversation.

Request:

```json
{
  "title": "华东区销售趋势分析"
}
```

### `GET /api/published-agents/:agentId/conversations/:conversationId/messages`

Returns the full message list for a conversation.

### `POST /api/published-agents/:agentId/messages`

Submits a question into the conversation.

Request:

```json
{
  "conversationId": "conv-sales-001",
  "question": "华东区最近 6 个月销售趋势如何？",
  "scenario": "sales-summary"
}
```

Response:

```json
{
  "agentId": "agent-sales-published",
  "conversationId": "conv-sales-001",
  "userMessageId": "msg-user-123",
  "assistantMessageId": "msg-assistant-456",
  "streamUrl": "/api/published-agents/agent-sales-published/stream?conversationId=conv-sales-001&assistantMessageId=msg-assistant-456&scenario=sales-summary"
}
```

### `GET /api/published-agents/:agentId/stream`

SSE endpoint for incremental answer events.

Query params:

- `conversationId`
- `assistantMessageId`
- `scenario`

### `POST /api/published-agents/:agentId/messages/:messageId/feedback`

Posts feedback for one assistant message.

Request:

```json
{
  "rating": "up",
  "reason": "结论清晰"
}
```

## Supported Scenarios

- `sales-summary`
- `clarification-needed`
- `no-data`

If the frontend does not pass `scenario`, the mock service will infer one from the question text when possible.

## Frontend Integration Sequence

1. Load agent context
2. Load starter suggestions
3. Load conversation list
4. Create or reuse a conversation
5. Call `POST /messages`
6. Open SSE stream from `streamUrl`
7. Merge stream events into the assistant message
8. On completion, optionally refresh conversation messages from the list endpoint

## Important Constraint

The frontend should treat the mock responses as the public contract. It should not assume any hidden backend-only fields or internal execution steps.

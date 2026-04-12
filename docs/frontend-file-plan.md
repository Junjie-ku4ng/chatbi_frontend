# Frontend File Plan

## Goal

This file defines the recommended frontend module split for the published `agentId` ask page. The structure is designed so the team can build the feature as a reusable module and keep the route layer thin.

## Recommended Route Entry

```text
app/(workspace)/chat/agents/[agentId]/page.tsx
```

Responsibility:

- resolve route params
- read `conversationId` from search params if present
- mount the feature page container
- avoid embedding business logic directly in the route file

## Recommended Feature Module

```text
src/modules/published-agent-ask/
  api/
    client.ts
    event-stream.ts
    contracts.ts
  components/
    published-agent-ask-page.tsx
    published-agent-header.tsx
    conversation-list.tsx
    ask-timeline.tsx
    ask-message.tsx
    clarification-card.tsx
    result-kpi-card.tsx
    result-chart-card.tsx
    result-table-card.tsx
    source-reference-list.tsx
    suggestion-chips.tsx
    ask-composer.tsx
    message-feedback.tsx
  hooks/
    use-published-agent-page.ts
    use-ask-stream.ts
    use-conversation-history.ts
  state/
    reducer.ts
    selectors.ts
    types.ts
  utils/
    answer-blocks.ts
    conversation-title.ts
    stream-normalizer.ts
```

## File Responsibilities

### `api/client.ts`

- fetch agent context
- fetch conversations
- create conversation
- submit question
- submit message feedback

### `api/event-stream.ts`

- create and manage the SSE connection
- map raw SSE events into internal frontend actions
- handle stream completion and failure

### `api/contracts.ts`

- local re-export or copy of the package contracts
- keep all DTO names aligned with `contracts/published-agent-ask-contract.ts`

### `state/reducer.ts`

- own page state transitions
- own message state transitions
- merge incremental stream events

### `hooks/use-published-agent-page.ts`

- bootstrap the page
- load agent context and starter suggestions
- coordinate conversation selection and question submission

### `hooks/use-ask-stream.ts`

- subscribe to SSE
- dispatch normalized stream actions
- tear down the stream safely on route changes or retries

## UI Layout Guidance

Recommended visual split:

- left: conversation list
- center: header + timeline + composer
- optional right: sources or result context if the host design needs it

For the first version, the center lane must remain the primary owner of answer rendering. Chart, table, and clarification content should not be detached into a separate dashboard view.

## Testing Suggestions

Minimum frontend test slices:

- page bootstrap
- first ask
- clarification flow
- empty-result flow
- feedback submission
- conversation replay
- SSE incremental render

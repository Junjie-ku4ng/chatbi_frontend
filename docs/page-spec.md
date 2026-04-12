# Published Agent Ask Page Spec

## Goal

Deliver a high-fidelity ask page for a single published `agentId`. The page is optimized for smart BI analytics conversations, not for generic assistant chat.

The first required scenario is `Sales Cube` smart Q&A:

- KPI questions
- trend questions
- compare questions
- top N questions
- clarification when dimensions or metrics are ambiguous
- follow-up questions that inherit current conversation context

## Core Page Regions

### 1. Fixed Header

Must show:

- agent name
- published status
- current business domain tag
- current conversation title or default page title
- refresh / reset action

Should not show:

- internal backend identifiers other than `agentId`
- raw trace keys or internal owner metadata

### 2. Conversation Timeline

Must contain:

- user messages
- assistant streaming state
- clarification cards
- result cards attached to the relevant assistant message
- failure and retry actions

### 3. Composer

Must support:

- free text question input
- disabled state while submitting
- follow-up after completed answer
- retry last question

### 4. Suggested Questions

Must support:

- empty-state starter questions
- post-answer follow-up recommendations
- scenario-specific prompts for `Sales Cube`

### 5. Conversation Context

Lightweight only for this phase:

- current conversation list
- active conversation title
- last updated time
- current scenario tag if present

## Required User Flows

### Flow A: First Ask

1. Page loads by `agentId`
2. Frontend fetches published agent context
3. Frontend fetches starter suggestions
4. User sends first question
5. Frontend creates or reuses a conversation
6. Frontend starts SSE stream
7. Timeline renders progressive answer state
8. Final answer renders chart/table/KPI cards inline

### Flow B: Clarification

1. User asks an ambiguous question
2. Stream emits `clarification.requested`
3. UI shows clarification card in message lane
4. User selects or types clarification
5. Frontend resubmits against the same conversation

### Flow C: No Data

1. User asks a valid but empty-result question
2. Stream ends with `answer.completed`
3. Final answer shows explicit empty-result explanation
4. UI surfaces recommended follow-up questions

### Flow D: Feedback

1. Assistant answer is completed
2. User clicks thumbs up or thumbs down
3. Frontend posts feedback for the assistant message
4. Message feedback state updates without reloading the page

## Page State Machine

### Page-Level States

- `idle`
- `bootstrapping`
- `ready`
- `submitting`
- `streaming`
- `clarifying`
- `failed`

### Message-Level States

- `pending`
- `streaming`
- `complete`
- `error`

## Required Answer Blocks

The assistant lane must be able to render the following blocks inline:

- narrative answer
- KPI summary strip
- chart card
- table card
- source references
- follow-up suggestions
- clarification card
- empty-result notice
- error notice

## Sales Cube Defaults

Starter prompts should include examples like:

- `本月销售额是多少？`
- `华东区最近 6 个月销售趋势如何？`
- `各区域销售额同比变化如何？`
- `销量最高的 10 个产品是什么？`
- `为什么华北区销售额下降了？`

## Acceptance Checklist

- the page can boot from only `agentId`
- the page can start a new conversation
- the page can replay conversation history
- the page can stream answer events over SSE
- the page can render clarification and empty-result states
- the page can submit feedback on assistant messages
- all answer cards stay attached to the originating assistant message

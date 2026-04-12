# Streaming Events Contract

## Transport

- protocol: Server-Sent Events
- content type: `text/event-stream`
- event name: use the runtime event `type`
- payload: JSON object

## Required Event Types

- `session.started`
- `assistant.thinking`
- `analysis.plan`
- `answer.delta`
- `clarification.requested`
- `chart.ready`
- `table.ready`
- `sources.ready`
- `answer.completed`
- `answer.failed`

## Typical Success Sequence

```text
session.started
assistant.thinking
analysis.plan
answer.delta
answer.delta
chart.ready
table.ready
sources.ready
answer.completed
```

## Clarification Sequence

```text
session.started
assistant.thinking
clarification.requested
```

## Empty Result Sequence

```text
session.started
assistant.thinking
answer.delta
sources.ready
answer.completed
```

## Example SSE Packet

```text
event: answer.delta
data: {"type":"answer.delta","delta":"华东区最近 6 个月销售总体呈上升趋势。","occurredAt":"2026-04-10T10:00:01.000Z"}
```

## Frontend Rules

- append `answer.delta` into the current assistant message text
- render `chart.ready`, `table.ready`, and `sources.ready` as blocks attached to the current assistant message
- treat `clarification.requested` as a completed clarification turn, not as an error
- close stream state only after `answer.completed` or `answer.failed`

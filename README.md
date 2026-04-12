# Published Agent Ask Page Handoff Package

This package is for frontend delivery only. It defines the page, contracts, mock service, and sample data for the `agentId`-scoped ask experience without exposing any `apps/pa-api` source code or implementation details.

## Scope

- Target page: published agent ask page for smart BI Q&A
- First business scenario: `Sales Cube` smart analytics Q&A
- Runtime entry: `agentId`
- Delivery goal: frontend team can build a fully integrated page against mock APIs and SSE events

## Package Contents

- `frontend-source/apps/chatbi-web`
  - source snapshot of the current `apps/chatbi-web` frontend app for the receiving frontend team
  - excludes local-only or generated artifacts such as `.env.local`, `.next`, `node_modules`, `test-results`, and `tsconfig.tsbuildinfo`
- `frontend-source/apps/chatbi-web-v2`
  - source snapshot of the current `apps/chatbi-web-v2` frontend app for the receiving frontend team
  - excludes generated artifacts such as `.next`, `node_modules`, and `tsconfig.tsbuildinfo`
- `docs/page-spec.md`
  - detailed page behavior, user flows, message states, and acceptance rules
- `docs/frontend-file-plan.md`
  - recommended frontend file tree and ownership split
- `docs/mock-integration.md`
  - how the frontend should connect to the mock server
- `contracts/published-agent-ask-contract.ts`
  - TypeScript contracts for page data, requests, responses, and stream events
- `contracts/streaming-events.md`
  - event sequencing and stream examples
- `frontend-reference/agent-ask-api.ts`
  - reference fetch and SSE adapter for frontend engineers
- `mock-service/*`
  - runnable mock backend with sample scenario data

## What This Package Does Not Include

- no `apps/pa-api` source code
- no real backend code
- no internal domain services
- no database schema
- no hidden owner logic
- no proprietary runtime implementation from `apps/pa-api`

## Recommended Working Mode

1. Run the mock service.
2. Review `frontend-source/apps/chatbi-web-v2` as the latest design and implementation direction.
3. Review `frontend-source/apps/chatbi-web` as the current product capability baseline.
4. Build the page against the contracts in `contracts/`.
5. Use `Sales Cube` sample scenarios first.
6. Keep page architecture generic so other published agents can reuse the same page with another `agentId`.

## Quick Start

Run the mock service:

```bash
cd mock-service
npm run start
```

Default server:

```text
http://localhost:3790
```

Health check:

```bash
curl http://localhost:3790/health
```

## Suggested Frontend Route

Recommended page route:

```text
/chat/agents/[agentId]
```

If the host app keeps `/chat` as the canonical workspace route, this page can also be mounted as a route entry that redirects into a shared chat shell with `agentId` in search params.

## Delivery Notes

- The page must be designed as a reusable `published agent ask page`.
- The first polished scenario is `Sales Cube` smart BI Q&A.
- The frontend may switch between published agents later, but this package freezes only the `agentId` ask page itself.

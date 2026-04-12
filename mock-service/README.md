# Mock Service

This is a dependency-free Node.js mock backend for the published agent ask page.

## Run

```bash
npm run start
```

## Server

```text
http://localhost:3790
```

## Scenario Notes

- `sales-summary`
  - standard successful smart BI answer
- `clarification-needed`
  - assistant asks for more detail
- `no-data`
  - valid question but no result set

The server stores conversation state in memory after startup. Restarting the server resets runtime-created conversations and feedback state.

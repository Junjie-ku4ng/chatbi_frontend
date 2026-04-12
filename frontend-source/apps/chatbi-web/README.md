# chatbi-web

Frontend product shell for pa-chatbi, built with Next.js + assistant-ui + ECharts.

## Run

```bash
yarn --cwd apps/chatbi-web install
yarn --cwd apps/chatbi-web dev
```

Default URL: `http://localhost:3300`

## Environment

Copy `.env.example` to `.env.local` and set values:

- `NEXT_PUBLIC_PA_API_BASE_URL` - pa-api base url
- `NEXT_PUBLIC_AUTH_MODE` - `dev_headers` or `bearer`
- `NEXT_PUBLIC_STREAM_ENABLED` - enable `/chatbi/query/stream`

## Test

```bash
yarn --cwd apps/chatbi-web test
```

Playwright e2e requires browser installation:

```bash
yarn --cwd apps/chatbi-web playwright install chromium
yarn --cwd apps/chatbi-web e2e
```

# chatbi-web-v2

`chatbi-web-v2` is the new Ask frontend forked from the Onyx chat experience. Onyx is the visual and interaction authority for the Ask surface; `pa-chatbi` owns the runtime, contracts, and backend integration.

Current scope:
- isolated Next.js app for the Onyx-native Ask workspace
- localized Onyx sidebar, chat page, thread, composer, and source rail
- live `/api/chat`, `/api/xpert/*`, `/api/pa/*`, and `/api/auth/refresh` proxy wiring
- real conversation deep-links, runtime event projection, conversation replay, feedback, and analysis actions
- analysis/chart extensions rendered inside the Onyx message stream

Guardrails:
- `vendor/onyx-foss/web` is the only UI baseline for `v2`
- `apps/chatbi-web` may be consulted only as a temporary protocol or event sample when backend behavior must be matched
- `~/workspace/xpert` may be consulted only for analytical capabilities that stock Onyx does not provide, such as richer chart or canvas behaviors
- user-visible chat layout, spacing, hierarchy, and interaction patterns must follow Onyx

Run:

```bash
yarn --cwd apps/chatbi-web-v2 dev
yarn --cwd apps/chatbi-web-v2 test
yarn --cwd apps/chatbi-web-v2 build
```

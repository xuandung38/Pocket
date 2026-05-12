# Phase 04 — Frontend: Refactor `chat.services.js` to Use `/locket/proxy/*`

**Owner:** dev-4 · **Effort:** 1h · **Status:** pending · **Blocked by:** 01

## Context Links
- Plan: `plan.md`
- Frontend chat services: `apps/self-hosted/lovekit/src/services/LocketServices/chat.services.js`
- Direct Locket axios (delete): `apps/self-hosted/lovekit/src/lib/axios.locket.js`
- Direct data axios (delete): `apps/self-hosted/lovekit/src/lib/axios.data.js`
- Backend whitelist (Phase 01 expands): `apps/self-hosted/api/src/controllers/locket.controller.js:23`

## Overview
**Priority:** P1 · **Status:** pending
`chat.services.js` (sendMessage / markReadMessage / sendReactionOnMessage / deleteMessage)
posts directly to `https://api.locketcamera.com/*` via `instanceLocket`. The real Locket
API rejects requests without AppCheck → all chat calls fail in self-hosted mode. Route
through self-hosted proxy instead.

## Key Insights
- Identical pattern already exists in `moment.services.js`: `api.post("/locket/proxy/<endpoint>", body)` — copy that
- Phase 01 must add `markAsRead`, `sendChatMessageReaction`, `deleteChatMessage` to whitelist (already in plan)
- Two `sendMessage` implementations exist: `chat.services.js#sendMessage` (used by `ChatDetail`) and `moment.services.js#SendMessageMoment` (used by feed reaction-with-message). Keep both, but route both through proxy. `moment.services.js` already does proxy correctly.
- `instanceLocket` and `instanceLocketV2` both live in `lib/axios.locket.js`. Backend uses `instanceLocketV2` server-side (different file). FE no longer needs either.
- `lib/axios.data.js` — search if used; delete if orphaned

## Requirements
**Functional**
- `sendMessage`, `markReadMessage`, `sendReactionOnMessage`, `deleteMessage` all hit self-hosted backend
- ChatDetail send-message flow works end-to-end
- No request leaves the browser to `api.locketcamera.com`

## Architecture
```
Before:
ChatDetail ── sendMessage ── instanceLocket(api.locketcamera.com) ──► AppCheck rejection

After:
ChatDetail ── sendMessage ── api.post("/locket/proxy/sendChatMessageV2") ──► self-hosted ──► Locket
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/services/LocketServices/chat.services.js` — replace all `instanceLocket.post(...)` with `api.post("/locket/proxy/...")`

**Delete**
- `apps/self-hosted/lovekit/src/lib/axios.locket.js`
- `apps/self-hosted/lovekit/src/lib/axios.data.js` (only if `grep` shows no consumers)

**Read**
- `apps/self-hosted/lovekit/src/services/LocketServices/moment.services.js` — copy pattern

## Implementation Steps
1. Refactor each of the 4 functions in `chat.services.js`. Drop the `getToken()` + manual `Authorization` header — `api` interceptor handles it. Drop `loginHeader` constant.
2. New shape per function (example: `sendMessage`):
   ```js
   import api from "@/lib/axios";
   import { generateUUIDv4Upper } from "@/utils/generate/uuid";

   export const sendMessage = async (messageInfo) => {
     const body = {
       data: {
         msg: messageInfo.message || " ",
         analytics: { /* unchanged */ },
         client_token: generateUUIDv4Upper(),
         moment_uid: messageInfo?.moment_id || null,
         receiver_uid: messageInfo.receiver_uid,
       },
     };
     const response = await api.post("/locket/proxy/sendChatMessageV2", body);
     return response.data;
   };
   ```
3. `markReadMessage` → `/locket/proxy/markAsRead`
4. `sendReactionOnMessage` → `/locket/proxy/sendChatMessageReaction`
5. `deleteMessage` → `/locket/proxy/deleteChatMessage`
6. `grep -rn "from \"@/lib/axios.locket\"" lovekit/src` — confirm no other consumers; delete file
7. `grep -rn "from \"@/lib/axios.data\"" lovekit/src` — confirm no consumers; delete file
8. Smoke test ChatDetail send-message

## Todo List
- [ ] Rewrite `sendMessage` with proxy + `api`
- [ ] Rewrite `markReadMessage` with proxy
- [ ] Rewrite `sendReactionOnMessage` with proxy
- [ ] Rewrite `deleteMessage` with proxy
- [ ] Delete `axios.locket.js` after grep confirms no usages
- [ ] Delete `axios.data.js` if unused
- [ ] Manual smoke: open chat, send message, mark read

## Success Criteria
- Network panel shows requests only to self-hosted origin (no `api.locketcamera.com`)
- ChatDetail messages send/receive correctly
- Token stored only in localStorage (not duplicated in service-level)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase 01 whitelist not yet shipped | High at start | High | Hard block — `addBlockedBy: ["1"]` |
| Backend ignores `data: {...}` envelope | Low | Med | Identical envelope used by `moment.services.js` proxy calls — proven |
| `axios.data.js` has hidden consumer | Low | Low | Grep before delete |

## Security Considerations
- Removes direct browser → Locket call (eliminates CORS + AppCheck workarounds)
- Reduces token sprawl: only `instanceAuth` and `api` interceptors handle Authorization

## Next Steps
- After ship, request `/ck:scout` for any remaining direct-Locket axios usages

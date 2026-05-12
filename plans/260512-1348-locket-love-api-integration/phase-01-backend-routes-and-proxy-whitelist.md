# Phase 01 — Backend: Add Missing Routes + Expand Proxy Whitelist

**Owner:** dev-1 · **Effort:** 1.5h · **Status:** pending · **Blocks:** 07

## Context Links
- Plan: `plan.md`
- Backend routes: `apps/self-hosted/api/src/routes/locket.route.js`
- Backend controller: `apps/self-hosted/api/src/controllers/locket.controller.js:23` (`LOCKET_PROXY_WHITELIST`)
- Frontend RequestServices: `apps/self-hosted/lovekit/src/services/LocketDioServices/RequestServices.js:144`
- Frontend chat.services: `apps/self-hosted/lovekit/src/services/LocketServices/chat.services.js`

## Overview
**Priority:** P1 · **Status:** pending
Frontend calls 4+ Locket endpoints that backend either does not route or excludes from
the proxy whitelist. This phase opens the proxy whitelist + adds dedicated `/locket/sendFriendRequestV2`.

## Key Insights
- Generic proxy already exists at `/locket/proxy/:endpoint` (locket.route.js:45) but enforces a closed whitelist for security
- Same proxy can serve `markAsRead`, `sendChatMessageReaction`, `deleteChatMessage`, `sendFriendRequestV2` once whitelisted
- `sendFriendRequestV2` is also referenced as a dedicated route in FE — keep both code paths working: add real route + add to whitelist (FE can choose either)

## Requirements
**Functional**
- Frontend `sendFriendRequestV2`, `markAsRead`, `sendChatMessageReaction`, `deleteChatMessage` calls succeed
- Backend rejects unknown endpoints with 400 (existing behavior preserved)

**Non-functional**
- All new routes go through `verifyIdToken`
- No regression in existing whitelist behavior

## Architecture
```
FE  POST /locket/sendFriendRequestV2 ──► Controller.sendFriendRequest
                                          └─► instanceLocketV2.post("sendFriendRequestV2")

FE  POST /locket/proxy/markAsRead ──► proxyLocket (whitelist check) ──► instanceLocketV2
FE  POST /locket/proxy/sendChatMessageReaction ──► same path
FE  POST /locket/proxy/deleteChatMessage ──► same path
FE  POST /locket/proxy/sendFriendRequestV2 ──► same path (alternative)
```

## Related Code Files
**Modify**
- `apps/self-hosted/api/src/routes/locket.route.js` — add `sendFriendRequestV2` route
- `apps/self-hosted/api/src/controllers/locket.controller.js` — add `sendFriendRequest` handler; expand `LOCKET_PROXY_WHITELIST`

**Read**
- `apps/self-hosted/api/src/libs/instanceLocket.js` — to confirm `instanceLocketV2` shape

## Implementation Steps
1. In `controllers/locket.controller.js`, add to `LOCKET_PROXY_WHITELIST`:
   - `"markAsRead"`, `"sendChatMessageReaction"`, `"deleteChatMessage"`, `"sendFriendRequestV2"`
2. Add controller method `sendFriendRequest`:
   ```js
   async sendFriendRequest(req, res, next) {
     try {
       const { idToken } = req.user;
       const response = await instanceLocketV2.post("sendFriendRequestV2", req.body, { meta: { idToken } });
       return res.status(200).json(response.data);
     } catch (error) {
       if (error.response) return res.status(error.response.status).json(error.response.data);
       next(error);
     }
   }
   ```
3. In `routes/locket.route.js`, add:
   ```js
   router.post("/sendFriendRequestV2", verifyIdToken, locketController.sendFriendRequest);
   ```
4. Manually smoke-test with `curl`:
   ```bash
   curl -X POST $API/locket/proxy/markAsRead -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" -d '{"data":{"conversation_uid":"x"}}'
   ```

## Todo List
- [ ] Add 4 endpoints to whitelist
- [ ] Implement `sendFriendRequest` controller
- [ ] Wire `/sendFriendRequestV2` route
- [ ] Run `pnpm dev` (backend) and verify routes
- [ ] curl smoke against running server with valid token

## Success Criteria
- `curl /locket/proxy/markAsRead` returns 2xx (or upstream Locket error, NOT 400 "endpoint not allowed")
- `curl /locket/sendFriendRequestV2` reaches Locket API
- No existing whitelist endpoints regress

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Whitelist misspelled | Med | High | Match against Locket docs / FE call sites |
| Auth header missing in pass-through | Low | High | `meta: { idToken }` interceptor pattern proven by `proxyLocket` |

## Security Considerations
- All routes require `verifyIdToken` middleware
- Whitelist still protects against arbitrary endpoint forwarding
- No request body validation added (matches existing proxy behavior)

## Next Steps
- Phase 07 depends on `/sendFriendRequestV2` and proxy whitelist additions
- Phase 04 depends on chat-related whitelist additions

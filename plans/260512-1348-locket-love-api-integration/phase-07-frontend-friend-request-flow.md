# Phase 07 — Frontend: Friend-Request Flow Consolidation

**Owner:** dev-7 · **Effort:** 2h · **Status:** pending · **Blocked by:** 01

## Context Links
- Plan: `plan.md`
- Service: `apps/self-hosted/lovekit/src/services/LocketDioServices/RequestServices.js`
- FindFriend (UI): `apps/self-hosted/lovekit/src/components/friends/FindFriend.jsx`
- NormalItemFriend (UI): `apps/self-hosted/lovekit/src/components/friends/NormalItemFriend.jsx`
- Backend route added by Phase 01: `POST /locket/sendFriendRequestV2`
- Backend whitelist (Phase 01): adds `sendFriendRequestV2`

## Overview
**Priority:** P1 · **Status:** pending
Three issues:
1. `RequestServices.SendRequestToFriend` posts to `/locket/sendFriendRequestV2` which Phase 01 ships — verify body shape matches
2. `RequestServices.getAllRequestFriend` calls `/locket/getAllRequestsV2` which **does not exist** on backend — replace with split endpoints (`/getIncomingFriendRequestsV2`) or remove
3. `FindFriend.handleAddFriend` shows `"Chưa hỗ trợ tính năng này!"` for non-celebrity users — must call `SendRequestToFriend(uid)` for normal users

## Key Insights
- Backend's `proxyLocket` will accept `sendFriendRequestV2` after Phase 01 whitelist update; FE can use either dedicated `/locket/sendFriendRequestV2` route or `/locket/proxy/sendFriendRequestV2` — pick proxy form for consistency with other friend ops
- `NormalItemFriend` likely has its own "add friend" button — wire same `SendRequestToFriend` handler
- `getAllRequestFriend` looks like a unified incoming+outgoing endpoint that doesn't exist anywhere — most likely dead code; verify with grep, delete if no callers

## Requirements
**Functional**
- Searching a normal username → "Add friend" button → request created → appears in OutgoingRequest list
- Searching a celebrity → existing celebrity flow unchanged
- Accept/reject from IncomingRequests (already wired) still works
- Cancel from OutgoingRequest (already wired) still works

## Architecture
```
FindFriend ──POST /locket/proxy/fetchUserV2 (search)──► user
FindFriend ──POST /locket/proxy/sendFriendRequestV2 (add normal)──► self-hosted ──► Locket
FindFriend ──POST /locket/sendCelebrityRequestV2 (add celebrity)──► self-hosted ──► beta API
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/services/LocketDioServices/RequestServices.js` — fix `SendRequestToFriend` body shape; remove or rewire `getAllRequestFriend`
- `apps/self-hosted/lovekit/src/components/friends/FindFriend.jsx` — call `SendRequestToFriend` for non-celebrity branch
- `apps/self-hosted/lovekit/src/components/friends/NormalItemFriend.jsx` — wire add button to handler if not already

**Read**
- `apps/self-hosted/api/src/controllers/locket.controller.js:351` — `proxyLocket` body forwarding
- `apps/self-hosted/lovekit/src/components/friends/IncomingRequests.jsx`, `OutgoingRequest.jsx` — confirm shape used

## Implementation Steps
1. **Rewrite `SendRequestToFriend`** to use proxy with correct envelope:
   ```js
   export const SendRequestToFriend = async (uid) => {
     try {
       const body = { data: { user_uid: uid } }; // Locket API expects user_uid
       const response = await api.post("/locket/proxy/sendFriendRequestV2", body);
       return response.data?.result?.data;
     } catch (error) {
       console.error("❌ sendFriendRequest error:", error?.response?.data || error.message);
       throw error;
     }
   };
   ```
   Note: confirm `friendUid` vs `user_uid` field with Locket reference (most acceptFriend / removeFriend calls use `user_uid`).
2. **`getAllRequestFriend`**: grep callers — `grep -rn "getAllRequestFriend" lovekit/src`. If no UI consumer, delete the export. If used, point to `/locket/getIncomingFriendRequestsV2`.
3. **FindFriend.handleAddFriend** non-celebrity branch:
   ```js
   } else {
     await SendRequestToFriend(foundUser.uid);
     SonnerSuccess("Đã gửi yêu cầu kết bạn!");
     await handleFindFriend(searchTermFind); // refresh status
   }
   ```
   Update import: `import { FindFriendByUserName, SendRequestToCelebrity, SendRequestToFriend } from "@/services";`
4. **NormalItemFriend.jsx** — verify it accepts `handleAddFriend` prop and renders button. If not, add primary CTA "Kết bạn" wired to the prop.
5. Smoke:
   - Search normal user → "Kết bạn" → toast success → reopen Friends sheet → user appears in OutgoingRequest
   - Cancel from outgoing → toast success → list updates

## Todo List
- [ ] Fix `SendRequestToFriend` body shape + use proxy
- [ ] Audit + remove/rewire `getAllRequestFriend`
- [ ] Wire normal-user add path in `FindFriend`
- [ ] Ensure `NormalItemFriend` renders + invokes add CTA
- [ ] E2E friend-request smoke

## Success Criteria
- Normal user "add" works end-to-end
- New outgoing request appears in OutgoingRequest list within 1 fetch cycle
- No "endpoint not allowed" errors in network log

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Wrong field name (`user_uid` vs `friendUid`) | Med | High | Cross-check with `acceptFriendRequest` (uses `user_uid`) — same envelope shape |
| Phase 01 whitelist not yet shipped | High at start | High | `addBlockedBy: ["1"]` |
| `NormalItemFriend` has incompatible prop names | Low | Med | Read file before editing; conform to existing API |

## Security Considerations
- All calls go through `verifyIdToken` → no new attack surface
- Avoid exposing user uid in logs at info level

## Next Steps
- Document the friend-request envelope shape in code comments to prevent future regression

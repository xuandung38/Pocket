---
phase: 2
title: Backend Frame Library
status: completed
priority: P1
effort: 1d
dependencies: []
---

# Phase 2: Backend Frame Library

## Overview
API per-user CRUD cho khung custom trong service `api` (Firestore-backed, theo pattern friend-request). PNG khung lưu R2 qua `presignedV3` đã có. Độc lập Phase 1.

## Requirements
- Functional: `GET /frames` (**built-in global + custom của user**), `POST /frames` (tạo custom từ R2 url đã upload), `DELETE /frames/:id` (xóa khung custom của mình). Built-in seed sẵn (script).
- Non-functional: chỉ chủ sở hữu thao tác custom (verifyIdToken → `req.user.localId`); không sửa/xóa built-in; cap **50 custom/user**; không cơ chế lưu trữ mới (tái dùng Firestore + R2).

## Architecture
- **Data model** (Firestore): collection `frames`, doc `{ id, scope:"builtin"|"user", ownerUid, name, type:"png"|"polaroid", url, key, order, createdAt }`.
  - **Built-in**: `scope:"builtin"`, `ownerUid:null`, trả cho mọi user. Gồm PNG (url R2) + 1 entry Polaroid (`type:"polaroid"`, không url — client render tham số).
  - **Custom**: `scope:"user"`, `ownerUid:localId`.
- **GET /frames** → merge `scope==builtin` + `scope==user && ownerUid==localId`, sort `order`/`createdAt`.
- **Upload PNG khung custom**: client upload R2 qua `presignedV3` (Phase 3) → `POST /frames {name,url,key}` → BE ghi metadata (không nhận binary). Check cap 50 trước khi ghi.
- **Auth**: `verifyIdToken` → `req.user.localId` = owner.
- **DELETE**: chỉ doc `scope:"user"` của owner; chặn xóa built-in; best-effort xóa R2 object theo `key`.
- **Seed built-in**: script `seed-frames.js` (như `set-r2-cors.js`) — upload PNG mẫu lên R2 + ghi Firestore docs `scope:"builtin"` + tạo entry Polaroid. Chạy 1 lần (`docker compose exec`).
- Mount route: thêm `frame.route.js` + `frame.controller.js`; xác nhận prefix trong `src/routes/index.js`.

## Related Code Files
- Create: `apps/self-hosted/api/src/routes/frame.route.js`, `apps/self-hosted/api/src/controllers/frame.controller.js`, (nếu tách) `apps/self-hosted/api/src/services/frame-store.service.js`, `apps/self-hosted/api/scripts/seed-frames.js` (+ vài PNG mẫu để seed)
- Modify: `apps/self-hosted/api/src/routes/index.js` (mount route)
- Read for context: `apps/self-hosted/api/src/controllers/locket.controller.js` (Firestore friend-request pattern: `getIncomingFriendRequestsV2`/`sendFriendRequest`), `apps/self-hosted/api/src/middlewares/verifyToken.js`, `apps/self-hosted/api/src/controllers/storage.controller.js`

## Implementation Steps
1. Đọc pattern Firestore của friend-request trong `locket.controller.js` → tái dùng cùng helper/SDK ghi-đọc Firestore.
2. `frame.controller.js`: `listFrames` (merge built-in + custom của user), `createFrame` (validate `name/url/key`, check cap 50, ghi doc `scope:"user"`, trả frame), `deleteFrame` (chỉ custom của owner, chặn built-in, best-effort xóa R2).
3. `frame.route.js`: `GET /`, `POST /`, `DELETE /:id` đều qua `verifyIdToken`.
4. Mount trong `routes/index.js` theo prefix đã xác nhận.
5. **Seed built-in**: `apps/self-hosted/api/scripts/seed-frames.js` (hoặc storage) — upload PNG mẫu lên R2 + ghi Firestore `scope:"builtin"` + entry Polaroid. Idempotent.
6. Cap 50 custom/user trong `createFrame`.

## Success Criteria
- [ ] Seed chạy → built-in (PNG + Polaroid) xuất hiện trong `GET /frames` cho mọi user.
- [ ] `GET /frames` trả built-in global + custom của user (không lẫn custom user khác).
- [ ] `POST /frames` ghi doc custom; chặn khi vượt cap 50.
- [ ] `DELETE /frames/:id` chỉ xóa custom của chính mình; chặn xóa built-in + cross-user.
- [ ] Test bằng curl/Firestore: seed → list → tạo → xóa hoạt động.

## Risk Assessment
- **Firestore write access**: xác nhận `api` ghi được collection mới (friend-request đã ghi → khả thi). Mitigation: tái dùng đúng helper friend-request.
- **Owner enforcement**: DELETE/GET phải lọc theo `ownerUid` để tránh rò khung user khác.
- **Mount prefix sai** → 404. Mitigation: đọc `routes/index.js` xác nhận prefix trước.

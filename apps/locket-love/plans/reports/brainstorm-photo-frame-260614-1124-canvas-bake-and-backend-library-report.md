# Brainstorm — Photo Frame Picker (canvas bake + backend library)

**Date:** 2026-06-14 · **App:** locket-love · **Branch:** feat/fix-selfhost
**Status:** design approved, ready for `/ck:plan`

## Problem
Sau khi chụp ảnh, user muốn chọn một **khung (frame)** cho ảnh. Khung phải là một phần của ảnh (hiện ở mọi nơi: feed, Locket thật, tải về). Hỗ trợ khung trang trí PNG, khung Polaroid, và **user tự tạo thư viện khung riêng** quản lý qua backend.

## Requirements (chốt với user)
1. **Output**:
   - Client: UI chọn khung trong màn sau-chụp; module canvas bake khung vào ảnh trước upload (chỉ ảnh); store + UI upload/quản lý khung riêng.
   - Backend: endpoint list khung (built-in + per-user), tạo khung custom từ PNG upload, xóa khung của mình; metadata per-user trong Firestore; tái dùng R2 (`presignedV3`) lưu PNG khung.
   - Kiểu khung: PNG trang trí (vuông, giữa trong suốt), Polaroid (tham số, viền trắng + **bake ngày/caption**), khung user (PNG vuông trong suốt).
2. **Acceptance**:
   - Chụp ảnh → mở picker → chọn khung → preview hiện khung → gửi → ảnh upload đã **bake khung** (hiện ở feed/Locket/tải về).
   - Polaroid bake viền trắng + chữ ngày/caption vào ảnh.
   - User upload PNG vuông trong suốt → vào thư viện riêng → dùng được → persist qua session → xóa được.
   - Video không ảnh hưởng (image-only). Caption overlay cũ vẫn chạy độc lập.
3. **Out of scope**: khung cho video; PNG tỉ lệ bất kỳ; admin UI; crop/edit khung; khung động.
4. **Constraints**: React 18 + Vite + Zustand; tái dùng R2 `presignedV3`; Firestore per-user (giống friend-request); output JPEG; bake bằng client canvas; **không đổi** luồng `uploadFileAndGetInfoR2` / post moment (chỉ thay blob); giữ nguyên hệ caption overlay.
5. **Touchpoints**:
   - Client: `components/captured-send-preview.jsx` (thêm picker), `screens/camera-screen.jsx` (truyền blob đã bake), **mới**: `utils/compose-frame.js`, `stores/use-frame-store.js`, `services/frame-services.js`, component picker khung, assets khung built-in.
   - Backend: **mới** frame routes/controller trong `api` (Firestore-backed); tái dùng `storage` presignedV3 cho upload PNG khung.

## Approaches evaluated
| Approach | Verdict |
|----------|---------|
| **Bake vào ảnh (canvas)** | ✅ CHỌN — khung thành phần của file ảnh, hiện mọi nơi, không cần sửa post-moment backend |
| Overlay display-only (metadata) | ❌ — chỉ hiện trong feed app này, không hiện Locket thật/tải về, phải sửa backend + feed |

## Final solution — 2 concern groups, build cùng lúc
User chọn **làm cả client + backend cùng lúc** (không ship Phase 1 riêng).

### A. Client compositing + picker
- `utils/compose-frame.js`: nhận `(photoBlob, frameSpec)` → vẽ canvas → `toBlob('image/jpeg', ~0.9)` → File mới.
  - **2 mode**: *PNG overlay* (`drawImage(photo)` rồi `drawImage(framePNG)` đè, vuông 1080²); *Polaroid* (canvas dọc, ảnh inset + viền trắng + `fillText` ngày/caption).
- Picker trong `captured-send-preview.jsx`: carousel/sheet (None + Polaroid + PNG built-in + khung user); preview đè CSS lúc chọn, bake lúc gửi (thay `shot.file`).
- `stores/use-frame-store.js` (giống `useOverlayStore`): load khung từ backend, cache.
- UI upload khung riêng: chọn PNG → validate (vuông + có alpha) → upload R2 → gọi backend tạo metadata.

### B. Backend frame library
- `api`: endpoints `GET /frames` (built-in + user), `POST /frames` (tạo từ R2 url), `DELETE /frames/:id`.
- Metadata per-user trong **Firestore** (pattern friend-request đã có).
- Upload PNG khung: tái dùng `storage` presignedV3 → R2 → publicURL → lưu metadata.

## Key technical points
- PNG khung: **giữa trong suốt**, cùng tỉ lệ ảnh (vuông). Built-in PNG + khung user cùng contract.
- Polaroid: render client tham số (không phải PNG), `document.fonts.ready` trước khi `fillText`.
- Caption overlay cũ giữ nguyên (metadata), độc lập khung bake.
- Custom frame + framed-moment đều tái dùng R2 presignedV3 → không cơ chế lưu trữ mới.

## Risks
- **Canvas taint/CORS**: frame PNG từ R2 cần `img.crossOrigin="anonymous"` + R2 CORS GET (đã set `*` GET ✅), nếu không `toBlob` ném lỗi tainted. Built-in bundle = same-origin OK.
- **Polaroid text**: font phải load xong trước khi vẽ (`document.fonts.ready`).
- **Chất lượng/độ phân giải**: downscale capture về 1080²; Polaroid dọc.
- **Validate khung user**: kiểm tra PNG vuông + có alpha trước upload (client) — tránh ghép lệch.
- **Firestore write**: xác nhận `api` ghi được Firestore (friend-request đã ghi → OK).
- **Giới hạn số khung/user**: cân nhắc cap để kiểm soát storage.

## Success metrics
- Đăng ảnh với mỗi loại khung (PNG/Polaroid/custom) → file trên R2 đã có khung bake (mở URL thấy khung).
- Polaroid hiện viền trắng + ngày/caption đúng.
- Upload khung riêng → reload app vẫn còn → dùng + xóa được.
- Không regression: đăng ảnh không khung, video, caption overlay vẫn chạy.

## Open questions
- Built-in PNG khung: bundle trong app (same-origin, tránh CORS) hay seed Firestore/R2? → nghiêng bundle để né taint, xác nhận lúc plan.
- Cap số khung custom mỗi user? (vd 50)
- Polaroid: nguồn "ngày" = thời điểm chụp hay ngày đăng? caption lấy từ ô caption hiện có hay nhập riêng?

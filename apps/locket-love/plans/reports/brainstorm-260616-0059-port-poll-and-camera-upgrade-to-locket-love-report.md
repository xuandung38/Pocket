# Brainstorm — Port `poll-emoji-picker` + `camera-upgrade` vào locket-love

- **Date:** 2026-06-16
- **Nguồn upstream:** `github.com/doi2523/Client-Locket-Dio` (branch `feature/poll-emoji-picker`, `feature/camera-upgrade`)
- **Target:** `apps/locket-love` (React 18 + Vite + Tailwind v4 + zustand)
- **Scope chốt với user:** Port cả 4 nhóm (Poll, Reaction effect, Camera đa-lens + platform detect, Video settings) — làm **song song/gộp chung**.

---

## 1. Bối cảnh & vấn đề

locket-love là bản **viết lại** của Locket-Dio. Upstream dùng monorepo `apps/main/src/...` + **DaisyUI** (`btn`, `btn-primary`, `base-100/base-content/base-200`). locket-love dùng **Tailwind v4 + design riêng** (không DaisyUI), zustand stores, services đặt tên kebab-case.

→ **Không copy-paste được.** Mọi component port phải re-style sang design-system locket-love (class màu, bottom-sheet, token). Logic (state, fetch, vote) tái dùng được.

### Khác biệt cốt lõi: cái gì đã có vs net-new

| Hạng mục | Upstream branch | locket-love hiện có | Net-new cần port |
|---|---|---|---|
| Overlay tách nhỏ (battery/heart/time/weather/location/special...) | poll-emoji-picker refactor | ✅ `src/components/caption-overlay/*` đã tách sẵn | ❌ Bỏ qua (đã có) |
| **Poll overlay + modal** | poll-emoji-picker | ❌ Không có (`grep poll` = rỗng) | ✅ Toàn bộ |
| Quay video (press-hold, torch, zoom) | camera-upgrade | ✅ `camera-screen.jsx` (876 dòng) | ❌ Đã có (chỉ tinh chỉnh) |
| **Reaction float animation** | camera-upgrade | ❌ Có `sendReactMoment` nhưng không có animation | ✅ Store + effect |
| **Camera đa-lens / deviceId / pinch-zoom** | camera-upgrade | ⚠️ Chỉ `facingMode` toggle (user/environment) | ✅ Classification + selection |
| `isIOS/isAndroid` | camera-upgrade | ❌ | ✅ Util nhỏ |
| Video frameRate constraint | camera-upgrade webConfig | ⚠️ chỉ width/height | ✅ Thêm 30fps |

### 🔑 Khớp chữ ký quan trọng (giảm rủi ro)
locket-love đã có `sendReactMoment(emoji, momentId, power = 0)` tại `src/services/moment-services.js:101` → **trùng khớp** lời gọi upstream `SendReactMoment(emoji, momentId, 0)`. Poll-vote và reaction-effect **tái dùng trực tiếp**, không cần viết service mới.

---

## 2. Nhóm A — Poll (overlay + modal + vote)

### Phân tích upstream
- **`PollOverlay`** (`components/Overlay/overlays/PollOverlay.jsx`): render poll 2 emoji trên moment.
  - `pollVariant="owner"` → moment của mình: chỉ hiện số vote (`leftCount`/`rightCount`).
  - `pollVariant="friend"` → moment bạn bè: 2 nút bấm vote; `handleVote(emoji)` → `SendReactMoment(emoji, momentId, 0)` → `triggerReaction(emoji)` (gọi reaction-effect) → toast.
  - Data: `overlayData.payload.{left_emoji,right_emoji}`, default `👍/👎`; `pollCounts.{leftCount,rightCount,isPoll}`.
- **`EmojiPollModal`** (`features/EditorCaption/Modal/EmojiPollModal.jsx`): bottom-sheet portal, 2 tab:
  - "Gợi ý cặp" → 15 cặp emoji (👍/👎, 🔥/❄️, 😂/😢...) → `setPostOverlay({payload:{left_emoji,right_emoji}})`.
  - "Chỉnh lẻ" → 40 emoji đơn → set 1 vế (`activeSide`).
  - Dùng DaisyUI: `btn btn-primary/btn-ghost`, `base-100/base-content/base-300`, `ReactDOM.createPortal`.

### Mapping vào locket-love
| Hành động | File |
|---|---|
| **Tạo** PollOverlay (restyle Tailwind) | `src/components/caption-overlay/poll-overlay.jsx` |
| **Tạo** EmojiPollModal (restyle, theo pattern bottom-sheet hiện có) | `src/components/caption-picker/emoji-poll-modal.jsx` |
| **Sửa** dispatcher: thêm `case "poll": return <PollOverlay .../>` | `src/components/caption-overlay/caption-overlay.jsx:25-48` |
| **Sửa** schema: giữ `payload.{left_emoji,right_emoji}` + nhận type `poll`; thêm `poll` vào comment type list | `src/utils/caption-overlay-schema.js` (`normalizeOverlay`, `defaultOverlay.type`) |
| **Sửa** compose: thêm lựa chọn "Poll" mở modal, set overlay payload | `src/components/caption-picker/caption-picker-sheet.jsx` (+ `frame-section.jsx`) |
| **Sửa** preview render poll khi compose (owner-style, không nút vote) | `src/components/captured-send-preview.jsx` |
| **Sửa** feed: truyền `pollVariant`/`momentId`/`pollCounts` (tính từ `moment.reactions`) cho PollOverlay | `src/screens/feed-screen.jsx:352` |
| **(BE) Tạo** builder poll image + dispatcher `case "poll"` | `apps/self-hosted/api/src/services/LocketPayload/createImagePayload.js` + `LocketMoment/postImageMoment.js` |
| **(BE) Tạo** builder poll video + dispatcher `case "poll"` | `apps/self-hosted/api/src/services/LocketPayload/createVideoPayload.js` + `postVideoMoment` |

> Lưu ý: `payload-services.js` (client) **không cần sửa** — đã passthrough `overlayData.payload` sẵn (dòng 68-69).

### Việc cần làm
1. Định nghĩa overlay-type `poll` trong schema; đảm bảo `normalizeOverlay` mang `payload` từ `moment.overlays.payload` (feed) và từ compose payload.
2. Port `poll-overlay.jsx`: 2 biến thể owner/friend; restyle `bg-white/50 backdrop-blur` (giữ nguyên, không phải DaisyUI) — phần này hầu như Tailwind thuần, ít sửa.
3. Port `emoji-poll-modal.jsx`: remap `btn/btn-primary/base-*` → token locket-love; tái dùng cơ chế animation bottom-sheet sẵn có (xem `caption-picker-sheet`).
4. Thêm entry "Poll" vào compose flow → mở modal → lưu `{left_emoji,right_emoji}` vào overlay state.
5. POST: nhúng poll payload vào moment overlay khi đăng.
6. Feed vote: PollOverlay friend-view gọi `sendReactMoment` + `triggerReaction` (nhóm B).

### ✅ Phụ thuộc backend — ĐÃ XÁC MINH (scout self-hosted API)
- **Frontend compose ĐÃ passthrough payload:** `payload-services.js:68-69` — `...(overlayData.payload && { payload })`. Set `overlayData.payload={left_emoji,right_emoji}` là đủ ở phía client.
- **BE READ ✅ sẵn sàng:** `apps/self-hosted/api/.../getMoment.js:100` `normalizeMoment` trả `payload: parseFirestoreValue(overlayData.payload)` → poll roundtrip khi đọc moment.
- **BE WRITE ⚠️ cần thêm builder:** `postImageMoment.js` dispatch theo `optionsData.type` qua `switch`. Có sẵn `imagePostPayloadWeather` (createImagePayload.js:126) ghi `data.payload:{...}` + `overlay_id:"caption:weather"` → **mẫu có sẵn**. Poll cần: thêm `imagePostPayloadPoll` + `videoPostPayloadPoll` (ghi `data.payload:{left_emoji,right_emoji}`, `overlay_id:"caption:poll"`, `overlay_type:"caption"`) + `case "poll":` trong cả 2 dispatcher (image + video). ~30 dòng BE.
- **Vote count ✅ tính client-side:** `getMoment.js:136-169` query collection-group `reactions` → trả list `{emoji,...}`; feed đã đọc `moment.reactions` (`feed-screen.jsx:267`). Owner-view `pollCounts` = group reactions theo emoji, match `left_emoji`/`right_emoji`. **Không cần endpoint mới.**

### Phân biệt vote vs react thường (đã chốt)
Poll-vote = reaction mang emoji của poll. Count = lọc `moment.reactions` theo `left_emoji`/`right_emoji`; reaction emoji khác = react thường (bỏ qua khi đếm poll). Đúng semantics Locket-native (vote chính là reaction). Không đổi schema. Nhược điểm chấp nhận được: nếu user react trùng emoji với 1 vế poll thì bị tính là vote.

---

## 3. Nhóm B — Reaction effect animation

### Phân tích upstream
- **`useReactionStore`** (zustand): `reaction:{id,reactions[]}`, `triggerReaction(input)` set reaction mới với `crypto.randomUUID()`.
- **`GlobalReactionEffect`** / **`Effects/ReactionEffect`**: lắng nghe store, spawn emoji bay lên (float-up) rồi tự xóa theo `id`.

### Mapping vào locket-love
| Hành động | File |
|---|---|
| **Tạo** reaction store | `src/stores/use-reaction-store.js` + export trong `src/stores/index.js` |
| **Tạo** component float effect | `src/components/ui/global-reaction-effect.jsx` |
| **Sửa** mount global effect | `src/App.jsx` (root) hoặc `feed-screen.jsx` + `camera-screen.jsx` |
| **Sửa** thêm keyframes float-up | `src/index.css` |

### Việc cần làm
1. Port store gần như nguyên trạng (đã là zustand) — chỉ đổi path import.
2. Port effect component: restyle, dùng Tailwind animation hoặc keyframes trong `index.css`.
3. Mount 1 lần ở root để cả feed + camera + poll-vote dùng chung.
4. Nối: poll-vote (nhóm A) và mọi nút react hiện có gọi `triggerReaction(emoji)`.

---

## 4. Nhóm C — Camera đa-lens + platform detect

### Phân tích upstream
- **`getInfoCamera.js`** (`utils/device`): `getAvailableCameras()` →
  - enumerate `videoinput`; nếu thiếu label → `getUserMedia` xin quyền rồi enumerate lại (rồi stop track).
  - `classifyVideoDevices`: regex front/back (vi/en + `camera2 0/1`, `camera1 0/1`), phân loại `backUltraWide/backNormal/backZoom`, fallback khi không match.
- **`onlyIOS.js`**: `isIOS()` (gồm iPadOS giả Mac qua `maxTouchPoints`), `isAndroid()`.
- **`MediaPreview/Android.jsx`** (556 dòng): chọn camera theo **deviceId**, **pinch-to-zoom** (multi-touch), nhãn zoom `0.5x/1x/2x` từ `track.getCapabilities().zoom`, torch detect, progress ring.
- **`MediaPreview/IOS.jsx`** (256 dòng): iOS dùng `facingMode` (không cho chọn deviceId tự do) → nhẹ hơn.
- **`CameraToggle`** tách Android/iOS; **`CameraButton`** transition.

### Kiến trúc: FULL split Android/iOS (đã chốt với user — KHÔNG dùng KISS)
User chọn **tách riêng** như upstream. locket-love hiện là single-screen `camera-screen.jsx` (876 dòng gộp preview + capture + record + upload + UI). Phương án full split:

```
src/screens/camera-screen.jsx              # shell: lifecycle, phase, upload, sheets, nav (giữ)
src/components/camera/
  ├── camera-preview/
  │   ├── index.jsx                         # dispatcher: isIOS() ? <IOS/> : <Android/>
  │   ├── camera-preview-ios.jsx            # facingMode-based (đang chạy tốt)
  │   └── camera-preview-android.jsx        # deviceId enumeration + pinch-zoom + zoom labels
  ├── camera-toggle/
  │   ├── index.jsx                         # dispatcher theo platform
  │   ├── camera-toggle-ios.jsx             # toggle user/environment
  │   └── camera-toggle-android.jsx         # chọn lens theo deviceId (0.5x/1x/2x)
  └── use-camera-capture.js                 # hook DÙNG CHUNG: MediaRecorder, capturePhoto, torch (DRY)
```

### Mapping vào locket-love
| Hành động | File |
|---|---|
| **Tạo** util classify camera | `src/utils/get-available-cameras.js` |
| **Tạo** util platform | `src/utils/is-ios.js` (isIOS/isAndroid) |
| **Tạo** hook capture dùng chung (rút từ camera-screen) | `src/components/camera/use-camera-capture.js` |
| **Tạo** preview dispatcher + iOS + Android | `src/components/camera/camera-preview/*` |
| **Tạo** toggle dispatcher + iOS + Android | `src/components/camera/camera-toggle/*` |
| **Sửa** camera-screen thành shell, delegate preview/capture | `src/screens/camera-screen.jsx` |

### Việc cần làm
1. Port 2 util device (`get-available-cameras`, `is-ios`) — gần nguyên trạng, đổi path import.
2. **Rút logic dùng chung** (MediaRecorder record, capturePhoto, torch capability, compose-frame) ra `use-camera-capture.js` để 2 nhánh platform tái dùng (tránh nhân đôi 876 dòng).
3. **iOS branch:** giữ `facingMode` (hành vi hiện tại); toggle user/environment.
4. **Android branch:** `getAvailableCameras()` → chọn `deviceId`; pinch-to-zoom (port `pinchState` từ upstream Android.jsx); nhãn zoom 0.5x/1x/2x từ `track.getCapabilities().zoom`.
5. `camera-screen.jsx` chỉ giữ shell (phase, upload, sheets, swipe-nav), render `<CameraPreview/>` + `<CameraToggle/>`.

### ⚠️ Rủi ro CAO NHẤT của cả dự án
`camera-screen.jsx` đang **876 dòng, đang chạy được** (torch/zoom/record/upload OK). Full split = đại phẫu file đang hoạt động → dễ regression. Giảm thiểu: tách hook dùng chung trước (giữ behavior), rồi mới split UI; commit nhỏ từng bước; **test bắt buộc trên iOS Safari + Android Chrome thật** (camera là API phụ thuộc thiết bị, không test được đầy đủ trên desktop).

---

## 5. Nhóm D — Video settings tinh chỉnh

### Hiện trạng quay video locket-love — ĐÃ CÓ, khá đầy đủ (scout `camera-screen.jsx`)
Luồng quay video đã hoạt động trong `src/screens/camera-screen.jsx`:
- **Tap-vs-hold:** `handleCaptureDown` (`:377`) đặt timer `VIDEO_HOLD_MS=350ms`; nhấn nhả nhanh → `capturePhoto()` (ảnh), giữ ≥350ms → `startRecording()` (video).
- **`startRecording` (`:326`):** `MediaRecorder` với mime fallback chain: `video/mp4;h264,aac` → `webm;vp9,opus` → `webm;vp8,opus` → `webm`. Constraints có `audio:true`.
- **Thu chunk:** `ondataavailable` → push `recordedChunksRef`; `onstop` → ghép `Blob` → `File` (`.mp4`/`.webm`) → `setShot({type:"video"})` → phase `captured`.
- **Hard cap `MAX_VIDEO_MS=10s`** (`:371`) chống treo pointer-up.
- **Cleanup:** clear timers + stop recorder khi unmount.
- **Fallback gallery:** `openGallery`/`handleGalleryChange` nhận cả video/ảnh khi getUserMedia bị chặn (desktop).
- Phía BE: `createVideoPayload.js` + `postVideoMoment` đã hỗ trợ đăng video moment.

→ **KHÔNG cần viết lại quay video.** camera-upgrade chỉ bổ sung tinh chỉnh nhỏ dưới đây.

### Phân tích upstream (webConfig diff)
- Thêm `frameRate: { ideal: 30, max: 30 }` cho cả `default (1080p)` và `ultraHD (2160p)`.
- `CameraButton` cải thiện transition khi recording.

### Mapping vào locket-love
| Hành động | File |
|---|---|
| **Sửa** thêm `frameRate` vào constraints | `src/screens/camera-screen.jsx:63` (`buildConstraints`) |
| (tùy chọn) tinh chỉnh `MAX_VIDEO_MS` / bitrate MediaRecorder | `src/screens/camera-screen.jsx:60` |

### Việc cần làm
1. Thêm `frameRate: {ideal:30,max:30}` vào `buildConstraints` (ổn định fps khi quay).
2. (Tùy chọn) set `videoBitsPerSecond` cho MediaRecorder để chất lượng nhất quán.

→ Nhỏ, gộp luôn vào nhóm C khi đụng `camera-screen.jsx`.

---

## 6. Thứ tự thực thi (song song/gộp)

Vì user chọn "song song", chia theo **ranh giới file** để không đụng nhau:

- **Track 1 — Reaction (nền tảng, làm trước nhất):** store + effect + mount root. Không đụng file lớn. → Mở khóa poll-vote.
- **Track 2 — Poll:** overlay + modal + schema + compose + feed. Đụng `caption-overlay/*`, `caption-picker/*`, `feed-screen`, `payload-services`. Phụ thuộc Track 1 (triggerReaction).
- **Track 3 — Camera + Video:** util device + rework `camera-screen.jsx` + frameRate. **Cô lập hoàn toàn** ở `camera-screen.jsx` + `src/utils/*` → chạy song song an toàn với Track 1/2.

Gợi ý: Track 1 → (Track 2 ∥ Track 3).

---

## 7. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| DaisyUI → Tailwind restyle sai token (modal, btn) | TB | Bám `caption-picker-sheet.jsx` làm chuẩn bottom-sheet; review UI |
| Rework `camera-screen.jsx` gây regression torch/zoom/record | **Cao** | Nhánh `isIOS()`, giữ nguyên path iOS; test 2 nền tảng; commit nhỏ |
| BE poll write-path chưa có builder | TB | ĐÃ xác minh: thêm `imagePostPayloadPoll`/`videoPostPayloadPoll` + `case "poll"` (mẫu = weather builder) — ~30 dòng |
| Poll vote = reaction → trùng react thường | Thấp | ĐÃ chốt: count gom `moment.reactions` theo left/right emoji; chấp nhận trùng nếu react cùng emoji |
| `crypto.randomUUID` trên HTTP (không HTTPS) | Thấp | Fallback UUID generator (đã có sẵn trong moment-services) |

---

## 8. Success criteria

- **Poll:** compose chọn cặp emoji → đăng → moment hiện PollOverlay; bạn bè bấm vote → reaction gửi thành công + emoji bay; chủ moment thấy số vote (nếu BE hỗ trợ).
- **Reaction:** mọi react (poll + nút react sẵn có) phát animation float ổn định, tự dọn.
- **Camera:** Android chọn được lens (0.5x/1x/2x) + pinch-zoom; iOS giữ nguyên hành vi; video quay ổn định 30fps; torch/record không regression.
- **Không vỡ test hiện có** (`vitest`), không lỗi compile/build.

---

## 9. Open questions — ĐÃ GIẢI QUYẾT (scout 2026-06-16)

1. ~~BE poll support?~~ **Resolved:** READ ✅ sẵn (`getMoment.js:100` trả `overlays.payload`); WRITE ⚠️ thêm builder poll (~30 dòng, mẫu weather); vote count ✅ tính client-side từ `moment.reactions`. Owner-view **hiển thị số đếm** được.
2. ~~Vote vs react?~~ **Resolved:** vote = reaction emoji của poll; count gom theo left/right emoji; không đổi schema.
3. ~~Camera KISS hay full split?~~ **Resolved:** user chọn **FULL split** Android/iOS (xem §4 kiến trúc mới).
4. ~~Quay video đã có chưa?~~ **Resolved:** ĐÃ CÓ đầy đủ (MediaRecorder + press-hold + mime fallback + 10s cap), xem §5. Chỉ thêm frameRate 30fps.

### Còn lại (không chặn plan)
- **2 branch khác** (`feature/background-image-support`, `feature/group-chat`) — chưa đưa vào scope; cân nhắc roadmap sau.
- **Locket-native poll `overlay_id`/`overlay_type` chính xác:** dùng `caption:poll` theo convention hiện tại; nếu Locket gốc dùng id khác (vd `poll`), cần verify khi test thật để overlay hiển thị đúng trên app Locket chính thức.

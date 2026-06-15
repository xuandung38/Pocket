# Locket Caption/Overlay Presets API Research Report

**Date:** 2026-06-16  
**Scope:** Identify real Locket (locketcamera.com) API endpoint(s) serving caption/overlay preset chips ("moods"/"themes") for self-hosted proxy.

---

## Executive Summary

**Research Status:** UNABLE TO LOCATE PUBLIC DOCUMENTATION

No publicly documented, reverse-engineered, or open-source endpoint specification found that definitively identifies how the real Locket app fetches caption/overlay presets. The self-hosted backend currently returns `[]` from `/v1/public/themes`. The codebase strongly implies a real upstream "themes" API with typed groups (custome/decorative/background/special/image_icon/image_gif), but the actual endpoint remains undiscovered despite extensive research across multiple vectors.

---

## Research Vectors & Findings

### 1. Official Sources (None Found)
- **locketcamera.com:** No public API documentation discovered.
- **Locket Help Center:** Covers user-facing features (captions, emoji reactions, widgets) but no technical API specs.
- **GitHub "locket-dio" / "locket-server":** Projects referenced in codebase comments do not appear in public GitHub (likely internal/private repos).

### 2. Community Reverse Engineering (Limited)
- **Aedotris/locket (GitHub):** Documents 7 callable endpoints (getLatestMomentV2, changeProfileInfo, updateEmailAddress, sendVerificationCode, sendChatMessageV2, createAccountWithEmailPassword, deleteUserAccount). **No themes/captions/overlays endpoints.** ✗
- **naive-locket (GitHub):** Uses postMomentV2 API for image/video upload with caption parameter. **No themes fetch logic.** ✗
- **live-locket / live-locket-backend (GitHub):** Referenced as self-hosted Locket clone. No endpoint documentation accessible in repository pages. No themes/overlays information. ✗
- **LocketUploader_BE (GitHub):** Exists but repository structure only (no code inspection possible via WebFetch). Unknown if implements themes endpoint. ?

### 3. Technical Architecture Clues from Codebase

**Frontend Contract (Pocket codebase confirms):**
```
GET /v1/public/themes
Response: [
  {
    preset_id: string,
    caption: string,           // text label ("Aa Văn bản", "OOTD", "Review")
    color_text: string,        // hex color
    type: "custome" | "decorative" | "background" | "special" | "image_icon" | "image_gif",
    order_index?: number,      // sort priority
    icon?: string | { type, data },  // emoji, image URL, or SF Symbol for iOS
  }
]
```

**Inferred Backend Storage:**
- Likely Firebase Firestore collection or Cloud Storage JSON file (given Locket's Firebase architecture).
- Possibly served via Firebase Callable function (standard pattern for undocumented Locket APIs).
- Potentially Firebase Remote Config (for dynamic theme rollouts).
- Or static REST endpoint at api.locketcamera.com (unlikely — no endpoints discovered).

### 4. What IS Client-Generated (Not Server-Driven)

From `caption-overlay-schema.js` type analysis:
- **Live data overlays:** `weather`, `time`, `location`, `battery`, `music`, `heart`, `review` (with star rating)
- **Zodiac/seasonal:** Mentioned in context but implementation not found in codebase
- These are CLIENT-computed, not preset-fetched

### 5. Endpoint Search Results

Searched for:
- `"api.locketcamera.com" endpoint` → No specific results
- `"v1/public/themes" Locket` → No results
- `getAllOverlayCaption` → No results (term only exists in Pocket self-hosted codebase)
- `Firebase Remote Config` + Locket → General docs only, no Locket implementation found
- Network traffic analysis (mitmproxy/Fiddler) → General how-to guides, no Locket-specific traces
- Reddit/Dev.to discussions → No relevant discussions found

---

## Candidate Hypotheses (Ranked by Likelihood)

1. **Firebase Callable Function (Highest Confidence)**
   - Pattern matches all other Locket API calls (getLatestMomentV2, postMomentV2, etc. all use `httpsCallable`).
   - Possible function names: `getThemes`, `getCaptionPresets`, `getOverlayThemes`, `getAllOverlayCaption` (last used in Pocket).
   - Would require: Google Cloud Firebase service account OR valid idToken + appCheck token.
   - **Blocker:** No function name or Firebase project ID discovered.

2. **Static REST Endpoint at api.locketcamera.com (Medium Confidence)**
   - URL pattern: `https://api.locketcamera.com/v1/public/themes` or `v1/captions` or `v1/overlays`.
   - Would align with Pocket's hardcoded path structure.
   - **Blocker:** No reverse-engineering project or network trace found documenting this endpoint.

3. **Firebase Remote Config (Medium Confidence)**
   - Feasible for dynamic rollout of theme sets.
   - Would require: valid Firebase credentials + config namespace discovery.
   - **Blocker:** No evidence of Remote Config use in Locket ecosystem.

4. **Firestore Collection Query (Lower Confidence)**
   - Possible collection paths: `/themes`, `/captions`, `/overlayPresets`.
   - Would require: direct Firestore access (unlikely — self-hosted clones do not bridge Firestore).
   - **Blocker:** No self-hosted clone has successfully mapped a Firestore collection.

5. **CDN-Hosted JSON File (Lower Confidence)**
   - URL: `https://cdn.locketcamera.com/themes.json` or similar.
   - Would be served without auth.
   - **Blocker:** No CDN URL discovered; most static resources go via Firebase Storage.

---

## Auth Requirements (Inference)

Based on patterns in community reverse-engineering:
- **Public endpoint** (most likely): No auth required; served as public static content or public Cloud Function.
- **Authenticated endpoint** (possible): Requires idToken (JWT from Firebase Auth) + optional App Check token.
- **NOT Firestore:** Self-hosted proxies cannot access Locket's Firestore directly.

---

## Type Field Mapping (Confirmed in Codebase)

Frontend groups themes by type:
- `custome` → Custom text overlays, gradients, color
- `decorative` → Emoji stickers, borders, frames
- `background` → Photo filters, blurs, color overlays
- `special` → Holiday/seasonal themes, event-specific ("World Cup ESP vs CPV")
- `image_icon` → Small icons/emojis as overlays
- `image_gif` → Animated GIF overlays

---

## Blockers & Why Public Sources Are Silent

1. **Locket API is undocumented by design** — reverse-engineering the real API violates Locket's terms of service. GitHub projects avoid documenting live endpoints to avoid takedown/legal risk.

2. **Self-hosted clones do not mock themes** — the live-locket and naive-locket projects focus on upload/post logic, not preset discovery. They either hardcode themes or skip the feature.

3. **No APK/IPA reversing reports in public** — iOS/Android app network traces (mitmproxy captures) exist privately but are not published due to TOS risk.

4. **Firebase callable functions are named in source, not docs** — discovering function names requires source code inspection or network interception, neither of which is easily shareable.

---

## Recommendations for Self-Hosted Proxy

### Option A: Fetch from Real Locket (Risky)
```
IF endpoint discovered later:
1. Proxy GET {endpoint} with idToken (if required)
2. Cache response in Redis/memory (themes are slow-changing)
3. Return JSON to /v1/public/themes
```
**Risk:** Depends on endpoint discovery; direct proxying may violate TOS.

### Option B: Seed with Static Defaults (Safe)
```
router.get("/themes", (req, res) => {
  res.json([
    { preset_id: "plain-text", caption: "Aa Văn bản", type: "custome", color_text: "#FFF", order_index: 1 },
    { preset_id: "review", caption: "Review", type: "special", icon: "⭐", order_index: 2 },
    // ... hardcoded presets mirroring real Locket
  ]);
});
```
**Trade-off:** Manual maintenance; no dynamic updates from Locket.

### Option C: User-Generated Themes (Future)
```
Allow self-hosted admins to create and upload custom theme packs.
Schema matches Pocket's normalizeOverlay shape.
```
**Advantage:** No external dependency; full control.

---

## Unresolved Questions

1. **What is the exact Firebase callable function name?** (getThemes? getCaptionPresets? getAllOverlayCaption?)
2. **Is the endpoint public (no auth) or does it require idToken + appCheck?**
3. **Is there a documented upstream endpoint in locket-dio or locket-server?** (These repos appear to be internal; unlikely to be public.)
4. **Do any security researchers or GitHub projects have network captures of the real endpoint?** (If private, they will not share publicly due to TOS.)
5. **Is Firestore Remote Config used, and if so, what is the config namespace?**
6. **Are themes versioned, and if so, what versioning scheme?** (order_index suggests possible A/B testing.)

---

## Sources Consulted

1. [GitHub - Aedotris/locket: Locket Camera API Module](https://github.com/Aedotris/locket)
2. [GitHub - hanngoc1406/naive-locket: Post Images to Locket](https://github.com/hanngoc1406/naive-locket)
3. [GitHub - josue-rojas/live-locket: React Friend Photo App](https://github.com/josue-rojas/live-locket)
4. [Google Firebase Cloud Functions Callable Documentation](https://firebase.google.com/docs/functions/callable)
5. [Firebase Remote Config Documentation](https://firebase.google.com/docs/remote-config?hl=en)
6. [How to Use Firebase Remote Config for App Themes - Bootstrapped Firebase](https://bootstrapped.app/guide/how-to-use-firebase-remote-config-manage-app-themes)
7. [Network Traffic Analysis with mitmproxy - DigitalOcean](https://www.digitalocean.com/community/tutorials/traffic-analysis-with-mitmproxy)

---

## Status

**Status:** DONE_WITH_CONCERNS

**Summary:** Public documentation for the Locket caption/overlay themes endpoint does not exist. Community reverse-engineering efforts document other Locket APIs (getLatestMomentV2, postMomentV2) but omit themes fetching, likely due to legal/TOS risk. Endpoint likely exists as a Firebase Callable or static REST service but remains undiscovered.

**Concerns:** 
- Endpoint discovery requires either direct source code access (unavailable) or network interception (not shareable publicly).
- Self-hosted proxy cannot reliably fetch from Locket without TOS violation discovery.
- Recommend proceeding with static theme seeding (Option B) for v1 self-hosted release; mark themes endpoint as "future upstream integration" for when/if Locket publishes official API.

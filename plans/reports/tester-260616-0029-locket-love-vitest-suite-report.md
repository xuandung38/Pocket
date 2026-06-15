# Test Suite Report — locket-love vitest run
**Date:** 2026-06-16  
**Suite:** apps/locket-love (Vitest + jsdom)  
**Duration:** ~900ms total  

---

## Test Results Overview

| Metric | Count |
|--------|-------|
| **Total Test Suites** | 26 |
| **Passed Suites** | 26 (100%) |
| **Failed Suites** | 0 |
| **Total Tests** | 50 |
| **Passed Tests** | 50 (100%) |
| **Failed Tests** | 0 |
| **Skipped/Pending** | 0 |

---

## Test Breakdown by File

### Hooks (2 tests)
- **use-battery.test.js** (2 tests, PASS)
  - `returns level as 0-100 int and charging bool when Battery API is available`
  - `returns level null and supported false when getBattery is not available`

### Services (6 tests)
- **get-latest-moment.test.js** (2 tests, PASS)
  - `POSTs to getLatestMomentV2 with fetch_streak and returns result`
  - `returns null (best-effort) when the request throws`

- **music-services.test.js** (2 tests, PASS)
  - `POSTs to /api/getInfoMusic with { url, platform } and returns the data`
  - `returns null when the backend response has no data`

- **weather-services.test.js** (3 tests, PASS)
  - `POSTs to /api/weatherV2 with lat/lon and returns the current weather object`
  - `returns null when the response data has no current field`
  - `propagates network errors so the hook can surface them to the user`

### Screens (4 tests)
- **memories-screen.test.jsx** (4 tests, PASS)
  - `calls loadMemories on mount`
  - `renders a photo cell for a day with moments and navigates on click`
  - `shows the streak count in stats`
  - `renders an empty state when there are no moments`

### Stores (9 tests)
- **use-memories-store.test.js** (9 tests, PASS)
  - `selectMemoriesByDate groups own moments by local YYYY-MM-DD, newest first within a day`
  - `loadMemories (SWR) first load fetches own moments + streak and persists to localStorage`
  - `loadMemories (SWR) hydrates from cache synchronously before the network resolves`
  - `loadMemories (SWR) no-ops moments reference when the id-set is unchanged`
  - `loadMemories (SWR) does not wipe the cache on a transient empty response`
  - `loadMemories (SWR) merges the recent window into older moments without losing the cursor`
  - `loadMoreOlder merges older moments and keeps existing ones`
  - `loadMoreOlder bails when there is no syncToken`
  - `clear resets state and removes the cache`

### Utils (10 tests)
- **caption-overlay-schema.test.js** (10 tests, PASS)
  - `returns the default shape for empty/invalid input`
  - `keeps gradient fields from a flat optionsData shape`
  - `maps the web preset shape (preset_id, color_text) onto canonical keys`
  - `flattens the feed moment.overlays shape (background.colors, textColor, icon map)`
  - `preserves polymorphic icon values (review rating number, battery bool)`
  - `passes per-type extras (weatherData, payload, music) straight through`
  - `derives a unique overlay_id for id-less presets (picker selection key)`
  - `recovers the real widget type from the backend caption:<subtype> overlay_id`
  - `drops SF-symbol icons (iOS glyph names) so they never render as text`
  - `does not mutate the shared defaultOverlay constant`

### Components (19 tests)
- **caption-overlay/__tests__/caption-overlay.test.jsx** (5 tests, PASS)
  - `renders the caption text for a default overlay`
  - `renders a linear-gradient background for a custome overlay`
  - `renders an <img> icon + caption for image_icon`
  - `renders the snow effect node for a special overlay`
  - `falls back to a gradient chip for an unknown type without crashing`

- **caption-overlay/__tests__/live-overlays.test.jsx** (7 tests, PASS)
  - `weather: renders the weather icon <img> with https: prefix and temperature caption`
  - `weather: also renders the icon from the feed \`payload\` shape (round-trip)`
  - `battery: renders percentage text (caption + %)`
  - `time: renders the time string from overlay.caption`
  - `review: renders 4 filled stars and 1 empty star for rating 4`
  - `heart: renders the heart icon node`
  - `location: renders the address caption text`

- **caption-overlay/__tests__/music-overlay.test.jsx** (1 test, PASS)
  - `renders the cover image, title and a marquee node`

- **caption-picker/__tests__/caption-picker-sheet.test.jsx** (5 tests, PASS)
  - `renders a Themes section and forwards a flat overlay object on pick`
  - `hides sections whose overlay group is empty`
  - `renders a snow preview node for a special preset`
  - `toOverlayData (POST-mapping bug regression) projects a selected overlay onto the flat optionsData fields the BE reads`
  - `toOverlayData (POST-mapping bug regression) returns an empty object for no overlay (plain message slot)`

---

## Coverage Analysis

**Recent Changes (current branch feat/fix-selfhost):**
- `src/App.jsx` — No direct tests found (UI component)
- `src/components/ui/bottom-nav.jsx` — **No tests exist** (new/modified UI component)
- `src/screens/camera-screen.jsx` — **No tests exist** (modified screen component)
- `src/screens/feed-screen.jsx` — **No tests exist** (modified screen component)

**Existing Test Coverage:**
- Overlay/caption system: **Well tested** (19 tests across 4 files)
- Memory/store logic: **Well tested** (9 tests)
- Services (weather, music, moment fetch): **Well tested** (6 tests)
- UI components for caption picker/overlay: **Well tested**
- Screen-level logic (memories-screen): **Covered** (4 tests, but feed-screen has no tests)

---

## Key Findings

### ✅ No Regressions Detected
All 50 existing tests pass. Zero failures. The test suite successfully validates:
- Data normalization & schema validation (overlays, moments)
- SWR caching & hydration logic
- Service layer API calls & error handling
- Component rendering for caption system
- State management (zustand store)

### ⚠️ Limited Coverage for Changed Screens
The modified files (`bottom-nav.jsx`, `feed-screen.jsx`, `camera-screen.jsx`) have no dedicated tests. Regressions in these UI-only changes **will not be caught by the automated suite**. However:
- Changes appear to be **bottom navigation & share sheet UI additions** (no critical business logic)
- Existing test suite validates underlying data services & overlay system
- Manual testing or e2e tests recommended before production release

### Note on Architecture
- Test setup uses jsdom (no real DOM, no browser)
- Tests focus on: data/state logic, service calls, component rendering (snapshot-like)
- CSS processing disabled (`css: false` in vite.config.js) — safe for jsdom context

---

## Recommendations

1. **Pre-release:** Manual QA on bottom-nav share interactions (UI-only, no automated coverage)
2. **Future:** Consider adding tests for screen-level components (feed-screen.jsx, camera-screen.jsx) if they gain business logic
3. **Coverage baseline:** Current suite validates critical path (data, services, overlays). UI-only changes pose minimal risk to existing functionality

---

## Test Execution Details

- **Runner:** Vitest (via `npx vitest run`)
- **Environment:** jsdom
- **Config:** vite.config.js (test section)
- **Setup:** src/test/setup.js
- **Run Time:** ~900ms
- **Snapshot Tests:** 0 (none in suite)

---

**Status:** DONE  
**Summary:** All 50 tests pass; no regressions detected. Changed UI screens lack test coverage but pose minimal risk to existing data/service logic.

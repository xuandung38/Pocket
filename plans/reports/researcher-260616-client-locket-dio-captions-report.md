# Client Locket Dio - Captions & Overlay Presets Investigation

**Date:** 2026-06-16  
**Repository:** https://github.com/doi2523/Client-Locket-Dio  
**Investigation Focus:** Caption/overlay/theme preset data sources, object shapes, and client-side implementation

---

## 1. Caption/Overlay/Theme Preset Data Source

### Primary Fetch Endpoint
**API Structure:** Fully API-driven; no hardcoded caption presets in client.

- **Function:** `getAllOverlayCaptionV2()` in `apps/main/src/services/ExtensionsServices/FetchDataServices.js`
- **Endpoint Path:** `v1/public/getAllOverlaysV2`
- **HTTP Instance:** `instanceBaseData` (data API endpoint)
- **Base URL Environment Variable:** `VITE_DATA_API_URL=https://data.locket-dio.com` (from `.env.example`)
- **Full URL Pattern:** `https://data.locket-dio.com/v1/public/getAllOverlaysV2`
- **Method:** GET
- **Response:** Array of section objects containing categorized captions

### Alternative Older Endpoint
- **Older function:** `getAllOverlayCaption()` uses `PUBLIC_API.themes` → `v1/public/themes`
- **Status:** Appears deprecated in favor of V2

### Store Implementation
**File:** `apps/main/src/stores/OverlayStores/useOverlayDataStore.js`
- Fetches via `getAllOverlayCaptionV2()`
- Stores in `sectionOverlays` array (grouped by sections)
- Caches in `sessionStorage` to avoid redundant calls
- Applies time-window filtering:
  - Absolute windows: `start_timestamp`, `end_timestamp`
  - Daily windows: `daily_start_hour`, `daily_end_hour`
  - Function: `isOverlayActive()` determines visibility

---

## 2. Overlay Object Shape (Data Structure)

### Core Fields (from Editor Store)
**File:** `apps/main/src/stores/PostStores/useOverlayEditorStore.js`

```javascript
defaultPostOverlay {
  overlay_id,        // unique identifier for the preset
  text,              // caption text content
  caption,           // alternative caption text field (interchangeable with text)
  text_color,        // hex color for text (e.g., "#FFFFFF")
  icon,              // URL or emoji icon to prefix caption
  type,              // overlay type (see types list below)
  background,        // gradient colors array or image
  payload,           // additional data (e.g., cloud_cover for weather)
  color_top,         // gradient top color (hex)
  color_bottom       // gradient bottom color (hex)
}
```

### Extended User Caption Fields
**File:** `apps/main/src/stores/OverlayStores/useUserCaptionStore.js`
Normalized caption includes:
```javascript
{
  id,
  overlay_id,
  text,
  text_color,
  caption,
  background,        // colors array OR background_image_url
  icon,              // URL-based icon
  type,
  is_editable,       // boolean
  active,            // boolean
  source,            // origin marker
  order_id,          // display order
  color_top,
  color_bottom,
  background_image_url  // newer format
}
```

### Self-Hosted Web Default
**File:** `apps/self-hosted/web/src/stores/postStore/defaultOverlay.js`
```javascript
{
  overlay_id: "standard",
  color_top: "",
  color_bottom: "",
  text_color: "#FFFFFF",
  icon: "",
  caption: "",
  type: "default"
}
```

---

## 3. Overlay Type Values Supported

### Full Type List (from EditorCaption/index.jsx)
Client renders overlay types via `renderOverlay()` switch statement:

1. **Image/Icon Types:**
   - `image_icon` → ImageIcon component
   - `image_gif` → GIF image component
   - `caption_gif` → GIF caption variant
   - `caption_image` → Image caption variant
   - `star_sign` → Zodiac/astrology themed

2. **Live Data Types:**
   - `weather` → WeatherOverlay (real-time weather)
   - `location` → LocationOverlay (GPS-based)
   - `music` → MusicOverlay (Spotify/Apple Music)
   - `time` → TimeOverlay (system clock)
   - `battery` → BatteryOverlay (device battery %)
   - `heart` → HeartOverlay (special effect)
   - `streak` → StreakOverlay (streak counter with flame emoji)

3. **Content/Preset Types:**
   - `decorative` → DecorativeOverlay (API-provided presets)
   - `template` → TemplateOverlay (layout template)
   - `special` → SpecialOverlay (featured/seasonal themes)
   - `review` → ReviewOverlay (star rating)
   - `poll` → PollOverlay (emoji poll)
   - `default` → DefaultOverlay (text input)
   - `custom` → CustomOverlay (fallback for unknowns)
   - `color_palette` → ColorPaletteOverlay (color picker)

### Self-Hosted API Grouping
**File:** `apps/self-hosted/web/src/stores/useOverlayStore.js`
API response organizes by category property:
- `decorative` (section name for decorative type)
- `custome` (custom presets)
- `background` (gradient/background themes)
- `image_icon` (icon-based captions)
- `image_gif` (animated GIF captions)
- `special` (seasonal/featured presets)

---

## 4. Hardcoded Caption Presets in Client

### NONE FOUND in Production Code

The Client-Locket-Dio **does not include hardcoded caption presets**. All captions are:
1. Fetched from API (`v1/public/getAllOverlaysV2`)
2. User-created and stored in localStorage (`Yourcaptions` key)

### Hardcoded System Captions (Live Generators)
**File:** `apps/self-hosted/web/src/pages/LocketCameraBeta/ModalViews/CustomeStudio/CaptionItems/GeneralThemes.jsx`

The following system caption **types** are hardcoded as always-available (not instances but type definitions):
1. **Default** — Text input field (`<CaptionInput />`)
2. **Music (Spotify)** — Music player integration
3. **Music (Apple)** — Apple Music integration
4. **Review** — 5-star rating selector
5. **Time** — Digital clock display (formatted time)
6. **Weather** — Weather API integration with temperature
7. **Battery** — Device battery percentage
8. **Location** — GPS location with address autocomplete

**No color values, icon URLs, or text presets are hardcoded for these.** They're feature toggles that generate captions dynamically from system state.

### Special Captions (API-Driven)
**File:** `apps/self-hosted/web/src/pages/LocketCameraBeta/ModalViews/CustomeStudio/CaptionItems/SpecialCaption.jsx`
Receives `presets` prop from store; displays API data dynamically.
Expected structure per component:
```javascript
{
  preset_id,
  icon,            // emoji or SVG URL
  color_top,       // hex gradient start
  color_bottom,    // hex gradient end
  preset_caption,  // display name
  text_color,      // hex
  type: "special"
}
```

No hardcoded list; all from `captionOverlays.special` in store.

### Emoji Constants
**File:** `apps/main/src/constants/emojis.js`
Exports `allEmojis` array with 110 emojis in 10 categories:
- Love & Heart (21)
- Faces (20)
- Action (10)
- Fun & Fire (10)
- Animals (10)
- Food (10)
- Objects (10)
- Nature (10)
- Symbols (10)

Used for caption icon selection, not preset captions.

---

## 5. Live/System Caption Implementation (Client-Side)

### Weather Caption
**Component:** `apps/main/src/features/EditorCaption/components/WeatherOverlay.jsx`
- **Data Source:** Passed via `postOverlay` prop (computed elsewhere)
- **Display Fields:**
  - `postOverlay.icon` → weather icon (via IconRenderer)
  - `postOverlay.text` or `postOverlay.caption` → temperature/condition
  - `postOverlay.payload.cloud_cover` → cloud overlay opacity
- **Origin:** Data fetched by parent; component is presentation-only
- **Service File:** `apps/main/src/services/ExtensionsServices/WeatherServices.js` (likely computes weather)

### Time Caption
**Component:** `apps/main/src/features/EditorCaption/components/TimeOverlay.jsx`
- **Data Source:** `formattedTime` prop (pre-formatted)
- **Display:** `postOverlay.caption || formattedTime`
- **Computation:** Occurs in parent component (not in TimeOverlay itself)
- **Library:** Not visible in component; likely `dayjs`, `moment`, or native `Date`

### Streak Caption
**Component:** `apps/main/src/features/EditorCaption/components/StreakOverlay.jsx`
- **Data Source:** `postOverlay.text` passed as prop
- **Visual:** Flame emoji `🔥` + text from `postOverlay.text`
- **Colors:** `postOverlay.text_color` and `postOverlay.background`
- **Computation:** **NOT in this component**
  - Actual streak calculation (date → count) happens in parent or service
  - StreakOverlay only renders; does not compute

### Location Caption
**Component:** `apps/main/src/features/EditorCaption/components/LocationOverlay.jsx`
- **Data Source:** `postOverlay.text` (address string)
- **Display:** Address text + location icon
- **Computation:** Parent computes; component displays only

### Music Caption
**Component:** `apps/main/src/features/EditorCaption/components/MusicOverlay.jsx`
- **Data Source:** `postOverlay.payload` contains track metadata
- **Display:** Artist name, track name, platform icon
- **Service:** `apps/main/src/services/ExtensionsServices/MusicServices.js`

### Battery Caption
**Component:** `apps/main/src/features/EditorCaption/components/BatteryOverlay.jsx`
- **Data Source:** `postOverlay.text` (percentage)
- **Computation:** Likely from `navigator.getBattery()` or equivalent
- **Service:** Possibly in `BrowserServices`

---

## 6. Zodiac & Streak Implementation

### Zodiac (Astrology) Implementation
**Status:** NOT FOUND in main codebase

Evidence:
- Overlay type `star_sign` exists (defined in EditorCaption/index.jsx)
- Image file `apps/main/public/images/star_sign_background.png` exists
- **NO zodiac calculation function or zodiac→date mapping found**
- No zodiac constant list in `src/constants/`
- No zodiac service in `ExtensionsServices/`

**Likely Implementation:**
1. API returns `type: "star_sign"` overlay preset with precomputed zodiac icon/name
2. Client renders via `star_sign` case in switch statement
3. No date-to-zodiac computation in client; passed from API

### Streak Implementation
**Status:** PARTIALLY FOUND

**Computation Location:** Unknown (needs further search)
- `StreakOverlay` component exists but only renders
- Receives `postOverlay.text` (already formatted)
- Parent component must compute: last contact date → consecutive days → format

**Expected Logic:**
```
Date of last moment sent → days elapsed → streak count
```

**No streak service file located yet.** Likely in:
- `apps/main/src/services/ExtensionsServices/` (not fully scanned)
- `apps/main/src/pages/LocketCameraBeta/` (parent component logic)
- API returns precomputed streak in moment payload

---

## 7. Caption Organization in UI

**File:** `apps/self-hosted/web/src/pages/LocketCameraBeta/ModalViews/CustomeStudio/index.jsx`

Tabs/Sections displayed to user:
1. **General Themes** (8 types: Default, Music×2, Review, Time, Weather, Battery, Location)
2. **Suggested Themes** (API: `captionOverlays.background`)
3. **Special Captions** (API: `captionOverlays.special`, feature-gated)
4. **Decorative by Locket** (API: `captionOverlays.decorative`)
5. **Decorative by Dio** (API: `captionOverlays.custome`)
6. **Caption Icons** (Early access, feature-gated)
7. **Caption GIF** (Early access, feature-gated)
8. **Saved Captions** (Local: `userCaptions` from store)
9. **Image Captions** (Early access, feature-gated)
10. **Caption Logos** (Placeholder, "Coming Soon")

---

## 8. Summary: Data Flow

```
App Start
  ↓
  fetchCaptionOverlays() [App.jsx useEffect]
  ↓
  GET https://data.locket-dio.com/v1/public/getAllOverlaysV2
  ↓
  Response: { sectionOverlays: [ {title, items: [...]} ] }
  ↓
  Store in useOverlayDataStore
  ↓
  useOverlayStore merges API data:
    - captionOverlays.background
    - captionOverlays.special
    - captionOverlays.decorative
    - captionOverlays.custome
    - captionOverlays.image_icon
    - captionOverlays.image_gif
  ↓
  User selects caption in CustomeStudio
  ↓
  System captions (Weather/Time/Streak/Location/Music/Battery)
    are generated dynamically at render time
  ↓
  Editor renders caption with postOverlay data
```

---

## 9. Key Findings for Self-Hosted Replication

### For Backend (`/v1/public/getAllOverlaysV2`)

**Stub Response Shape:**
```javascript
{
  "data": [
    {
      "section_id": "general",
      "title": "Suggested Themes",
      "items": [
        {
          "overlay_id": "theme_1",
          "type": "background",
          "caption": "Sunset",
          "text_color": "#FFFFFF",
          "color_top": "#FF6B35",
          "color_bottom": "#F7931E",
          "icon": "🌅",
          "order_index": 1,
          "start_timestamp": null,
          "end_timestamp": null,
          "daily_start_hour": null,
          "daily_end_hour": null
        }
        // ... more items
      ]
    }
    // ... more sections: decorative, special, custome, image_icon, image_gif
  ]
}
```

### For Frontend Implementation

1. **Zodiac caption:** Need to add date-to-zodiac calculation (client-side or API-side)
2. **Streak caption:** Needs computation logic (days since last sent moment)
3. **Live captions (Weather/Time/Location/Music/Battery):** Already have system-level implementations; just need data plumbing
4. **Preset captions:** Pull from API `v1/public/getAllOverlaysV2` endpoint

---

## Unresolved Questions

1. **Where is streak count computed?** (days since last moment)
   - Check `apps/main/src/pages/LocketCameraBeta/` parent components for state management
   - Check `PostMoments.js` or `ActionMoments.js` for last-moment timestamp logic

2. **How does zodiac date→sign mapping work?**
   - Is it computed client-side (missing from scanned files)?
   - Or API-computed and returned as preset?

3. **What is the complete real API response shape from `v1/public/getAllOverlaysV2`?**
   - Can only infer from client code; need actual API response or Dio's backend code

4. **How are time/weather/location data sources integrated?**
   - WeatherServices.js likely uses OpenWeather or similar; not fully examined
   - Music service integrates Spotify API; not fully examined
   - Battery uses browser API; location uses Geolocation API; time uses system clock

5. **Do feature gates (early access captions) gate by user role or by date?**
   - `useFeatureVisible()` hook used; implementation not examined

---

**Status:** DONE  
**Report File:** `/Volumes/DATA/Develop/tools/Pocket/plans/reports/researcher-260616-client-locket-dio-captions-report.md`

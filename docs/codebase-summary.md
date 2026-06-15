# Codebase Summary - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

## Repository Overview

Monorepo containing the Locket Dio PWA and self-hosted backend services. All code is JavaScript (ES6+), no TypeScript.

**Root Level:**
- `apps/` — Three applications (main PWA, self-hosted API, self-hosted web, storage service)
- `.repomixignore` — Repomix exclusion patterns
- `package.json` — Workspace root dependencies
- `vercel.json` — Vercel deployment config
- `README.md` — Project introduction (Vietnamese)

**Key Branches:**
- `main` — Stable, deployed to Vercel & Firebase
- `feat/fix-selfhost` — Active branch fixing self-hosted deployment issues

---

## App Structure

### 1. Main App (`apps/main/`)

**Type:** Public-facing React PWA  
**Deploy:** Vercel + Firebase Hosting  
**URL:** http://localhost:5173  
**Node Version:** 20+  

**Source Directory:** `src/` (~32K LOC)

| Subdirectory | Purpose | Files | LOC |
|---|---|---|---|
| `stores/` | Zustand state management by domain | 27 | 2,251 |
| `services/` | API client layer & business logic | 29 | 1,859 |
| `utils/` | Utility functions (auth, device, format) | 45 | 1,343 |
| `cache/` | Dexie (IndexedDB) database abstractions | 8 | 593 |
| `components/` | Reusable React components | 15+ | 800+ |
| `features/` | Feature modules (camera, editor, messaging) | 12 | 1,200+ |
| `hooks/` | Custom React hooks | 8 | 250+ |
| `context/` | React Context providers (theme, socket, auth) | 3 | 150 |
| `config/` | Configuration files | 3 | 200 |
| `libs/` | Multiple Axios instances | 11 | 400 |
| `routes/` | React Router route definitions | 3 | 500+ |
| `layouts/` | Page layouts | 6 | 300+ |
| `pages/` | Page components | 20+ | 3,000+ |
| `helpers/` | Helper functions | 10+ | 300+ |
| `constants/` | Application constants | 5 | 150 |
| `assets/` | Images, icons, fonts | — | — |
| `test/` | Vitest test setup & config | 1 | 50+ |

**Key Patterns:**

```javascript
// Zustand store pattern
const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null })
}));

// Service pattern with Axios
class LocketDioServices {
  static async getUser() { /* API call */ }
}

// Dexie cache pattern
const friendsDB = new Dexie('locket_friends');
friendsDB.version(1).stores({ friends: '++id' });
```

**Main Dependencies:**
```
react@18.2
vite@6.x
tailwindcss@4.x
daisyui@5.x
zustand@5.x
react-router@7.x
axios@1.8
socket.io-client@4.8
dexie@4.x
framer-motion@x.x
```

**Stores (Domain-Driven):**
- `AuthStore` — User auth state, token refresh
- `FriendStores` — Friends list, requests, blocked users
- `PostStores` — Moment publishing, history
- `MomentStores` — Moment data, reactions
- `MessageStores` — Chat messages, conversations
- `OverlayStores` — UI modal/popup state
- `SettingStores` — User preferences, theme, cache
- `StreakStores` — Daily upload counters

**Services (by Domain):**
- `LocketServices` — Core API (moments, friends, messages)
- `LocketDioServices` — Payment, storage, extended features
- `ExtensionsServices` — Browser extensions API
- `BrowserServices` — Device info, storage access
- `weather-services` — Weather API integration
- `music-services` — Music metadata fetching (Spotify/Apple Music)

**Caption/Overlay System:**
- `utils/caption-overlay-schema.js` — Canonical overlay schema, normalization (`normalizeOverlay`), projection (`toOverlayData`)
- `components/caption-overlay/` — Renderer dispatcher (`caption-overlay.jsx`) + per-type displays (default, gradient, image-icon, snow, time, battery, weather, location, review, heart, music)
- `components/caption-picker/` — UI builder: sectioned bottom sheet (`caption-picker-sheet.jsx`), theme presets (`caption-pill.jsx`), live data sections (time/weather/battery/location), R2 image upload, Spotify/Apple Music link paste, review form
- `hooks/use-weather.js` — Geolocation + Weather API client
- `hooks/use-location.js` — Nominatim reverse geocode (debounced, cached)
- `hooks/use-battery.js` — Battery Status API integration
- `hooks/use-image-caption.js` — R2 upload wrapper + localStorage caching
- `utils/crop-rounded-square.js` — Canvas center-crop + rounded corners for image overlays

**Axios Instances:**
- `instanceAuth` — Login, token refresh
- `instanceMain` — Main API calls
- `instanceData` — Data fetching
- `instanceLocket` — Locket community API
- `instancePayment` — Payment processing
- `instanceStorage` — File upload/download

**Cache Layer (Dexie):**
- `friendsDB` — Friends, requests, blocks
- `momentDB` — Moment metadata, reactions
- `chatsDB` — Message history
- `uploadMomentDB` — Upload queue state
- `configDB` — Settings, theme, auth tokens

**Theme System:**
- 26 DaisyUI themes (3D-heart-blue, pastel3dpink, gembgmono, goldonblack, etc.)
- Stored in localStorage
- Dynamically applied via `<html data-theme="...">`

**PWA Configuration:**
- `vite-plugin-pwa` — Service worker generation
- Manifest with app icons (multiple sizes)
- Offline page fallback

**Key Config Files:**
- `webConfig.js` — Master config (API URLs, feature flags)
- `apiConfig.js` — API endpoint mapping
- `configAlias.js` — Vite path aliases

---

### 2. Self-Hosted API (`apps/self-hosted/api/`)

**Type:** Express.js backend  
**Deploy:** Docker Compose (port 5001)  
**Node Version:** 20+  

**Source Directory:** `src/`

| Subdirectory | Purpose |
|---|---|
| `controllers/` | Request handlers |
| `routes/` | Express route definitions |
| `middleware/` | Auth, CORS, validation middleware |
| `services/` | Business logic (Firebase, FFmpeg, storage) |
| `models/` | Data models, schemas |
| `config/` | Environment & Firebase config |

**Key Dependencies:**
```
express@4.19
firebase@10.12
fluent-ffmpeg@2.1
sharp@x.x (image processing)
jimp@0.22 (image library)
multer@x.x (file upload)
cors@2.8
dotenv@16.4
jwt-decode@4.x
axios@1.13
heic-convert@2.1 (HEIC codec)
```

**Main Endpoints:**

Authentication:
- `POST /login` — Username/password auth
- `POST /refresh-token` — Refresh JWT token
- `GET /logout` — Invalidate session

User:
- `POST /getInfoUser` — Get profile info
- `POST /getAllFriendsV2` — Fetch friends list

Moments:
- `POST /postMomentV1` — Upload via multipart (< 100MB)
- `POST /postMomentV2` — Upload via presigned URL
- `POST /getMomentV2` — Fetch moment with metadata (with overlay support)

Messages:
- `POST /getAllMessageV2` — Fetch chat history

Caption/Overlay Metadata:
- `POST /weatherV2` — Fetch weather data (geolocation → API)
- `POST /getInfoMusic` — Fetch music metadata from Spotify/Apple Music oEmbed (returns {title, artist, image, platform})

**Middleware:**
- JWT verification
- CORS headers
- Body/file size limits
- Rate limiting (future)

**Environment Variables Needed:**
```
FIREBASE_API_KEY
FIREBASE_PROJECT_ID
FIREBASE_AUTH_DOMAIN
FIREBASE_STORAGE_BUCKET
NODE_ENV=production
PORT=5001
```

---

### 3. Self-Hosted Web (`apps/self-hosted/web/`)

**Type:** React frontend (mirrors main app)  
**Deploy:** Docker Compose (port 5173)  
**Purpose:** Installable alongside API for fully self-hosted instances  

**Structure:** Mirrors `apps/main/src/` with same patterns

**Key Difference:** 
- API calls point to local `http://localhost:5001` instead of cloud
- Same UI components & theme system
- Same offline support via IndexedDB

---

### 4. Storage Service (`apps/self-hosted/storage/`)

**Type:** Node.js file storage service  
**Deploy:** Docker Compose (port 5003)  
**Purpose:** Handles presigned URL generation & file management for R2  

**Key Dependencies:**
```
@aws-sdk/client-s3@3.x (R2 compatible)
express@4.x
dotenv@16.4
```

**Main Features:**
- Generate presigned URLs for direct client upload
- Support both Cloudflare R2 and AWS S3
- Validate credentials & bucket access
- Handle file metadata

**Environment Variables:**
```
AWS_ACCESS_KEY_ID (R2 API token)
AWS_SECRET_ACCESS_KEY
AWS_REGION=auto (for R2)
BUCKET_NAME=locket-storage
NODE_ENV=production
PORT=5003
```

**Routes:**
- `POST /presigned-url` — Request upload URL
- `POST /validate` — Check bucket access

---

## Docker Compose Setup

**File:** `apps/self-hosted/docker-compose.yml`

```yaml
services:
  api:
    image: locketdio-api
    container: locketdio-api
    ports: 5001:5001
    env_file: ./api/.env.production
    
  storage:
    image: locketdio-storage
    container: locketdio-storage
    ports: 5003:5003
    env_file: ./storage/.env.production
    
  web:
    image: locketdio-web
    container: locketdio-web
    ports: 5173:5173
```

All services restart unless stopped. Data persists via volumes.

---

## Code Organization Standards

### File Naming
- **JavaScript files:** kebab-case (e.g., `useAuthStore.js`, `LocketServices.js`)
- **Components:** PascalCase (e.g., `CameraCapture.jsx`, `FriendsList.jsx`)
- **Stores:** camelCase with `use` prefix (e.g., `useAuthStore.js`)
- **Utils:** kebab-case describing purpose (e.g., `format-date.js`, `device-info.js`)

### File Size Limits
- **Code files:** Keep under 200 LOC (modularize larger files)
- **Config files:** No limit
- **Markdown:** No limit

### Import Patterns
```javascript
// Absolute imports via Vite aliases
import { useAuthStore } from '@/stores/AuthStore';
import { LocketServices } from '@/services/LocketServices';
import { formatDate } from '@/utils/format-date';
```

---

## Data Flow Architecture

### Public Cloud Flow
```
React Component
    ↓
Zustand Store (state update)
    ↓
Service Layer (API call via Axios instance)
    ↓
Firebase Auth / Firestore / R2 Presigned URL
    ↓
Response → Dexie Cache (IndexedDB)
    ↓
Re-render Component
```

### Self-Hosted Flow
```
React Component
    ↓
Zustand Store
    ↓
Axios → Local API (http://localhost:5001)
    ↓
Express Controllers → Firebase/R2 or local storage
    ↓
Response → Dexie Cache
    ↓
Re-render Component
```

### Real-Time Messaging
```
Socket.io Client (React)
    ↓ (WebSocket connection)
Express Server
    ↓
Socket.io event handlers
    ↓
Broadcast to all connected clients
    ↓
Update Zustand MessageStore
    ↓
Re-render chat UI
```

---

## Key Files to Know

**Main App Critical Files:**
- `src/App.jsx` — Root app layout & routing
- `src/main.jsx` — Entry point, hydration
- `src/routes/publicRoutes.js` — ~30 page definitions
- `src/routes/authRoutes.js` — ~10 protected page definitions
- `src/stores/useAuthStore.js` — Auth state machine
- `src/services/LocketServices.js` — Core API methods
- `src/cache/` — All Dexie database definitions
- `src/config/webConfig.js` — Master config object
- `vite.config.js` — Vite build & PWA config

**Self-Hosted API Critical Files:**
- `src/routes/index.js` — All API route definitions
- `src/controllers/AuthController.js` — Login & token logic
- `src/middleware/auth.js` — JWT verification
- `src/services/FirebaseService.js` — Firebase integration
- `src/config/firebase.js` — Firebase initialization

**Storage Service:**
- `src/routes/index.js` — Presigned URL endpoints
- `src/controllers/PresignedController.js` — URL generation logic
- `src/services/S3Service.js` — AWS SDK wrapper

---

## Important Directories

| Path | Purpose | Notes |
|------|---------|-------|
| `apps/main/src/stores/` | All Zustand state | Domain-driven (Auth, Friend, Post, etc.) |
| `apps/main/src/services/` | API client & business logic | Multiple Axios instances |
| `apps/main/src/cache/` | IndexedDB definitions | Dexie wrappers |
| `apps/main/public/pwa-icons/` | App icons for PWA | Multiple themes supported |
| `apps/main/src/pages/` | All route components | 20+ page definitions |
| `apps/self-hosted/` | Complete self-hosted package | 3 interconnected services |
| `apps/self-hosted/api/src/` | Express backend | Firebase + FFmpeg integration |
| `apps/self-hosted/storage/src/` | File handling service | Presigned URL generation |

---

## Statistics

| Metric | Value |
|---|---|
| **Total LOC** | ~32K+ (main app) |
| **JS Files** | 881+ |
| **React Components** | 50+ |
| **Zustand Stores** | 8 domains |
| **API Services** | 4 major services |
| **Dexie Databases** | 5 |
| **DaisyUI Themes** | 26 |
| **Axios Instances** | 6 |
| **Docker Services** | 3 (self-hosted) |

---

## Environment & Build

**Node Version:** 20+  
**Package Manager:** npm (with package-lock.json)  
**Build Tool:** Vite 6  
**Framework:** React 18  
**CSS:** Tailwind CSS 4 + DaisyUI 5  

**Build Scripts (main app):**
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run linter (if configured)
npm test             # Run Vitest test suite
```

**Testing Infrastructure:**
- **Framework:** Vitest + React Testing Library
- **Setup:** `src/test/setup.js` (global DOM/API mocks)
- **Config:** Vite config `test` block with jsdom environment
- **Test Count:** 38+ unit tests covering core utilities, hooks, components
- **Coverage:** Tracks caption/overlay logic, weather hooks, music services
- **Run:** `npm test` (watch mode), `npm test -- --coverage` (coverage report)

**Multi-Brand Builds:**
```bash
VITE_BRAND=goldonblack npm run build
VITE_BRAND=pastel3dpink npm run build
VITE_BRAND=gembgmono npm run build
```

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Generated from:** repomix-output.xml
- **Related Files:** project-overview-pdr.md, code-standards.md, system-architecture.md

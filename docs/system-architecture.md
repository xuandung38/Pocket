# System Architecture - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

Complete architecture documentation covering cloud and self-hosted deployments, data flow, and key subsystems.

---

## High-Level Overview

Locket Dio operates in two deployment modes:

### 1. Public Cloud (Default)

```
Internet Users
    ↓
Vercel (React PWA)
    ↓
├─ Firebase Auth
├─ Firestore Database
└─ Cloudflare R2 (File Storage)
    ↓
Optional: Third-party integrations
```

### 2. Self-Hosted (Private)

```
Local Network / VPS
    ↓
Docker Compose (3 services)
    ├─ api:5001 (Express)
    ├─ storage:5003 (Node.js file service)
    └─ web:5173 (React)
    ↓
├─ Firebase Auth (shared)
├─ Firestore (shared)
└─ Cloudflare R2 or S3-compatible (credentials-based)
```

---

## Public Cloud Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         BROWSER (PWA)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ React 18 + Vite 6                                        │  │
│  │ ├─ Zustand State Management (8 stores)                  │  │
│  │ ├─ Socket.io Client (Real-time messaging)              │  │
│  │ ├─ Dexie IndexedDB (Offline cache)                     │  │
│  │ └─ 26 DaisyUI Themes                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Service Worker (PWA)                                      │  │
│  │ ├─ Offline support                                       │  │
│  │ ├─ Background sync                                       │  │
│  │ └─ App-like installation                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    (HTTPS)            (HTTPS)                (WebSocket)
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CLOUD INFRASTRUCTURE                        │
│                                                                   │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────┐  │
│  │ Vercel (Static)  │  │ Firebase Backend   │  │ Cloudflare  │  │
│  │                  │  │                    │  │ R2 (Storage)│  │
│  │ ├─ React PWA     │  │ ├─ Auth            │  │             │  │
│  │ ├─ Vite build    │  │ ├─ Firestore DB    │  │ ├─ Moments  │  │
│  │ ├─ GZip CSS/JS   │  │ ├─ Realtime rules  │  │ ├─ Videos   │  │
│  │ └─ CDN delivery  │  │ └─ Cloud Functions │  │ └─ Presigned│  │
│  └──────────────────┘  └────────────────────┘  │    URLs    │  │
│                                                  └─────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Firebase Realtime (optional, for WebSocket fallback)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Moment Upload (Public Cloud)

#### V1: Multipart Upload (< 100MB)

```
1. User clicks "Share Moment"
           ↓
2. React component → Zustand PostStore.uploadMoment()
           ↓
3. usePostStore calls LocketDioServices.postMomentV1(file, caption)
           ↓
4. Axios instanceStorage (POST /postMomentV1)
   - multipart/form-data
   - Headers: Authorization Bearer {JWT}
           ↓
5. Cloudflare R2 receives file
   - Stores in 'moments' bucket
   - Returns file URL
           ↓
6. Express/Firebase processes metadata
   - Creates Firestore document
   - Updates moment collection
           ↓
7. WebSocket broadcasts to friends
   - "moment_created" event
   - Real-time UI update
           ↓
8. Dexie IndexedDB cache updated locally
           ↓
9. UI shows "Moment shared!" ✓
```

#### V2: Presigned URL Upload (> 100MB)

```
1. User uploads large video
           ↓
2. React component → Zustand PostStore.uploadMoment()
           ↓
3. Call StorageService.getPresignedUrl({filename, filesize})
           ↓
4. Storage service → AWS SDK
   - Request presigned URL from R2
   - Returns signed URL (30 min expiry)
           ↓
5. Browser directly uploads to R2 via presigned URL
   - No proxy via backend
   - Progress tracking client-side
           ↓
6. R2 confirms upload
   - File stored
   - Returns final URL
           ↓
7. React calls LocketDioServices.postMomentV2(url, caption)
   - Server-side: verify URL is valid
   - Create Firestore document
           ↓
8. WebSocket broadcast (same as V1)
           ↓
9. Dexie cache + UI update
```

### Data Flow: Caption/Overlay Metadata

```
1. User selects caption overlay type (theme, icon, live data, music, image)
           ↓
2. React UI (caption-picker-sheet) → useOverlayStore.setSelectedOverlay(overlay)
           ↓
3. Live data collection (parallel):
   ├─ use-weather.js → Geolocation + POST /weatherV2 → {temp, condition, icon}
   ├─ use-location.js → Nominatim reverse geocode → {city, country}
   ├─ use-battery.js → Battery Status API → {level, charging}
   ├─ use-image-caption.js → R2 upload (rounded square crop) → {imageUrl}
   └─ music-services.js → POST /getInfoMusic {spotifyUrl} → {title, artist, image}
           ↓
4. Compose preview renders <CaptionOverlay overlay={selectedOverlay} />
           ↓
5. User confirms share → handleSend(moment, selectedOverlay)
           ↓
6. Client calls toOverlayData(selectedOverlay) → flat optionsData fields:
   {
     overlayType: "weather",
     overlayData: {temp, condition, icon, ...}
   }
           ↓
7. POST /postMomentV2 {fileUrl, caption, optionsData}
           ↓
8. Backend createRequestPayloadV5 merges optionsData → Firestore document
           ↓
9. Feed read: normalizeMoment() reconstructs overlay → <CaptionOverlay>
```

### Data Flow: Real-Time Messaging (WebSocket)

```
User A                          User B
   │                               │
   │ Input message "Hello"         │
   ↓                               │
React MessageStore              MessageStore
   │                               ↑
   │ (Zustand action)             │
   ↓                               │
Socket.io Client                Socket.io Client
   │                               ↑
   └──────────→ Express Server ←───┘
                    │
                    ↓
              Firebase Firestore
                    │
         (persist last 50 messages)
                    │
              Cloud Functions (optional)
         (trigger notifications)
                    │
          Broadcast to all connected
          Socket.io clients in chat
```

### Authentication Flow

```
1. User enters email + password
           ↓
2. LoginForm component → useAuthStore.login(email, password)
           ↓
3. LocketServices.login(email, password)
   - Axios instanceAuth (POST /login)
           ↓
4. Firebase Auth validates credentials
   - Checks user exists
   - Verifies password hash
           ↓
5. Firebase returns JWT token
   - Exp: 1 hour
   - Contains userId, email, claims
           ↓
6. React stores in localStorage + Zustand state
   - localStorage.setItem('authToken', token)
   - useAuthStore.setUser(user)
   - useAuthStore.setToken(token)
           ↓
7. Axios interceptors add token to all requests
   - config.headers.Authorization = `Bearer ${token}`
           ↓
8. Token auto-refresh middleware
   - If remaining time < 5 minutes
   - Call POST /refresh-token
   - Get new token
           ↓
9. User redirected to home page
           ↓
10. On logout: clear token + state + localStorage
```

### Friend Management Data Flow

```
User A (Add Friend)
    │
    ├─ useAuthStore.user.id = "user_a_id"
    │
    └─ FriendStore.addFriend("user_b_id")
         │
         └─ LocketServices.sendFriendRequest(userId)
              │
              └─ Firestore: requests/{requester}_{receiver} = {status: 'pending'}
                   │
                   └─ WebSocket notify User B
                        │
                        └─ User B receives notification
                             │
                             └─ FriendStore.acceptFriendRequest()
                                  │
                                  └─ Firestore: friends/{user_a_id}/friends[] += user_b
                                  └─ Firestore: friends/{user_b_id}/friends[] += user_a
                                       │
                                       └─ WebSocket confirm to User A
```

---

## Self-Hosted Architecture

### Docker Compose Setup

```
services:
  api (5001)
    - Node.js 20
    - Express.js
    - Firebase SDK
    - FFmpeg (video processing)
    - Environment: .env.production
    
  storage (5003)
    - Node.js 20
    - AWS SDK v3
    - R2 credentials config
    - Environment: .env.production
    
  web (5173)
    - React PWA (Vite dev/build)
    - Mirrors apps/main/
    - API calls to http://localhost:5001
    - Environment: .env.production
```

### Service Connectivity

```
┌─────────────────────────────────────────────┐
│          Docker Host Network                 │
│                                              │
│  ┌──────────┐     ┌─────────────────────┐  │
│  │  web     │────→│  api:5001           │  │
│  │  :5173   │     │  (Express.js)       │  │
│  └──────────┘     │                     │  │
│                   │  - Socket.io        │  │
│                   │  - Route handlers   │  │
│                   │  - Firebase SDK     │  │
│                   │  - FFmpeg process   │  │
│                   └──────┬──────────────┘  │
│                          │                  │
│                   ┌──────↓──────────────┐  │
│                   │  storage:5003       │  │
│                   │  (S3/R2 gateway)    │  │
│                   │                     │  │
│                   │  - Presigned URLs   │  │
│                   │  - File metadata    │  │
│                   │  - Credential mgmt  │  │
│                   └─────────────────────┘  │
│                                              │
│  External Connections:                      │
│  ├─ Firebase Auth (googleapis.com)         │
│  ├─ Firestore (firebaseio.com)             │
│  └─ Cloudflare R2 (r2.cloudflarestorage)  │
│     or AWS S3 (s3.amazonaws.com)          │
└─────────────────────────────────────────────┘
```

### Self-Hosted API Data Flow

```
Browser (http://localhost:5173)
    │
    └─ POST http://localhost:5001/postMomentV2
         │
         └─ Express Router (routes/index.js)
              │
              ├─ Middleware: auth.js (verify JWT)
              │
              └─ Controller: MomentController.postMomentV2()
                   │
                   ├─ Validate request (Joi schema)
                   │
                   ├─ Call StorageService.getPresignedUrl()
                   │
                   ├─ AWS SDK client.putObject()
                   │  or Presigned URL generation
                   │
                   ├─ Return {url, expirySeconds}
                   │
                   └─ Browser uploads file directly to R2
                        │
                        └─ Browser calls /postMomentV2 again with final URL
                             │
                             └─ Server creates Firestore document
                                  │
                                  └─ Socket.io broadcast to connected clients
```

### Environment Variables (Self-Hosted)

**api/.env.production:**
```
NODE_ENV=production
PORT=5001
FIREBASE_API_KEY=xxxx
FIREBASE_PROJECT_ID=xxxx
FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

**storage/.env.production:**
```
NODE_ENV=production
PORT=5003
AWS_ACCESS_KEY_ID=r2_api_token
AWS_SECRET_ACCESS_KEY=r2_secret
AWS_REGION=auto
BUCKET_NAME=locket-storage
ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

**web/.env.production:**
```
VITE_API_BASE_URL=http://localhost:5001
VITE_STORAGE_URL=http://localhost:5003
VITE_FIREBASE_API_KEY=xxxx
```

---

## Core Subsystems

### 1. Authentication & JWT Tokens

**Token Structure:**
```
Header: { alg: "HS256", typ: "JWT" }
Payload: {
  userId: "user_123",
  email: "user@example.com",
  iat: 1715000000,
  exp: 1715003600  // 1 hour
}
Signature: HMAC(secret)
```

**Refresh Logic:**
```javascript
// Middleware in API
if (timeUntilExpiry < 5 * 60 * 1000) {
  // Token expires in < 5 minutes
  // Return new token in response header
  res.set('X-Refresh-Token', newToken);
}

// Client interceptor
axios.interceptors.response.use((response) => {
  const newToken = response.headers['x-refresh-token'];
  if (newToken) {
    localStorage.setItem('authToken', newToken);
    useAuthStore.setToken(newToken);
  }
  return response;
});
```

### 2. Offline-First with Dexie

**Database Schema:**
```javascript
// Cache updated on every API response
friendsDB.version(1).stores({
  friends: '++id, userId, username',
  requests: '++id, senderId, receiverId, status',
  blocks: '++id, userId, blockedUserId',
});

momentDB.version(1).stores({
  moments: '++id, userId, createdAt',
  reactions: '++id, momentId, userId, emoji',
});

chatsDB.version(1).stores({
  messages: '++id, conversationId, senderId, createdAt',
  conversations: '++id, userId, lastMessageTime',
});

uploadMomentDB.version(1).stores({
  uploads: '++id, userId, status', // QUEUED, UPLOADING, DONE, FAILED
});

configDB.version(1).stores({
  settings: 'key',
});
```

**Sync on Reconnect:**
```javascript
window.addEventListener('online', async () => {
  console.log('Back online, syncing...');
  await syncAllData();
});

const syncAllData = async () => {
  try {
    const [friends, moments, messages] = await Promise.all([
      LocketServices.getFriends(),
      LocketServices.getMoments(),
      LocketServices.getAllMessages(),
    ]);
    
    await Promise.all([
      friendsDB.friends.clear().then(() => friendsDB.friends.bulkAdd(friends)),
      momentDB.moments.clear().then(() => momentDB.moments.bulkAdd(moments)),
      chatsDB.messages.clear().then(() => chatsDB.messages.bulkAdd(messages)),
    ]);
  } catch (error) {
    console.error('Sync failed:', error);
  }
};
```

### 3. WebSocket (Socket.io) Architecture

**Connection:**
```javascript
// Client
import io from 'socket.io-client';

const socket = io(API_BASE_URL, {
  auth: {
    token: localStorage.getItem('authToken'),
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('message_received', (message) => {
  useMessageStore.addMessage(message);
});

// Server
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  verifyToken(token)
    .then(user => {
      socket.userId = user.id;
      next();
    })
    .catch(err => next(new Error('Auth failed')));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  socket.on('send_message', (message) => {
    // Broadcast to friends
    io.to(message.recipientId).emit('message_received', message);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});
```

### 4. File Storage Pipeline

**Upload V1 (Multipart) Flow:**
```
Browser
  ↓
POST /postMomentV1
  multipart/form-data {
    file: File,
    caption: string,
    momentData: {userId, timestamp, ...}
  }
  ↓
Express Controller
  ├─ Multer middleware (parse file)
  ├─ FFmpeg (if video: transcode to H.264)
  ├─ Sharp (if image: optimize, resize)
  └─ Upload to R2
       ↓
     Return: {fileUrl, momentId}
       ↓
Firestore
  ├─ Create moment document
  ├─ Store metadata
  └─ Index for queries
```

**Upload V2 (Presigned) Flow:**
```
Browser
  ├─ POST /getPresignedUrl {fileName, fileSize}
  │    ↓
  │  Express Controller
  │    ├─ AWS SDK
  │    └─ Return {presignedUrl, expirySeconds}
  │
  ├─ Direct PUT to R2 via presigned URL
  │    (bypasses backend, reduces bandwidth)
  │
  └─ POST /postMomentV2 {fileUrl, caption}
       ↓
     Express Controller
       ├─ Validate URL is in R2 bucket
       ├─ Create Firestore document
       └─ Return {momentId}
```

### 5. Theme System

**Theme Management:**
```javascript
// stores/SettingStores/useThemeStore.js
const useThemeStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'light',
  
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

// Available themes (26 total)
const THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee',
  'pastel3dpink', 'goldonblack', 'gembgmono',
  // ... 19 more
];

// Component usage
const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      {THEMES.map(t => <option key={t}>{t}</option>)}
    </select>
  );
};
```

### 6. Caption/Overlay Metadata Service

**Music Metadata Endpoint:**
```
POST /api/getInfoMusic
Request: { spotifyUrl: "https://open.spotify.com/track/...", appleUrl?: "..." }
Response: {
  title: "Song Name",
  artist: "Artist Name",
  image: "https://image-url",
  platform: "spotify" | "apple-music",
  url: "original-url"
}
```

**Implementation:**
```javascript
// services/Music/music-service.js
- Spotify oEmbed: fetch `https://open.spotify.com/oembed?url={url}`
- Apple Music: parse OG tags from URL → {title, image, artist}
- Error handling: return null if invalid URL or network error
- Caching: client localStorage caches {url → metadata} for 24 hours

// Client hook: use-image-caption.js
- Wraps music-services, fetches + caches result
- Supports Spotify & Apple Music links pasted in caption picker
```

**Weather Metadata Endpoint:**
```
POST /api/weatherV2
Request: { lat: number, lon: number }
Response: {
  temp: number,
  condition: string (e.g., "sunny", "rainy"),
  icon: string (emoji or icon code),
  location: string (city name)
}
```

**Live Data Hooks (Browser-side):**
- `use-weather.js` — Calls Geolocation API, then POST /weatherV2
- `use-location.js` — Nominatim reverse geocode {lat, lon} → {city, country} (debounced, cached)
- `use-battery.js` — Battery Status API → {level, charging} (fallback if unavailable)

---

## Security Architecture

### Data Protection

| Layer | Protection |
|-------|-----------|
| **Transit** | HTTPS/TLS encryption on all requests |
| **Storage** | Firebase Firestore encryption at rest |
| **Auth** | JWT tokens with 1-hour expiry + refresh |
| **File Access** | Cloudflare R2 presigned URLs (time-limited) |
| **Credentials** | Environment variables, never in code/git |

### CORS Configuration

**Public Cloud:**
```javascript
// Firebase Cloud Functions
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.locket-dio.com'],
  credentials: true,
}));
```

**Self-Hosted:**
```javascript
// Express API
app.use(cors({
  origin: process.env.CORS_ORIGIN, // http://localhost:5173
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

### Rate Limiting

```javascript
// Express middleware
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
});

app.post('/login', loginLimiter, (req, res) => { /* ... */ });
```

---

## Deployment Architecture

### Public Cloud (Vercel + Firebase)

```
Code Push to GitHub (main branch)
         ↓
Vercel Webhook triggered
         ↓
├─ npm install (dependencies)
├─ npm run build (Vite bundling)
├─ Run linter/tests (if configured)
└─ Deploy to Vercel CDN
         ↓
Firebase Hosting (fallback)
         ↓
Live at http://localhost:5173
```

### Self-Hosted (Docker Compose)

```
Host Machine
    ↓
docker-compose up -d
    ├─ Build api Dockerfile
    ├─ Build storage Dockerfile
    ├─ Build web Dockerfile (Vite dev or prod)
    │
    └─ Start containers
        ├─ api:5001 (auto-restart unless-stopped)
        ├─ storage:5003
        └─ web:5173
             ↓
      Local Network: http://localhost:5173
```

---

## Performance Optimization

### Frontend

| Optimization | Method |
|---|---|
| **Code Splitting** | Vite dynamic imports, React.lazy() |
| **Image Optimization** | WebP conversion, lazy loading |
| **Compression** | Gzip for CSS/JS |
| **Caching** | Service Worker + Dexie IndexedDB |
| **CDN** | Vercel + Cloudflare edge |

### Backend

| Optimization | Method |
|---|---|
| **Database Indexing** | Firestore indexes on userId, createdAt |
| **Presigned URLs** | Bypass backend for large uploads |
| **Connection Pooling** | Firebase SDK connection reuse |
| **Response Compression** | gzip middleware |

---

## Monitoring & Observability

**Public Cloud:**
- Vercel Analytics (performance metrics)
- Firebase Console (auth, Firestore usage)
- Cloudflare Dashboard (R2 bandwidth, errors)

**Self-Hosted:**
- Docker logs: `docker-compose logs -f [service]`
- Node.js console.error/warn statements
- Optional: ELK stack or Prometheus (future)

---

## Disaster Recovery

### Data Backup

**Cloud:** Firebase automatic backups (Google-managed)  
**Self-Hosted:** Regular Firestore exports to cold storage

### Failover

**API Failure:** Offline-first caching via Dexie keeps app functional  
**Storage Failure:** Retry queue stores failed uploads until connectivity restored  
**WebSocket Disconnect:** Auto-reconnect with exponential backoff

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Diagrams:** ASCII (Mermaid compatible)
- **Related Files:** project-overview-pdr.md, codebase-summary.md, code-standards.md, deployment-guide.md

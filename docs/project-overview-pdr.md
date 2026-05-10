# Locket Dio - Project Overview & PDR

> NOTE: Always read this file before starting tasks in this area.

## Executive Summary

**Locket Dio** is a modern Progressive Web App (PWA) enabling users from the Locket Widget community to instantly share photos and videos directly from their browser. Live at http://localhost:5173. Built on React 18, Vite 6, Firebase, and Cloudflare R2, with optional self-hosted deployment via Docker.

**Current Version:** 1.0.0  
**Active Branch:** feat/fix-selfhost (fixing self-hosted deployment)  
**Status:** Actively maintained & regularly updated

---

## Product Definition

### What is Locket Dio?

Locket Dio bridges the gap between the Locket Widget mobile ecosystem and web. Users can:
- Capture photos/videos directly in-browser via camera access
- Instantly share with friends in Locket circles
- View moment history with emoji reactions
- Send real-time messages via WebSocket
- Use offline (IndexedDB caching)
- Install as PWA on mobile home screens

### Target Users

1. **Locket Widget Community Members** — Active users seeking web-based sharing
2. **Mobile-First Users** — Prefer browser PWA over dedicated apps
3. **Privacy-Conscious** — No unnecessary user data retention
4. **Self-Hosters** — Organizations deploying private instances via Docker

### Core Value Propositions

| Pillar | Benefit |
|--------|---------|
| **Speed** | Share in seconds; optimized upload pipeline (V1 multipart, V2 URL-based) |
| **Privacy** | Data-first design; no marketing tracking; optional self-hosted |
| **Accessibility** | Responsive design; works on any device; offline support |
| **Community** | Real-time chat; friends list; streak tracking (gamification) |

---

## Key Features

### Authentication & Security
- **Fast Login** — Simple, secure credential flow with JWT tokens
- **Auto Token Refresh** — Refreshes when <5 min from expiry
- **No User Data Retention** — Minimal server-side persistence beyond auth
- **Route Protection** — Auth-gated pages; logout clears tokens

### Media Capture & Management
- **In-Browser Camera** — Direct device camera access via WebRTC
- **HD Video Recording** — Support for high-quality video with codec control
- **Smart Cropping** — Square crop with custom canvas selection
- **Media Preview** — See content before uploading
- **Caption Editor** — Add personalized messages with rich formatting

### Real-Time Features
- **WebSocket Messaging** — Live chat via Socket.io with auto-reconnect
- **Emoji Reactions** — Interactive response system on moments
- **Streak Tracking** — Gamified daily upload counters
- **Live Friend Updates** — Real-time friend request notifications

### Offline & PWA
- **IndexedDB Cache** — Offline-first data via Dexie
- **Service Worker** — Background sync & offline access
- **Install Prompt** — Add to home screen on mobile
- **App-Like UI** — Full-screen, no browser chrome

### Advanced Options
- **26 DaisyUI Themes** — Dark/light modes with branded variants (goldonblack, pastel3dpink, gembgmono)
- **Multi-Device Support** — Front/back camera switching on mobile
- **Upload Queue** — Retry mechanism for failed uploads (QUEUED → UPLOADING → DONE/FAILED)
- **Browser Storage Manager** — Clear cache & service workers

---

## Business Context

### Deployment Model

**Public Cloud (Default)**
- Frontend: Vercel (auto-deploy from main branch)
- Auth & Database: Firebase (Firestore)
- File Storage: Cloudflare R2 (S3-compatible)
- Live at: http://localhost:5173

**Self-Hosted (Optional)**
- Docker Compose: api (5001), storage (5003), web (5173)
- All services containerized & environment-driven
- Supports private R2 credentials or alternative S3-compatible storage

### Revenue & Support Model

**Currently:**
- Donation-supported (Buy Me A Coffee, PayPal)
- Open-source licensing (MIT)
- Community-driven development

**Future Considerations:**
- Freemium tiers (storage limits)
- Self-hosted support services
- Premium features (advanced editing, priority uploads)

### Brand & Identity

- **Logo & Visual** — Locket Dio branding kit (assets/locket-dio-logo.png)
- **Domain** — locket-dio.com
- **Social Links** — Telegram (@ddevdio), GitHub (@doi2523)
- **Community** — Telegram group for support & feature requests

---

## Product Development Requirements (PDR)

### Functional Requirements

#### FR-01: Authentication System
- User login/logout with JWT tokens
- Automatic token refresh before expiry (<5 min remaining)
- Secure token storage in localStorage
- Password reset via email (via Firebase)
- Multi-session support

#### FR-02: Media Capture & Upload
- Direct camera access (photo & video)
- Device file upload from gallery
- Support HEIC/HEIF codec conversion (server-side FFmpeg)
- Two upload strategies:
  - **V1:** Multipart form data (< 100MB)
  - **V2:** Presigned URL reference (> 100MB, via storage service)
- Progress tracking & retry on failure

#### FR-03: Moment Sharing
- Create & publish "moments" (photo/video + caption)
- View friend moments with metadata (timestamp, reactions, sender)
- Emoji reactions system (heart, fire, laugh, wow, sad, angry)
- Moment history per user

#### FR-04: Real-Time Messaging
- WebSocket-based chat with friends
- Typing indicators
- Message history (last 50 per conversation)
- Unread count tracking
- Online status indicators

#### FR-05: Friend Management
- Add/remove friends
- Friend request workflow (outgoing, incoming)
- Block users (v2 feature)
- Search friends by username

#### FR-06: Offline Functionality
- IndexedDB storage for:
  - Friends list
  - Moments (previews + metadata)
  - Messages (recent 50)
  - Config & theme preference
- Automatic sync on reconnect
- Queue failed uploads until online

#### FR-07: PWA Features
- Service worker for offline access
- Installable on home screen
- Works in airplane mode
- Push notifications (future)

#### FR-08: Theme System
- 26 built-in DaisyUI themes
- Dark/light mode toggle
- Brand-specific variants (multi-tenant support)
- Persistent user preference

### Non-Functional Requirements

#### NFR-01: Performance
- Page load < 2s (Lighthouse score > 80)
- Image optimization (WebP, lazy loading)
- Code splitting via Vite
- Minimal bundle size (<500KB main JS)

#### NFR-02: Scalability
- Support 10K+ concurrent users
- Self-hosted instances up to 1K users
- Horizontal scaling via containerization
- Database indexing on frequently-queried fields

#### NFR-03: Security
- CORS headers properly configured
- No sensitive data in localStorage except JWT
- Input validation on all API calls
- Rate limiting on auth endpoints
- CSRF protection via token validation

#### NFR-04: Reliability
- 99.5% uptime target
- Graceful error handling & user feedback
- Automatic retry logic for transient failures
- Dead-letter queue for failed uploads

#### NFR-05: Accessibility
- WCAG 2.1 AA compliance
- Mobile-first responsive design
- Keyboard navigation support
- Alt text for images

---

## Success Metrics

| Metric | Target | Tracking |
|--------|--------|----------|
| **User Adoption** | 5K+ weekly active users | Firebase Analytics |
| **Upload Success Rate** | > 99.5% | Server logs + client tracking |
| **Page Load Time** | < 2s (p95) | Lighthouse, Vercel Analytics |
| **Uptime** | 99.5% | Status page |
| **Self-Hosted Deployments** | 50+ instances | Community tracking |
| **Code Coverage** | > 80% | CI/CD pipeline |

---

## Architecture Overview

```
┌─ Public Cloud (Vercel + Firebase + Cloudflare R2) ──┐
│                                                        │
│ ┌─────────────────┐      ┌──────────────────────┐    │
│ │  Vercel PWA    │ ←──→ │  Firebase Auth +      │    │
│ │ (React + Vite) │      │  Firestore (DB)      │    │
│ │                 │      │                      │    │
│ └─────────────────┘      └──────────────────────┘    │
│         ↓                                               │
│         └──→ Cloudflare R2 (File Storage)             │
│             + Presigned URLs                          │
└────────────────────────────────────────────────────────┘

┌─ Self-Hosted Option (Docker Compose) ──────────────────┐
│                                                         │
│ ┌──────────┐    ┌─────────┐    ┌───────────────────┐  │
│ │ API      │ ←→ │ Storage │ ←→ │ R2 Credentials    │  │
│ │ (Node.js)│    │ Service │    │ (or S3 alternate) │  │
│ │ :5001    │    │ :5003   │    └───────────────────┘  │
│ └──────────┘    └─────────┘                           │
│        ↑                                               │
│ ┌──────────────────────────┐                          │
│ │ Web Frontend (React)     │                          │
│ │ :5173                    │                          │
│ └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

| Layer | Tech |
|-------|------|
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, DaisyUI 5, Zustand 5 |
| **Styling** | Lucide React, react-icons, Sonner (toasts) |
| **State** | Zustand stores + Context API |
| **Offline** | Dexie (IndexedDB) |
| **Backend** | Node.js 20, Express.js 4 |
| **Auth** | Firebase Auth + JWT |
| **Database** | Firebase Firestore |
| **File Storage** | Cloudflare R2 (S3-compatible) |
| **Real-Time** | Socket.io (WebSocket) |
| **Media Processing** | FFmpeg (video codec), Sharp, JIMP (image resize) |
| **Deployment** | Docker Compose, Vercel, Firebase Hosting |

---

## Roadmap

### Completed
- Core authentication & JWT flow
- Camera capture & video recording
- File upload (V1 multipart, V2 presigned)
- Friend management & messaging
- Emoji reactions
- Offline support (IndexedDB)
- 26 DaisyUI themes
- Self-hosted Docker deployment

### In Progress (feat/fix-selfhost)
- Fix self-hosted API deployment issues
- CORS header alignment
- Overlay type definitions
- Auth route method standardization

### Planned
- **Image Editing** — Advanced filters, effects, stickers
- **Theme System** — Custom theme builder
- **Push Notifications** — Firebase Cloud Messaging
- **PWA Enhancement** — Full offline capability
- **Search & Discovery** — Find moments, users, trends
- **Social Features** — Stories, groups, trending moments

---

## Important Notes

### Privacy First
- No unnecessary user data retention
- Minimal server-side logging
- Optional self-hosted for full data control
- GDPR compliance in roadmap

### Backend Status
Backend services contain internal components not yet ready for public release. Self-hosted deployment requires careful environment setup (Firebase project, R2 credentials).

### Active Development
Project is actively maintained with regular updates. Community contributions welcome via GitHub issues & PRs.

---

## Support & Community

- **Email:** doibncm2003@gmail.com
- **Telegram:** @ddevdio (community group)
- **GitHub Issues:** For bug reports
- **GitHub Discussions:** For feature requests
- **Donations:** Buy Me A Coffee, PayPal (doibncm2003)

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Owner:** @doi2523 (Dio)
- **Related Files:** codebase-summary.md, code-standards.md, system-architecture.md

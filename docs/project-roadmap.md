# Project Roadmap - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

Living document tracking Locket Dio development phases, milestones, and feature progress. Updated regularly as implementation progresses.

---

## Current Status

**Version:** 1.0.0  
**Release Date:** 2025-01-01  
**Active Development Branch:** feat/fix-selfhost  
**Current Focus:** Stabilizing self-hosted deployment (CORS, auth routes, overlay types)

### What's Live Today

✅ Core authentication (login/logout/JWT refresh)  
✅ Camera capture (photo & video)  
✅ File upload (V1 multipart, V2 presigned URL)  
✅ Friend management & requests  
✅ Real-time messaging via Socket.io  
✅ Emoji reactions & moment sharing  
✅ Offline support (IndexedDB caching)  
✅ 26 DaisyUI themes (dark/light variants)  
✅ PWA installation (mobile home screen)  
✅ Self-hosted Docker Compose deployment  
✅ Vercel + Firebase cloud deployment  

---

## Development Phases

### Phase 1: Foundation & Core Features (COMPLETE)

**Status:** ✅ Complete  
**Timeline:** Months 1-3 (2024)  
**Owner:** @doi2523 (Dio)

#### Goals
- Establish React + Vite architecture
- Implement Firebase Auth integration
- Launch camera capture on web
- Build friend management system

#### Deliverables
- [x] React 18 + Vite 6 project scaffold
- [x] Firebase Auth setup & JWT token flow
- [x] Camera/video capture via WebRTC
- [x] Cloudflare R2 file storage integration
- [x] Basic UI with Tailwind CSS + DaisyUI
- [x] Friend list & request system
- [x] Moment upload (V1 multipart)

#### Success Metrics
- [x] App loads in < 2 seconds
- [x] Camera works on desktop & mobile
- [x] File upload succeeds > 99% of time
- [x] Users can share first moment end-to-end

#### Notes
- Multi-brand builds added (goldonblack, pastel3dpink, gembgmono)
- Zustand stores established for state management
- Dexie IndexedDB cache layer built

---

### Phase 2: Real-Time & Offline (COMPLETE)

**Status:** ✅ Complete  
**Timeline:** Months 4-5 (2024)  
**Owner:** @doi2523

#### Goals
- Add real-time messaging
- Implement offline-first architecture
- Add emoji reactions & gamification

#### Deliverables
- [x] Socket.io WebSocket integration
- [x] Real-time chat with typing indicators
- [x] Dexie IndexedDB cache for all major data
- [x] Service Worker for offline support
- [x] Emoji reaction system
- [x] Streak tracking (daily uploads)
- [x] Upload queue retry mechanism

#### Success Metrics
- [x] Messages appear in < 500ms
- [x] App works offline for 24 hours
- [x] Failed uploads auto-retry on reconnect
- [x] No data loss on network disconnect

#### Notes
- Auto-sync on reconnect implemented
- Offline-first UI shows cached data immediately
- Queue persisted in IndexedDB

---

### Phase 3: Self-Hosted Deployment (IN PROGRESS)

**Status:** 🔄 In Progress  
**Timeline:** Months 5-6 (2024-2025)  
**Owner:** @doi2523  
**Branch:** feat/fix-selfhost

#### Goals
- Enable private, self-hosted instances
- Fix deployment issues (CORS, routes, types)
- Support Docker Compose + optional Firebase

#### Deliverables
- [x] Express.js API server
- [x] Storage service for presigned URLs
- [x] Docker Compose configuration (3 services)
- [ ] Fix CORS headers alignment (IN PROGRESS)
- [ ] Fix auth route method standardization (IN PROGRESS)
- [ ] Fix overlay type definitions (IN PROGRESS)
- [ ] Complete .env.example for all services
- [ ] Self-hosted deployment guide (docs/deployment-guide.md)

#### Success Criteria
- [ ] All 3 Docker services start without errors
- [ ] Self-hosted web connects to local API
- [ ] File upload works end-to-end in Docker
- [ ] Real-time chat works with local Socket.io
- [ ] Tested on VPS environments (Ubuntu 20.04+)

#### Known Issues
- CORS headers not matching between cloud & self-hosted
- Auth route methods (GET vs POST) inconsistent
- Overlay state types causing type validation errors
- Missing environment variable documentation

#### Next Steps (Immediate)
1. Verify CORS config matches API requirements
2. Standardize auth routes to POST-only
3. Fix overlay Zustand store type definitions
4. Deploy to test VPS and validate

---

### Phase 4: Mobile PWA Enhancement (PLANNED)

**Status:** 📋 Planned  
**Timeline:** Months 6-7 (2025)  
**Owner:** TBD

#### Goals
- Full PWA compliance
- Push notifications
- App-like offline experience

#### Deliverables
- [ ] Register Service Worker improvements
- [ ] Manifest updates (theme color, screenshots)
- [ ] Firebase Cloud Messaging (FCM) integration
- [ ] Notification permission flow
- [ ] Background sync for uploads
- [ ] Install prompt customization
- [ ] Splash screen branding

#### Success Metrics
- [ ] Lighthouse PWA score 95+
- [ ] Installable on iOS & Android
- [ ] Push notifications arrive within 5 seconds
- [ ] Background sync completes uploads

---

### Phase 5: Advanced Image Editing (PLANNED)

**Status:** 📋 Planned  
**Timeline:** Months 7-8 (2025)  
**Owner:** TBD

#### Goals
- Built-in photo/video effects
- Filter library
- Sticker & text overlays

#### Deliverables
- [ ] Image cropping & rotation
- [ ] Filter library (brightness, contrast, saturation, etc.)
- [ ] Effect plugins (blur, blur background, beautify)
- [ ] Sticker library (emoji, shapes, custom)
- [ ] Text overlay with font selection
- [ ] Layer system (future)
- [ ] Undo/redo stack

#### Technical Approach
- HTML5 Canvas for processing
- Web Workers for heavy computations
- Sharp.js server-side fallback

#### Success Metrics
- [ ] Filter applies in < 500ms
- [ ] Export edited image in < 2 seconds
- [ ] UI responsive while processing
- [ ] Support min 10 concurrent edits

---

### Phase 6: Theme System Enhancement (PLANNED)

**Status:** 📋 Planned  
**Timeline:** Months 8-9 (2025)  
**Owner:** TBD

#### Goals
- Custom theme builder
- User-generated themes
- Accessibility improvements

#### Deliverables
- [ ] Theme color picker UI
- [ ] Save custom themes to localStorage + Firestore
- [ ] Share themes via URL/QR code
- [ ] Dark/light mode auto-detection
- [ ] High contrast mode option
- [ ] Font size scaling
- [ ] Theme preview before apply

#### Success Metrics
- [ ] Users can create theme in < 2 minutes
- [ ] Share theme works across browsers
- [ ] 100+ custom themes created by community

---

### Phase 7: Search & Discovery (PLANNED)

**Status:** 📋 Planned  
**Timeline:** Months 9-10 (2025)  
**Owner:** TBD

#### Goals
- Find moments by keyword
- Discover users & trends
- Explore feature

#### Deliverables
- [ ] Full-text search on moment captions
- [ ] User search by username
- [ ] Trending moments (by reactions)
- [ ] Hashtag support
- [ ] Advanced filters (date range, reactions)
- [ ] Search history
- [ ] Saved searches

#### Technical Approach
- Firestore text index on captions
- Algolia (future, optional)
- Client-side search for offline

#### Success Metrics
- [ ] Search results in < 1 second
- [ ] Support 100K+ moments
- [ ] Trending algo updates daily

---

### Phase 8: Social Features (PLANNED)

**Status:** 📋 Planned  
**Timeline:** Months 10-12 (2025)  
**Owner:** TBD

#### Goals
- Groups & circles
- Direct messaging groups
- Moment sharing to groups

#### Deliverables
- [ ] Create & manage groups
- [ ] Group chat (multi-user)
- [ ] Post to group (visible to group only)
- [ ] Group permissions (admin, member, viewer)
- [ ] Mute/leave group
- [ ] Group discovery
- [ ] Invite system (link/QR)

#### Success Metrics
- [ ] Create group in < 30 seconds
- [ ] Group messages sync in < 500ms
- [ ] Support groups up to 500 members

---

## Feature Roadmap (Prioritized Backlog)

### High Priority (Next Quarter)

| Feature | Effort | Blockers | Target |
|---|---|---|---|
| Fix self-hosted deployment | 1 week | None | May 2025 |
| Self-hosted deployment guide | 2 days | Phase 3 | May 2025 |
| Push notifications setup | 2 weeks | Phase 4 | June 2025 |
| Basic image filters | 2 weeks | Canvas optimization | June 2025 |

### Medium Priority (2-3 Quarters)

| Feature | Effort | Blockers | Target |
|---|---|---|---|
| Advanced image editing | 3 weeks | Phase 5 | July 2025 |
| Theme builder UI | 2 weeks | Phase 6 | August 2025 |
| Full-text search | 2 weeks | Firestore indexes | August 2025 |
| User groups | 3 weeks | Phase 8 | September 2025 |
| Block/unblock users | 1 week | None | June 2025 |

### Low Priority (Future)

| Feature | Effort | Blockers | Target |
|---|---|---|---|
| Stories feature | 4 weeks | Phase 8 | Q4 2025 |
| Video live streaming | 6 weeks | WebRTC setup | Q4 2025 |
| Monetization (premium tiers) | 4 weeks | Legal/billing | Q1 2026 |
| AI-powered effects | 6 weeks | ML integration | Q2 2026 |

---

## Known Issues & Tech Debt

### Critical (Block Release)

- [ ] CORS headers mismatch (self-hosted vs cloud) — Phase 3
- [ ] Auth route methods inconsistent (GET vs POST) — Phase 3
- [ ] Overlay type validation errors — Phase 3

### Important (Next Release)

- [ ] Token refresh not firing reliably — Monitor
- [ ] Socket.io reconnect sometimes hangs — Implement exponential backoff
- [ ] Large video upload progress stalls — Add chunked upload
- [ ] Service Worker cache invalidation slow — Implement version-based cache busting

### Minor (Polish)

- [ ] Theme switching can flicker — Pre-apply theme CSS
- [ ] Friend request notifications sometimes duplicate — Add deduplication
- [ ] Emoji picker slow on first load — Lazy load emoji library
- [ ] Upload queue UI doesn't show detailed errors — Add error detail panel

---

## Dependencies & External Services

| Service | Purpose | Status | Risk |
|---|---|---|---|
| **Firebase** | Auth, Firestore, Cloud Functions | Critical | Medium (Google-managed) |
| **Cloudflare R2** | File storage | Critical | Low (highly available) |
| **Vercel** | Frontend hosting | Important | Low (auto-scaling) |
| **Socket.io** | WebSocket library | Important | Low (open source, self-hostable) |
| **Dexie.js** | IndexedDB wrapper | Important | Low (self-hosted) |
| **DaisyUI** | UI components | Important | Medium (npm dependency) |

---

## Success Metrics & KPIs

### User Adoption

| Metric | Q2 2025 Target | Q4 2025 Target |
|---|---|---|
| Monthly active users | 5,000 | 20,000 |
| Daily active users | 500 | 5,000 |
| Average session duration | 10 min | 15 min |
| Share to new friends | 40% | 60% |

### Technical Performance

| Metric | Target |
|---|---|
| Page load time (p95) | < 2 seconds |
| Upload success rate | > 99.5% |
| API response time (p95) | < 500ms |
| Uptime | 99.5% |
| Lighthouse score | > 85 |
| Code coverage | > 80% |

### Business

| Metric | Target |
|---|---|
| Community contributions | 10+ PRs/month |
| Self-hosted deployments | 50+ |
| Donation revenue | $500/month |
| Support response time | < 24 hours |

---

## Release Schedule

### v1.0.0 (Current)
- Status: Live
- Release Date: 2025-01-01
- Focus: Core features, self-hosted beta

### v1.1.0 (Q2 2025)
- Status: In Planning
- Target: May 2025
- Focus: Fix self-hosted issues, push notifications

### v1.2.0 (Q3 2025)
- Status: Future
- Target: August 2025
- Focus: Image editing, theme builder

### v2.0.0 (Q4 2025)
- Status: Future
- Target: November 2025
- Focus: Groups, advanced social, monetization

---

## Community & Contribution

### Contributing to Roadmap

- **Report Bugs:** GitHub Issues
- **Request Features:** GitHub Discussions
- **Contribute Code:** Pull Requests (see CONTRIBUTING.md)
- **Donate:** Buy Me A Coffee, PayPal (doibncm2003)

### Development Guidelines

1. Fork repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Implement following code-standards.md
4. Add tests (if applicable)
5. Submit PR with detailed description
6. Await code review & merge

### Code Review Process

- Automated checks (linting, build)
- Minimum 1 approval required
- No direct commits to main
- Squash commits before merge

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Owner:** @doi2523
- **Related Files:** project-overview-pdr.md, codebase-summary.md, code-standards.md, system-architecture.md
- **Review Frequency:** Monthly
- **Next Review:** June 10, 2025

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2025-05-10 | Initial roadmap documentation |

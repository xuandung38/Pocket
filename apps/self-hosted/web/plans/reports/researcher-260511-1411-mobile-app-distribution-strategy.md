# Research: Mobile App Distribution Strategy (Vite→Web→Native)
**Date:** 2026-05-11 | **Context:** Vite + React 18 + Tailwind v4 + DaisyUI v5 + Zustand + Socket.io PWA → App Store

---

## Executive Summary

**Best path for minimal disruption:** **Capacitor wrapping your existing Vite+React app.** It requires zero React code changes, leverages your Tailwind v4 expertise directly, and reaches App Store in weeks, not months. The trade-off: WebView performance ceiling for complex animations/video processing.

---

## Detailed Analysis

### 1. EXPO + REACT NATIVE WEB (NATIVEWIND)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Maturity** | Beta/Unstable | v5 preview (Tailwind v4 support), v4 production-ready but Tailwind v3 only |
| **Dev Complexity** | 4/5 | High: learn React Native paradigms, rebuild Tailwind v3→v4 logic, DaisyUI won't work |
| **Performance** | 3/5 | Native components fast, but web version slow (Metro bundler lacks Vite optimizations) |
| **Honest Take** | **Not recommended** | Forcing a React Native paradigm onto a web-first project is backwards. |

**Details:**

- **NativeWind v5 + Tailwind v4:** v5 exists in preview but is **explicitly not production-ready**. v4 stable only supports Tailwind v3. Full v4 support is coming but unscheduled.
- **DaisyUI incompatibility:** DaisyUI relies on CSS selectors (`:active:focus`, `<details>` tags, checkbox hacks) that **don't exist in React Native**. You'd lose all DaisyUI components and hand-rebuild them using Nativewind + StyleSheet.
- **PWA support:** Expo Router doesn't auto-generate PWA manifests. Manual Workbox setup required + Expo's Metro bundler isn't optimized for web (Vite is 5-100x faster for incremental builds).
- **Architecture cost:** You're learning React Native's props model (View/Text/Pressable instead of div/button/span), rewriting CSS animations, and managing two mental models (web utilities vs native components).

**Verdict:** Only viable if you're committed to a true React Native long-term strategy (abandoning web for PWA). For "web first, native later," this is rework disguised as a framework.

---

### 2. CAPACITOR (WRAP VITE+REACT APP)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Maturity** | Production-Ready | Stable since 2023; 2025 App Store policy updates well-documented |
| **Dev Complexity** | 1/5 | Wrap existing app, minimal code changes, one Vite config |
| **Performance** | 4/5 | CSS animations GPU-composited; WebView latency negligible for most UX |
| **Honest Take** | **Pick this.** It's the path of least resistance. |

**Details:**

- **Zero Vite/React changes:** Your entire stack works as-is. Capacitor injects native APIs (camera, push, GPS) via simple JS bridge. No refactor required.
- **Tailwind v4 + DaisyUI:** Both work perfectly. Capacitor is just a browser (WKWebView on iOS, WebView on Android). CSS/CSS-in-JS renders identically to desktop web.
- **Native API coverage:**
  - **Camera:** Works well via `@capacitor/camera`. iOS supports JPEG quality, front/rear switching, gallery access, metadata. Advanced features (RAW, ML overlays) require custom plugins, but 95% of apps don't need them.
  - **Push Notifications:** Use `@capacitor-firebase/messaging` (not the official plugin). Official plugin conflates APNs tokens with FCM tokens. Firebase plugin handles both platforms uniformly via FCM.
  - **GPS, biometrics, contacts:** All supported via Capacitor plugins.
- **App Store approval:** Fully allowed as of 2025. **Rules:** (1) declare privacy APIs accurately, (2) integrate at least one native feature (camera, push, location—you'll have these), (3) rebuild with Xcode 26+ as of 2026-04-28 deadline.
- **Performance:** WebView is WKWebView (iOS 15+). Modern devices make it negligible. CSS transforms/opacity are GPU-composited. Socket.io real-time updates work fine.
- **Socket.io specific:** No issues. WebSocket works in WKWebView out of the box.

**Build workflow:** `npm run build` (standard Vite) → `npx cap add ios` → `npx cap copy` → Open Xcode → Build & submit.

**Verdict:** Proven, boring, pragmatic. You hit App Store in 2-3 weeks. Browser DevTools work in your Capacitor Android build. Unblock web users immediately, add App Store distribution when needed.

---

### 3. REACT NATIVE WEB (STANDALONE, NO EXPO)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Maturity** | Unsupported | Undocumented for Vite; community solutions fragile |
| **Dev Complexity** | 5/5 | Vite aliasing issues, node_modules transpilation nightmares |
| **Performance** | 2/5 | Bundler mismatches cause dead code bloat; no native distribution path |
| **Honest Take** | **Don't do this.** Dead end. |

**Details:**

- **Vite + react-native-web:** Theoretically possible via `vite-plugin-rnw` (community). Practically broken:
  - Vite excludes node_modules from transpilation by default (performance). But React Native libraries assume Metro will bundle everything, so they ship unbundled. Result: Vite's alias plugin doesn't cascade into dependencies—react-native imports inside UI libraries fail to resolve to react-native-web.
  - Solution requires manual transpilation config per-library. Fragile. No official guidance.
- **No native distribution:** react-native-web has **no official story for becoming iOS/Android binaries**. You'd still need Expo or bare React Native. You've gained nothing and lost debuggability (Vite not optimized for native bundling).
- **DaisyUI:** Won't work for same reasons as Expo approach.

**Verdict:** This is how people ship nothing. Skip it.

---

## Head-to-Head Comparison

| Factor | Capacitor | Expo+NativeWind | RN Web (Bare) |
|--------|-----------|-----------------|---------------|
| **Existing code reuse** | 100% | 0% (rewrite everything) | 50% (then stuck) |
| **Time to App Store** | 2-3 weeks | 3-4 months | Never |
| **Tailwind v4 support** | ✓ Full | ✗ Partial (v5 preview) | ✓ In theory |
| **DaisyUI support** | ✓ Full | ✗ None | ✗ None |
| **Web PWA support** | ✓ Automatic | Manual Workbox | ✓ Full |
| **CSS animation performance** | ✓ GPU-composited | ✓ Native-equivalent | ✓ GPU-composited |
| **Team skill reuse** | ✓ Web devs sufficient | Web + native learning curve | Waste of time |
| **Bridge complexity** | Simple JS → Objective-C/Kotlin | Complex JS ↔ Native | Not applicable |

---

## Critical Decision: When to Build Native?

### Capacitor Path (Recommended)

**Phase 1 (Week 1-2):** Deploy Vite+React PWA. Users on web/mobile browsers immediately. App-like experience (offline, install prompts, push).

**Phase 2 (Week 3-4):** Wrap with Capacitor. Test iOS/Android simulators. File App Store review.

**Phase 3 (Week 5-6+):** Live on App Store. You've had weeks of web user feedback. Native polish based on real data.

### Why this beats Expo

- **No rewrite cost:** Every feature you ship for web is free on App Store.
- **Risk reduction:** You learn user demand before investing in native-only features.
- **Debugging:** Browser DevTools work in Capacitor Android. No learning curve for native tooling.
- **Reversibility:** If App Store becomes unnecessary, you already have a thriving PWA.

---

## Technical Gotchas by Approach

### Capacitor-Specific

**Push notification token mismatch (iOS):** Official `@capacitor/push-notifications` returns APNs hex tokens. Firebase Console won't accept them. **Fix:** Use `@capacitor-firebase/messaging` instead (maintained by Firebase team, handles swizzling).

**App Store "Web Wrapper" rejection:** Apple may reject apps that are just web views with no meaningful native features. **Mitigation:** Integrate camera upload (user profile picture), push notifications, or location. You'll have these anyway for PWA.

**Xcode 26 deadline (2026-04-28):** All App Store builds now require Xcode 26+ and iOS 26 SDK. Not a blocker, just don't use old build machines.

### Expo-Specific

**Config plugins fragility:** If a package doesn't have a Config Plugin, you must eject to bare workflow to add custom native code. Then you lose the managed workflow benefits. Trap door.

**Metro bundler performance:** Incremental rebuilds take 10+ seconds. Vite does the same in <500ms. Dev experience is noticeable worse.

---

## Socket.io Compatibility

All three approaches support Socket.io equally well. WebSocket works in all WebView implementations. No concerns.

---

## Cost Analysis

| Approach | Infrastructure | Developer Time | Risk |
|----------|-----------------|-----------------|------|
| Capacitor | EAS Build (free tier) or CI/CD | 2-3 weeks | Lowest |
| Expo Managed | EAS Build (free) | 3-4 months (rewrite) | High (wrong tool for web-first) |
| React Native Bare | Custom native setup | 4-6 months (if successful) | Critical (unsustainable) |

---

## Unresolved Questions

1. **Capacitor OTA updates:** Does Capacitor support code push (deploying JS changes without App Store review)? Likely yes via Capgo, but verify licensing needs.
2. **Socket.io latency in WebView:** Is there any empirical data on Socket.io message latency in WKWebView vs native WebSocket? Probably negligible, but not formally tested.
3. **DaisyUI v5 + Capacitor specifics:** Any known incompatibilities? Unlikely (DaisyUI is CSS), but worth a spike.

---

## Recommendation (Ranked)

### 🥇 **Capacitor** (RECOMMENDED)
- **Why:** Minimal disruption, proven path, leverages existing web skills.
- **When:** Immediately after PWA launch (Phase 2).
- **Cost:** 2-3 weeks of engineering.

### 🥈 Expo Managed Workflow
- **Why:** If long-term React Native strategy is firm and you can afford 3-4 month rewrite.
- **When:** Only if native performance trumps web/PWA needs.
- **Cost:** 3-4 months + permanent context switching overhead.

### 🥉 React Native Bare
- **Why:** None. Don't do this.
- **When:** Never.
- **Cost:** Wasted time.

---

## Sources

- [NativeWind Tailwind v4 Support](https://www.nativewind.dev/v5/guides/migrate-from-v4)
- [NativeWind v4 GitHub Discussion](https://github.com/nativewind/nativewind/discussions/1422)
- [Expo Router PWA Documentation](https://docs.expo.dev/guides/progressive-web-apps/)
- [Capacitor App Store Approval Guide](https://capgo.app/blog/apple-policy-updates-for-capacitor-apps-2025)
- [Capacitor Camera Plugin API](https://capacitorjs.com/docs/apis/camera)
- [Capacitor Push Notifications Guide](https://dev.to/saltorgil/the-complete-guide-to-capacitor-push-notifications-ios-android-firebase-bh4)
- [React Native Web + Vite Integration](https://dev.to/dannyhw/react-native-web-with-vite-1jg5)
- [Expo vs Capacitor Comparison 2025](https://www.pkgpulse.com/guides/react-native-vs-expo-vs-capacitor-cross-platform-mobile-2026)
- [Tailwind CSS v4 + Vite Setup Guide](https://dev.to/imamifti056/how-to-setup-tailwind-css-v415-with-vite-react-2025-updated-guide-3koc)
- [Capacitor vs React Native Performance](https://nextnative.dev/blog/capacitor-vs-react-native)

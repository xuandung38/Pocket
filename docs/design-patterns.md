# Design Patterns — locket-dark

Key layout, animation, and interaction patterns derived from the send-screen rework. Apply these consistently across all screens.

## 1. Layout

### 1.1 Header breathing room
Headers must NOT touch the top edge of the phone-frame. Push them down so the screen feels balanced on a notched device.

```jsx
<div style={{ flexShrink: 0, height: 52, marginTop: 40, ... }}>
  Header content
</div>
```

- `height: 52` — fixed header height
- `marginTop: 40` — breathing space (mimics safe-area-top on notched phones)
- `flexShrink: 0` — never compresses

### 1.2 Vertical balance via `paddingTop` on hero content
The main hero block (photo, viewfinder, etc.) gets explicit top padding instead of being stuck right under the header.

```jsx
<div style={{ flexShrink: 0, padding: "30px 18px 0" }}>
  <div style={{ paddingBottom: "90%", borderRadius: 28, ... }}>
    ...
  </div>
</div>
```

- Side padding `18px` for visual margin
- `paddingBottom: "90%"` for ~1:1 aspect (slightly under-square gives breathing room below)

### 1.3 Bottom controls flow tight, not centered
**Anti-pattern:** `flex: 1; justifyContent: center` spreads controls into a vacuum.
**Correct:** Anchor below hero with `flexShrink: 0` and explicit gap.

```jsx
<div style={{ flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 14, gap: 14 }}>
  ...
</div>
```

### 1.4 Overlays clip to phone-frame
Modals/sheets/dropdowns must stay inside the `.phone-frame` boundary. Use `position: absolute` on a wrapper with `inset: 0; overflow: hidden`. Never use `position: fixed` — it would clip to the viewport, not the phone.

## 2. Animations

### 2.1 Symmetric in/out
Every entrance has a matching exit. No abrupt unmounts.

| Property         | In                              | Out                                |
|------------------|---------------------------------|------------------------------------|
| Duration         | 320ms                           | 320ms (same)                       |
| Easing           | `cubic-bezier(0.32, 0.72, 0, 1)`| same                               |
| Transform        | `translate3d(0, 100%, 0) → 0`   | reverse                            |
| Opacity (backdrop)| 0 → 1                          | 1 → 0                              |

### 2.2 GPU acceleration is mandatory
- Use `translate3d(0, X, 0)` (not `translateY(X)`) — forces a compositor layer
- Add `will-change: transform` (or `opacity`) on the animated element
- Animate ONLY `transform` and `opacity` — never `width`, `height`, `top`, `left`

### 2.3 Mount-then-exit pattern (component lifecycle)
For React components that need to play an exit animation before unmounting:

```jsx
const EXIT_DURATION = 340; // 20ms buffer over keyframe duration

function MyOverlay({ open, onClose, children }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;
  return (
    <div className={closing ? "animate-slide-down" : "animate-slide-up"}>
      {children}
    </div>
  );
}
```

The 20ms buffer over the CSS duration prevents an early-unmount snap if a frame is dropped.

## 3. Interaction

### 3.1 Pointer-drag swipe gesture
Real swipe (not just clickable arrows) on swipeable surfaces:

```jsx
const SWIPE_THRESHOLD = 40; // px
const dragStartX = useRef(null);

function handlePointerDown(e) { dragStartX.current = e.clientX; }
function handlePointerUp(e) {
  if (dragStartX.current == null) return;
  const dx = e.clientX - dragStartX.current;
  dragStartX.current = null;
  if (Math.abs(dx) >= SWIPE_THRESHOLD) {
    onSwipe(dx < 0 ? "next" : "prev");
  }
}

<div
  onPointerDown={handlePointerDown}
  onPointerUp={handlePointerUp}
  onPointerCancel={() => (dragStartX.current = null)}
  style={{ touchAction: "pan-y", userSelect: "none" }}
>
```

- `touchAction: "pan-y"` — allow vertical scroll, capture horizontal
- `userSelect: "none"` — prevent text selection while dragging
- Nested interactive elements (chevrons inside the swipeable) must `e.stopPropagation()` on `onPointerDown` and `onPointerUp` to avoid double-handling

### 3.2 Click-to-edit inline input
Pattern for in-place text editing (caption pills, message bubbles):

```jsx
{editing ? (
  <input
    autoFocus
    value={text}
    onChange={(e) => setText(e.target.value)}
    onBlur={() => setEditing(false)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === "Escape") setEditing(false);
    }}
    placeholder={placeholder}
  />
) : (
  <div onClick={() => setEditing(true)} style={{ cursor: "text" }}>
    {text || placeholder}
  </div>
)}
```

Both display and input share the same visual styling (bg, font-size, padding, border-radius) — only the element type differs.

## 4. CSS Tokens

Add to `index.css`:

```css
@keyframes slide-up   { from { transform: translate3d(0, 100%, 0); } to { transform: translate3d(0, 0, 0); } }
@keyframes slide-down { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, 100%, 0); } }
@keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out   { from { opacity: 1; } to { opacity: 0; } }

.animate-slide-up   { animation: slide-up   0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards; will-change: transform; }
.animate-slide-down { animation: slide-down 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards; will-change: transform; }
.animate-fade-in    { animation: fade-in    0.2s  ease forwards; }
.animate-fade-out   { animation: fade-out   0.32s ease forwards; will-change: opacity; }
```

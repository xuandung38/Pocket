# Design Guidelines - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

UI/UX conventions, component patterns, and design system standards for all Locket Dio interfaces.

---

## Design Philosophy

**Core Principles:**

1. **Mobile-First** — Design for mobile, enhance for desktop
2. **Privacy-Conscious** — Respect user data, minimize collection
3. **Accessibility** — WCAG 2.1 AA compliant, keyboard navigable
4. **Performance** — Keep UI snappy, lazy-load images, minimal animations
5. **Simplicity** — Reduce cognitive load, one action per screen when possible
6. **Consistency** — Reuse components, predictable patterns
7. **Offline-First** — App works without internet, sync gracefully when online

---

## Visual Design System

### Color Palette (26 Themes Available)

#### Default Theme (light)

```
Primary:     #3B82F6 (Blue)
Secondary:   #8B5CF6 (Purple)
Accent:      #EC4899 (Pink)
Success:     #10B981 (Green)
Warning:     #F59E0B (Amber)
Error:       #EF4444 (Red)
Neutral:     #6B7280 (Gray)
```

#### Dark Theme

```
Primary:     #60A5FA (Light Blue)
Secondary:   #A78BFA (Light Purple)
Accent:      #F472B6 (Light Pink)
Neutral:     #D1D5DB (Light Gray)
Background:  #1F2937 (Dark Gray)
```

#### Brand Variants

- **goldonblack** — Premium gold + black (luxury feel)
- **pastel3dpink** — Soft pastel pinks + light accents (playful)
- **gembgmono** — Monochrome gems + borders (elegant)

### Typography

```
Font Stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
           (Tailwind CSS default)

Custom Fonts:
├─ LoveHouse.woff2 (decorative, logo/branding)
└─ Purrfect.woff2 (playful, special UI elements)
```

**Font Sizes (Tailwind scale):**
```
text-xs    → 12px (captions, meta info)
text-sm    → 14px (labels, secondary text)
text-base  → 16px (body text)
text-lg    → 18px (section headings)
text-xl    → 20px (page headings)
text-2xl   → 24px (major headings)
text-3xl   → 30px (hero section)
```

**Font Weights:**
```
font-light    → 300
font-normal   → 400 (default)
font-medium   → 500
font-semibold → 600 (headings)
font-bold     → 700 (emphasis)
```

### Spacing Scale (Tailwind)

```
p-0, p-1, p-2, p-3, p-4, p-6, p-8, p-12, p-16, p-20, p-24
m-0, m-1, m-2, m-3, m-4, m-6, m-8, m-12, m-16, m-20, m-24
gap-0, gap-1, gap-2, gap-3, gap-4, gap-6, gap-8, gap-12
```

**Common Patterns:**
- Container padding: `p-4` (mobile) → `p-6` (tablet) → `p-8` (desktop)
- Section margins: `mb-6` (mobile) → `mb-8` (desktop)
- Element gaps: `gap-4` (lists) → `gap-6` (grids)

### Breakpoints

```
Tailwind CSS Default Breakpoints:

sm  640px  (phones landscape)
md  768px  (tablets)
lg  1024px (laptops)
xl  1280px (large screens)
2xl 1536px (extra large)
```

**Usage Examples:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 col mobile, 2 cols tablet, 3 cols desktop */}
</div>

<div className="text-base md:text-lg lg:text-xl">
  {/* Responsive text sizes */}
</div>
```

### Shadow & Elevation

```
Tailwind CSS Shadow Scale:

shadow-sm    → Subtle (cards, lists)
shadow       → Default (modals, dropdowns)
shadow-md    → Medium (floating actions)
shadow-lg    → Large (overlays, toasts)
shadow-xl    → Extra large (full-screen modals)
shadow-2xl   → Maximum (emphasis)
```

---

## Component Library (DaisyUI 5 + Custom)

### Built-In DaisyUI Components

All components from DaisyUI 5 available:

```jsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-outline">Outline</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-lg">Large</button>
<button className="btn btn-disabled">Disabled</button>

<input className="input input-bordered" type="text" />
<textarea className="textarea textarea-bordered"></textarea>

<div className="card bg-base-200 shadow-lg">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
  </div>
</div>

<div className="modal modal-open">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Modal</h3>
  </div>
</div>

<div className="badge badge-primary">Label</div>
<div className="alert alert-error">Error message</div>

<div className="navbar bg-base-100">
  <div className="flex-1">
    <a className="btn btn-ghost text-xl">Logo</a>
  </div>
</div>
```

### Custom UI Components

**Reusable Components** (`src/components/ui/`):

```
Modal.jsx              // Overlay modal with backdrop
Input.jsx              // Styled input with validation
Loading.jsx            # Spinner & skeleton loaders
FloatingWidget.jsx     # Floating action button
CaptionOverlay.jsx     # Caption editor popup
SonnerToast.jsx        # Toast notifications
```

**Usage:**
```jsx
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Loading from '@/components/ui/Loading';

export const MyForm = () => {
  const [loading, setLoading] = useState(false);
  
  return (
    <>
      <Loading isLoading={loading} />
      <Input 
        placeholder="Enter text"
        type="email"
        validation={(val) => val.includes('@')}
      />
    </>
  );
};
```

### Icon Libraries

**Lucide React** (Primary, 563+ icons):
```jsx
import { Home, Settings, Heart, Camera, Share2 } from 'lucide-react';

<Home size={24} className="text-primary" />
<Settings size={20} strokeWidth={2} />
<Heart fill="currentColor" />
```

**React Icons** (Supplementary, specific icon sets):
```jsx
import { FaFacebook, FaTelegram } from 'react-icons/fa';
import { IoCamera, IoLogOut } from 'react-icons/io5';

<IoCamera size={28} />
<FaTelegram className="text-blue-500" />
```

**Emoji** (System emoji or library):
```jsx
// Use system emoji for reactions
const REACTIONS = ['❤️', '🔥', '😂', '🤩', '😢', '😡'];

reactions.map(emoji => (
  <button key={emoji} onClick={() => addReaction(emoji)}>
    {emoji}
  </button>
));
```

---

## Layout Patterns

### Mobile-First Grid Layout

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id} className="card bg-base-200">
      {/* Item content */}
    </div>
  ))}
</div>
```

### Sidebar Navigation

```jsx
<div className="drawer lg:drawer-open">
  {/* Mobile drawer toggle */}
  <input id="my-drawer" type="checkbox" className="drawer-toggle" />
  
  <div className="drawer-content">
    {/* Page content */}
  </div>

  {/* Sidebar */}
  <div className="drawer-side">
    <nav className="menu p-4 w-80 h-full bg-base-200">
      {/* Menu items */}
    </nav>
  </div>
</div>
```

### Tab Navigation

```jsx
<div className="tabs">
  <input type="radio" name="my_tabs" className="tab" label="Tab 1" />
  <div className="tab-content">Content 1</div>

  <input type="radio" name="my_tabs" className="tab" label="Tab 2" />
  <div className="tab-content">Content 2</div>
</div>
```

### Modal Dialog

```jsx
const [isOpen, setIsOpen] = useState(false);

<>
  <button className="btn" onClick={() => setIsOpen(true)}>
    Open Modal
  </button>

  {isOpen && (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Modal Title</h3>
        <p className="py-4">Modal content here</p>
        <div className="modal-action">
          <button className="btn" onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )}
</>
```

### Card Layout

```jsx
<div className="card bg-base-200 shadow-lg">
  <figure>
    <img src="image.jpg" alt="Card image" className="w-full h-48 object-cover" />
  </figure>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card description text</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

---

## Responsive Design Patterns

### Mobile-First Approach

**DO:**
```jsx
// Start with mobile, add complexity for larger screens
<div className="w-full px-4 md:w-1/2 md:px-6 lg:w-1/3 lg:px-8">
  Content
</div>
```

**DON'T:**
```jsx
// Avoid mobile styling added as afterthought
<div className="w-1/3 px-8 sm:w-1/2 sm:px-6 xs:w-full xs:px-4">
  Content
</div>
```

### Touch-Friendly Targets

Minimum touch target size: `44px × 44px`

```jsx
// Good — large touch targets
<button className="btn btn-lg">
  {/* 48px height by default */}
</button>

// Acceptable
<button className="btn">
  {/* 44px height */}
</button>

// Avoid for touch input
<button className="btn btn-sm">
  {/* 32px height — too small */}
</button>
```

### Image Optimization

```jsx
import { useState } from 'react';

const OptimizedImage = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative bg-gray-200 aspect-square overflow-hidden rounded-lg">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
```

---

## Animation & Transitions

### CSS Transitions (Tailwind)

```jsx
// Hover effects
<button className="transition-colors hover:bg-primary">
  Hover me
</button>

// Smooth color transitions
<div className="transition-all duration-300 hover:shadow-lg">
  Smooth transition
</div>

// Transform effects
<div className="transition-transform hover:scale-105">
  Scale on hover
</div>
```

### Framer Motion (Optional)

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Animated content
</motion.div>
```

### Keep Animations Minimal

- Avoid auto-playing animations (battery/performance)
- Prefer 300-500ms durations
- Disable for users with `prefers-reduced-motion`

```jsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const duration = prefersReducedMotion ? 0 : 300;
```

---

## Accessibility (WCAG 2.1 AA)

### Semantic HTML

```jsx
// Good — semantic structure
<main>
  <section>
    <h1>Page Title</h1>
    <article>Content</article>
  </section>
</main>

// Avoid — generic divs
<div className="main">
  <div className="section">
    <div className="title">Page Title</div>
  </div>
</div>
```

### Images & Alt Text

```jsx
// Good
<img src="moment.jpg" alt="User's moment from 2025-05-10" />

// Avoid
<img src="moment.jpg" alt="image" />
<img src="moment.jpg" alt="IMG_1234.JPG" />
```

### Color Contrast

**DaisyUI components meet WCAG AA by default.**

Minimum ratios:
- **4.5:1** for normal text
- **3:1** for large text (18px+)
- **3:1** for graphics/UI components

### Keyboard Navigation

```jsx
// All interactive elements must be focusable
<button className="btn focus:outline focus:outline-2 focus:outline-primary">
  Keyboard focusable
</button>

// Avoid blocking focus outline
// Don't use: outline: none; (without replacement)
```

### ARIA Labels

```jsx
// Buttons without text
<button className="btn btn-icon" aria-label="Open menu">
  <Menu />
</button>

// Form fields
<input
  type="email"
  aria-label="Email address"
  aria-required="true"
  aria-describedby="email-hint"
/>
<span id="email-hint">Must be valid email format</span>

// Modals
<div
  className="modal"
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
</div>
```

---

## UX Patterns

### Loading States

```jsx
// Show skeleton or spinner during data fetch
const MomentCard = ({ momentId }) => {
  const [loading, setLoading] = useState(true);
  const [moment, setMoment] = useState(null);

  useEffect(() => {
    LocketServices.getMoment(momentId)
      .then(setMoment)
      .finally(() => setLoading(false));
  }, [momentId]);

  if (loading) {
    return <div className="skeleton w-full h-48" />;
  }

  return <div className="card">{/* Moment content */}</div>;
};
```

### Error Handling (User-Friendly)

```jsx
// Show clear error message with action
const LoginForm = () => {
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    try {
      await login();
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('Email or password incorrect. Try again.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please contact support.');
      }
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
    </>
  );
};
```

### Empty States

```jsx
// Show helpful message when no data
const MomentList = ({ moments }) => {
  if (moments.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="mx-auto mb-4 text-gray-400" size={48} />
        <h2 className="text-xl font-semibold mb-2">No moments yet</h2>
        <p className="text-gray-500 mb-4">
          Share your first moment with friends
        </p>
        <button className="btn btn-primary">
          Take a photo
        </button>
      </div>
    );
  }

  return moments.map(m => <MomentCard key={m.id} moment={m} />);
};
```

### Form Validation

```jsx
// Show validation feedback inline
const EmailInput = ({ value, onChange, onBlur }) => {
  const [touched, setTouched] = useState(false);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const showError = touched && !isValid;

  return (
    <div>
      <input
        type="email"
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        className={`input input-bordered w-full ${
          showError ? 'input-error' : ''
        }`}
      />
      {showError && (
        <span className="text-error text-sm mt-1">
          Please enter a valid email
        </span>
      )}
    </div>
  );
};
```

### Progressive Disclosure

```jsx
// Show advanced options only when needed
const UploadSettings = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <div className="basic-options">
        {/* Basic settings always visible */}
      </div>

      {showAdvanced && (
        <div className="advanced-options">
          {/* Advanced settings hidden by default */}
        </div>
      )}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? 'Hide advanced' : 'Show advanced'}
      </button>
    </>
  );
};
```

---

## Theme Selection UI

```jsx
const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();
  
  const themes = [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald',
    'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine',
    'halloween', 'garden', 'forest', 'aqua', 'lofi',
    'pastel', 'fantasy', 'wireframe', 'black', 'luxury',
    'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade'
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {themes.map(t => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          data-theme={t}
          className={`btn btn-sm ${theme === t ? 'btn-active' : ''}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
};
```

---

## PWA UI Considerations

### App-Like Feel

```jsx
// Full viewport, no scrollbars
<meta name="viewport" content="width=device-width, initial-scale=1" />

// Hide address bar on mobile
<meta name="viewport" content="viewport-fit=cover" />

// Custom status bar color
<meta name="theme-color" content="#3B82F6" />
```

### Offline Indicator

```jsx
const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  return !isOnline ? (
    <div className="alert alert-warning sticky top-0 z-50">
      <span>You're offline. Changes will sync when you're back online.</span>
    </div>
  ) : null;
};
```

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Applies To:** All user-facing interfaces (web, self-hosted web)
- **Related Files:** codebase-summary.md, code-standards.md
- **DaisyUI Version:** 5.x
- **Tailwind CSS Version:** 4.x
- **Next Review:** 2025-08-10

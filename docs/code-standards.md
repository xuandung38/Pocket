# Code Standards - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

All code in Locket Dio follows consistent patterns for maintainability and team productivity. This guide applies to all three apps (main, self-hosted/api, self-hosted/web).

---

## Language & Syntax

### JavaScript Only (No TypeScript)

- **All code is ES6+ JavaScript** (no `.ts` or `.tsx`)
- Use modern syntax: arrow functions, destructuring, async/await, template literals
- No type annotations — rely on JSDoc for function documentation

**Example:**
```javascript
// Good
const getUser = async (userId) => {
  try {
    const response = await axios.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error.message);
    throw error;
  }
};

/**
 * Process moment upload
 * @param {File} file - The media file
 * @param {string} caption - Optional caption text
 * @returns {Promise<string>} The uploaded moment ID
 */
const uploadMoment = async (file, caption = '') => { /* ... */ };

// Bad - avoid TypeScript
interface User { id: string; name: string; }
const getUser: (userId: string) => Promise<User> = async (userId) => { /* ... */ };
```

### File Naming Convention

| Type | Convention | Example |
|------|-----------|---------|
| **React Components** | PascalCase | `CameraCapture.jsx`, `FriendsList.jsx` |
| **JavaScript Files** | kebab-case | `useAuthStore.js`, `format-date.js` |
| **Zustand Stores** | camelCase w/ `use` prefix | `useAuthStore.js`, `useFriendStore.js` |
| **Services** | PascalCase | `LocketServices.js`, `FirebaseService.js` |
| **Utils** | kebab-case | `device-info.js`, `error-handler.js` |
| **Hooks** | camelCase w/ `use` prefix | `useTheme.js`, `useChatSocket.js` |
| **Config** | kebab-case | `web-config.js`, `api-config.js` |
| **Tests** | kebab-case + `.test.js` | `format-date.test.js` |

**Kebab-Case Rule:**
```
✓ format-date.js
✓ get-device-info.js
✓ socket-error-handler.js
✓ upload-moment-queue.js
✗ formatDate.js
✗ getDeviceInfo.js
```

---

## File Size & Modularization

### 200 LOC Limit per File

- **Hard limit:** Keep code files under 200 lines
- **Threshold:** If approaching 150 LOC, plan to split
- **Goal:** Easier to test, debug, and maintain

### When to Split

**Indicator:** File has multiple responsibilities

```javascript
// ❌ Too large (250+ LOC) — split into separate files
// services/LocketServices.js (monolithic)
class LocketServices {
  static async getUser() { /* 30 LOC */ }
  static async getFriends() { /* 40 LOC */ }
  static async postMoment() { /* 60 LOC */ }
  static async sendMessage() { /* 50 LOC */ }
  static async getAllMessages() { /* 40 LOC */ }
}

// ✅ Better — split into focused services
// services/user-service.js (30 LOC)
class UserService {
  static async getUser() { /* 30 LOC */ }
}

// services/friend-service.js (40 LOC)
class FriendService {
  static async getFriends() { /* 40 LOC */ }
}

// services/moment-service.js (60 LOC)
class MomentService {
  static async postMoment() { /* 60 LOC */ }
}

// services/message-service.js (90 LOC)
class MessageService {
  static async sendMessage() { /* 50 LOC */ }
  static async getAllMessages() { /* 40 LOC */ }
}
```

### Exceptions
- Config files (no limit)
- Markdown/documentation (no limit)
- Build/deployment scripts (use discretion)

---

## State Management (Zustand)

### Store Structure

```javascript
// stores/useAuthStore.js
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  // State
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Complex actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      set({ user: response.user, token: response.token });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => set({ user: null, token: null }),
}));

export default useAuthStore;
```

### Usage in Components

```javascript
import useAuthStore from '@/stores/useAuthStore';

const LoginForm = () => {
  const { user, isLoading, error, login } = useAuthStore();
  
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (email, password) => {
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
    </form>
  );
};
```

### Domain Organization

Organize stores by feature domain:

```
stores/
├── AuthStores/
│   ├── useAuthStore.js          # Auth state
│   └── useTokenRefreshStore.js  # Token management
├── FriendStores/
│   ├── useFriendStore.js        # Friends list
│   ├── useRequestStore.js       # Friend requests
│   └── useBlockStore.js         # Blocked users
├── PostStores/
│   ├── usePostStore.js          # Post creation
│   └── useHistoryStore.js       # User's post history
├── MomentStores/
│   ├── useMomentStore.js        # Moment data
│   └── useReactionStore.js      # Emoji reactions
├── MessageStores/
│   ├── useMessageStore.js       # Chat messages
│   └── useTypingStore.js        # Typing indicators
├── OverlayStores/
│   ├── useModalStore.js         # Modal visibility
│   └── useUserCaptionStore.js   # Caption editor state
├── SettingStores/
│   ├── useThemeStore.js         # Theme preference
│   └── useCacheStore.js         # Cache settings
└── StreakStores/
    └── useStreakStore.js        # Streak counters
```

---

## API Service Layer (Axios)

### Multiple Axios Instances

Each instance has a specific purpose:

```javascript
// libs/axios-instances.js
import axios from 'axios';

// Authentication endpoints
export const instanceAuth = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  timeout: 5000,
});

// Main API endpoints
export const instanceMain = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// Data fetching (extended timeout)
export const instanceData = axios.create({
  baseURL: `${API_BASE_URL}/data`,
  timeout: 20000,
});

// Locket community API
export const instanceLocket = axios.create({
  baseURL: LOCKET_API_URL,
  timeout: 10000,
});

// Payment processing
export const instancePayment = axios.create({
  baseURL: `${API_BASE_URL}/payment`,
  timeout: 15000,
});

// File uploads (large timeout)
export const instanceStorage = axios.create({
  baseURL: `${STORAGE_SERVICE_URL}`,
  timeout: 60000,
});

// Add token to requests
instanceAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Service Pattern

```javascript
// services/LocketServices.js
import { instanceMain, instanceData } from '@/libs/axios-instances';

class LocketServices {
  // Fetch methods
  static async getUser(userId) {
    const response = await instanceMain.get(`/users/${userId}`);
    return response.data;
  }

  static async getFriends() {
    const response = await instanceData.post('/getAllFriendsV2');
    return response.data.friends || [];
  }

  // Mutation methods
  static async postMoment(momentData) {
    const response = await instanceStorage.post('/postMomentV2', momentData);
    return response.data.momentId;
  }

  static async updateMoment(momentId, updates) {
    const response = await instanceMain.put(`/moments/${momentId}`, updates);
    return response.data;
  }

  // Batch operations
  static async getAllMessages(conversationId) {
    const response = await instanceData.post('/getAllMessageV2', {
      conversationId,
      limit: 50,
    });
    return response.data.messages || [];
  }
}

export default LocketServices;
```

---

## Offline Storage (Dexie IndexedDB)

### Database Structure

```javascript
// cache/friendsDB.js
import Dexie from 'dexie';

export const friendsDB = new Dexie('locket_friends');

friendsDB.version(1).stores({
  friends: '++id, userId',
  requests: '++id, senderId, receiverId',
  blocks: '++id, userId',
});

// Usage
const addFriend = async (friend) => {
  return friendsDB.friends.add(friend);
};

const getFriends = async () => {
  return friendsDB.friends.toArray();
};

const getFriendsByUser = async (userId) => {
  return friendsDB.friends.where('userId').equals(userId).toArray();
};
```

### Cache Sync Pattern

```javascript
// services/sync-service.js
const syncFriendsFromServer = async () => {
  try {
    const serverFriends = await LocketServices.getFriends();
    await friendsDB.friends.clear();
    await friendsDB.friends.bulkAdd(serverFriends);
    return serverFriends;
  } catch (error) {
    console.warn('Sync failed, using cached data:', error);
    return friendsDB.friends.toArray();
  }
};
```

---

## Error Handling

### Try-Catch Pattern

```javascript
// Always catch and handle errors
const fetchUser = async (userId) => {
  try {
    const user = await LocketServices.getUser(userId);
    return user;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('User not found');
      return null;
    } else if (error.response?.status === 401) {
      // Handle auth error, refresh token or logout
      return null;
    } else {
      console.error('Unexpected error:', error.message);
      throw error; // Re-throw for component to handle
    }
  }
};
```

### Component Error Boundaries

```javascript
// Use React Error Boundaries for UI crashes
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage />;
    }
    return this.props.children;
  }
}
```

---

## Component Structure

### Functional Components with Hooks

```javascript
// components/MomentCard.jsx
import { useState } from 'react';
import useMomentStore from '@/stores/MomentStores/useMomentStore';
import { formatDate } from '@/utils/format-date';

/**
 * Display a single moment with reactions
 * @param {Object} moment - Moment data object
 */
const MomentCard = ({ moment }) => {
  const [isLiked, setIsLiked] = useState(false);
  const { addReaction } = useMomentStore();

  const handleReaction = async (emoji) => {
    try {
      await addReaction(moment.id, emoji);
      setIsLiked(emoji === '❤️');
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  };

  return (
    <div className="card bg-base-200 shadow-lg">
      <img src={moment.imageUrl} alt={moment.caption} />
      <div className="card-body">
        <p>{moment.caption}</p>
        <p className="text-sm text-gray-500">{formatDate(moment.createdAt)}</p>
        <div className="flex gap-2">
          <button onClick={() => handleReaction('❤️')}>❤️ {moment.reactionCount}</button>
          <button onClick={() => handleReaction('🔥')}>🔥</button>
        </div>
      </div>
    </div>
  );
};

export default MomentCard;
```

---

## Configuration Management

### Config Hierarchy

```javascript
// config/web-config.js — Master config
const webConfig = {
  // API endpoints
  API: {
    BASE_URL: process.env.VITE_API_BASE_URL || 'https://api.locket-dio.com',
    TIMEOUT: 30000,
    RETRY_COUNT: 3,
  },

  // Storage
  STORAGE: {
    SERVICE_URL: process.env.VITE_STORAGE_URL || 'https://storage.locket-dio.com',
  },

  // Feature flags
  FEATURES: {
    PWA_ENABLED: true,
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: false, // Future
    ADVANCED_EDITING: false,   // Future
  },

  // UI
  THEME: {
    DEFAULT: 'light',
    AVAILABLE: ['light', 'dark', 'cupcake', 'pastel3dpink', 'goldonblack'],
  },

  // Security
  SECURITY: {
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000,   // 24 hours
  },
};

export default webConfig;
```

### Usage

```javascript
import webConfig from '@/config/web-config';

const apiBaseUrl = webConfig.API.BASE_URL;
const isOfflineEnabled = webConfig.FEATURES.OFFLINE_MODE;
```

---

## Security Guidelines

### No Confidential Data in Git

**Never commit:**
- `.env` files with API keys
- Firebase credentials
- AWS/R2 secrets
- Database connection strings
- OAuth tokens

**Always use:**
- `.env.local` (gitignored)
- `.env.example` (with placeholder values)
- Environment variables in CI/CD

**Example `.env.example`:**
```
VITE_API_BASE_URL=https://api.locket-dio.com
VITE_STORAGE_URL=https://storage.locket-dio.com
VITE_FIREBASE_API_KEY=your_key_here
```

### Token Storage

```javascript
// Store JWT in localStorage (acceptable for PWA)
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};
```

### Input Validation

```javascript
// Always validate user input before sending to API
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateCaption = (caption) => {
  return caption.length > 0 && caption.length <= 500;
};

// Use on form submission
const handleSubmit = (e) => {
  e.preventDefault();
  if (!validateEmail(email)) {
    setError('Invalid email');
    return;
  }
  // Proceed with API call
};
```

---

## Testing Guidelines

### Unit Test Pattern

```javascript
// utils/format-date.test.js
import { formatDate } from './format-date';

describe('formatDate', () => {
  test('formats ISO date to readable string', () => {
    const date = '2025-05-10T14:30:00Z';
    const result = formatDate(date);
    expect(result).toBe('May 10, 2025');
  });

  test('handles invalid dates', () => {
    const result = formatDate('invalid');
    expect(result).toBe('Invalid date');
  });
});
```

### Run Tests

```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

---

## Code Review Checklist

Before committing, verify:

- [ ] No TypeScript (JS only)
- [ ] File names follow conventions (kebab-case for utils, PascalCase for components)
- [ ] Code files under 200 LOC
- [ ] No hardcoded API keys or secrets
- [ ] Error handling for all async operations
- [ ] Zustand stores properly structured
- [ ] Service methods return consistent data structures
- [ ] Components use custom hooks (useAuthStore, etc.)
- [ ] Axios instances used appropriately
- [ ] IndexedDB sync logic implemented
- [ ] No unused imports
- [ ] Comments for complex logic

---

## Common Patterns

### Async Data Fetching

```javascript
const MomentPage = () => {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMoments = async () => {
      try {
        setLoading(true);
        const data = await LocketServices.getMoments();
        setMoments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMoments();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  return <div>{moments.map(m => <MomentCard key={m.id} moment={m} />)}</div>;
};
```

### Form Submission

```javascript
const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(formData.email, formData.password);
      // Success — store updates, redirect handled by router
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
      {error && <span className="text-error">{error}</span>}
      <button type="submit">Login</button>
    </form>
  );
};
```

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Applies To:** All code in apps/main, apps/self-hosted/api, apps/self-hosted/web
- **Related Files:** codebase-summary.md, project-overview-pdr.md, system-architecture.md

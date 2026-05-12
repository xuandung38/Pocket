# ==============================
#  Stage 1: Build frontend
# ==============================
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies. We use `npm install` (not `npm ci`) because this app
# is part of the root npm workspace (apps/* in /package.json); the canonical
# package-lock.json lives at the workspace root, not in this directory. Docker
# build context is scoped to apps/locket-love, so we'd have to drag the whole
# repo in just to use the root lockfile — not worth it. `npm install` resolves
# against package.json directly.
COPY package*.json ./
RUN npm install --no-audit --no-fund --loglevel=error

# Copy source. .dockerignore filters node_modules, dist, .env.* secrets,
# .git, .claude, plans, etc. so the build context stays lean.
COPY . .

# Vite reads VITE_* envs at build time from .env files in the workspace.
# If .env.production is provided via the build context (uncomment in
# .dockerignore to include) it is honored here; otherwise defaults from
# .env.example / vite.config apply.
ENV NODE_ENV=production
RUN npm run build

# ==============================
#  Stage 2: Serve build (Vite preview)
# ==============================
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Bring over package metadata + node_modules so `npm run preview` works
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Built static assets
COPY --from=builder /app/dist ./dist

# Vite preview reads vite.config for the preview server settings
COPY --from=builder /app/vite.config.js ./vite.config.js

EXPOSE 5175

# Bind to 0.0.0.0 so the host port mapping works
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5175"]

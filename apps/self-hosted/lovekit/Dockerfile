# ==============================
#  Stage 1: Build frontend
# ==============================
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build production bundle.
# VITE_* vars are read from .env.production in build context if present.
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

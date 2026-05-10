# Deployment Guide - Locket Dio

> NOTE: Always read this file before starting tasks in this area.

Complete instructions for deploying Locket Dio to cloud (Vercel + Firebase) and self-hosted environments (Docker Compose).

---

## Quick Reference

| Deployment | URL | Services | Setup Time |
|---|---|---|---|
| **Public Cloud** | http://localhost:5173 | Vercel + Firebase + R2 | 30 min |
| **Self-Hosted (VPS)** | http://your-domain:5173 | Docker Compose (3 services) | 45 min |
| **Local Development** | http://localhost:5173 | Vite dev server | 10 min |

---

## Public Cloud Deployment (Default)

### Prerequisites

- GitHub account
- Vercel account (free tier OK)
- Firebase project (free tier OK)
- Cloudflare R2 account with bucket

### Step 1: Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: "Locket Dio"
3. Enable Authentication:
   - Go to **Authentication** tab
   - Enable **Email/Password** method
   - Copy **API Key** (save for later)

4. Create Firestore Database:
   - Go to **Firestore Database** tab
   - Create in **Production mode**
   - Choose region: `us-central1` (or closest)
   - Create collections:
     ```
     users/
     moments/
     messages/
     friendRequests/
     reactions/
     ```

5. Set Firestore Security Rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

6. Get Firebase Config:
   - Project Settings → General
   - Copy config object (contains projectId, apiKey, etc.)

### Step 2: Set Up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create bucket**
   - Name: `locket-storage`
   - Region: Geographically close to users
   - Create

3. Create API Token:
   - R2 → API Tokens → Create API token
   - Permissions:
     - Object: Read & Write (all)
     - Bucket: List, Read, Write
   - Save **Access Key ID** and **Secret Access Key**

4. Configure CORS (if needed):
   - Bucket → Settings → CORS
   - Allow: `http://localhost:5173`, `https://www.locket-dio.com`

### Step 3: Deploy to Vercel

1. Fork repository to your GitHub account:
   - Click **Fork** on GitHub
   - Choose your username as owner

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **New Project** → **Import Git Repository**
4. Select forked repo
5. Configure build settings:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. Add Environment Variables:
   ```
   VITE_API_BASE_URL=https://api.locket-dio.com
   VITE_STORAGE_URL=https://storage.locket-dio.com
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   ```

7. Click **Deploy**
8. Wait for build to complete (usually 2-5 min)

### Step 4: Configure Custom Domain (Optional)

1. In Vercel project settings:
   - Domains → Add Domain
   - Enter: `locket-dio.com`
   - Add DNS records as prompted

2. Update Firebase Authorized Domains:
   - Firebase Console → Authentication → Settings
   - Authorized domains → Add `locket-dio.com`

3. Verify SSL certificate deployed

### Step 5: Verify Deployment

```bash
# Test public cloud deployment
curl http://localhost:5173

# Check service health
curl http://localhost:5173/health || echo "Health check endpoint not implemented"

# Test API connectivity
curl -H "Authorization: Bearer TEST_TOKEN" \
  https://api.locket-dio.com/getInfoUser
```

---

## Self-Hosted Deployment (Docker Compose)

### Prerequisites

- Docker & Docker Compose installed (20.10+)
- VPS or local machine with 2GB+ RAM
- Ubuntu 20.04 LTS (or compatible)
- Domain name (for HTTPS, optional but recommended)

### System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| CPU | 1 core | 2+ cores |
| RAM | 512MB | 2GB+ |
| Disk | 10GB | 50GB+ |
| Bandwidth | 1 Mbps | 10 Mbps+ |

### Step 1: Prepare Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify Docker installation
docker --version
docker-compose --version

# Allow current user to run Docker (optional)
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone & Configure Repository

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/Client-Locket-Dio.git
cd Client-Locket-Dio/apps/self-hosted

# Copy environment file template
cp api/.env.example api/.env.production
cp storage/.env.example storage/.env.production
cp web/.env.example web/.env.production
```

### Step 3: Configure Environment Variables

**api/.env.production:**
```bash
# Server
NODE_ENV=production
PORT=5001

# Firebase
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
FIREBASE_APP_ID=your_app_id_here

# CORS
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRY=3600s

# Rate limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**storage/.env.production:**
```bash
# Server
NODE_ENV=production
PORT=5003

# AWS S3 / Cloudflare R2
AWS_REGION=auto
AWS_ACCESS_KEY_ID=your_r2_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_r2_secret_access_key_here

# Bucket Configuration
BUCKET_NAME=locket-storage
ENDPOINT=https://your-account.r2.cloudflarestorage.com

# Or for AWS S3 (alternative)
# ENDPOINT=https://s3.amazonaws.com
# AWS_REGION=us-east-1

# Presigned URL Expiry (seconds)
PRESIGNED_URL_EXPIRY=1800

# Logging
LOG_LEVEL=info
```

**web/.env.production:**
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5001
VITE_STORAGE_URL=http://localhost:5003

# Firebase (same as API)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com

# Optional: Sentry error tracking
VITE_SENTRY_DSN=

# Optional: Analytics
VITE_GA_ID=
```

**Security Notes:**
- Change all placeholder values
- Use strong JWT_SECRET (generate: `openssl rand -base64 32`)
- Store .env files securely (not in git)
- Use different credentials per environment

### Step 4: Build & Start Docker Services

```bash
# Navigate to self-hosted directory
cd /path/to/apps/self-hosted

# Build images
docker-compose build

# Start services in detached mode
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME               STATUS
# locketdio-api      Up (healthy)
# locketdio-storage  Up
# locketdio-web      Up
```

### Step 5: Verify Deployment

```bash
# Check logs
docker-compose logs -f api    # API server logs
docker-compose logs -f web    # Web server logs
docker-compose logs -f storage # Storage service logs

# Test API connectivity
curl http://localhost:5001/health || echo "Health check failed"

# Test web app
curl http://localhost:5173 | head -20

# Test presigned URL generation
curl -X POST http://localhost:5003/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","fileSize":1024}'
```

### Step 6: Access Application

- **Web App:** http://localhost:5173
- **API Server:** http://localhost:5001
- **Storage Service:** http://localhost:5003

### Step 7: Configure Domain & HTTPS (Optional)

**Using Nginx Reverse Proxy + Let's Encrypt:**

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/locket-dio > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5001/;
        proxy_set_header Authorization \$http_authorization;
    }

    location /storage/ {
        proxy_pass http://localhost:5003/;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/locket-dio /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Restart Nginx
sudo systemctl restart nginx

# Test HTTPS
curl https://your-domain.com
```

**Update Environment Variables for HTTPS:**
```bash
# api/.env.production
CORS_ORIGIN=https://your-domain.com
SOCKET_IO_CORS_ORIGIN=https://your-domain.com

# web/.env.production
VITE_API_BASE_URL=https://your-domain.com/api
VITE_STORAGE_URL=https://your-domain.com/storage

# Rebuild & restart
docker-compose build && docker-compose up -d
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/Client-Locket-Dio.git
cd Client-Locket-Dio

# Install root dependencies
npm install

# Navigate to main app
cd apps/main

# Install app dependencies
npm install

# Create .env.local for development
cat > .env.local <<EOF
VITE_API_BASE_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=demo_key_for_local_testing
VITE_FIREBASE_PROJECT_ID=locket-dio-local
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_STORAGE_BUCKET=localhost
EOF

# Start Vite dev server
npm run dev

# Open in browser
# http://localhost:5173
```

### Development Workflow

```bash
# Watch for changes (auto-reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter (if configured)
npm run lint

# Format code (if configured)
npm run format
```

---

## Maintenance & Operations

### Backup Procedures

**Cloud (Firebase):**
```bash
# Export Firestore data (manual)
# Firebase Console → Firestore → Export

# Scheduled automated backups
# Enable in Firebase Project Settings
```

**Self-Hosted:**
```bash
# Backup database
docker-compose exec api npm run backup:firestore

# Backup R2 data
aws s3 sync s3://locket-storage /backup/locket-storage \
  --endpoint-url https://your-account.r2.cloudflarestorage.com

# Backup Docker volumes
docker-compose exec api tar czf /tmp/data-backup.tar.gz /data/*
docker cp locketdio-api:/tmp/data-backup.tar.gz ./backups/
```

### Monitoring

**Self-Hosted Health Checks:**
```bash
# Monitor service health
watch -n 5 'docker-compose ps'

# Monitor resource usage
docker stats

# View logs with filters
docker-compose logs --tail=100 api
docker-compose logs --since=10m web
```

**Cloud (Vercel & Firebase):**
- Vercel Dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com/
- Cloudflare Dashboard: https://dash.cloudflare.com/

### Updates & Patches

**Cloud:**
```bash
# Push updates to main branch
git push origin main

# Vercel auto-deploys (configured)
# Monitor deployment in Vercel dashboard
```

**Self-Hosted:**
```bash
# Pull latest code
cd /path/to/apps/self-hosted
git pull origin main

# Rebuild images
docker-compose build

# Restart services (zero-downtime if possible)
docker-compose up -d

# Verify new version
docker-compose exec api npm list
```

### Troubleshooting

**API fails to start:**
```bash
docker-compose logs api
# Check: FIREBASE_API_KEY, PORT conflicts, JWT_SECRET set
```

**Web can't connect to API:**
```bash
# Check CORS_ORIGIN matches web domain
# Check firewall allows :5001 access
# Test connectivity: curl http://localhost:5001/health
```

**Storage service errors:**
```bash
# Verify AWS credentials are correct
# Check bucket name and region
# Test R2 credentials: aws s3 ls --endpoint-url <R2_URL>
```

**WebSocket (Socket.io) disconnects:**
```bash
# Check SOCKET_IO_CORS_ORIGIN
# Verify websocket not blocked by firewall
# Check logs: docker-compose logs api | grep socket
```

---

## Performance Tuning

### Self-Hosted Optimization

**Nginx Caching:**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**Gzip Compression:**
```bash
# In web Dockerfile
RUN sed -i 's/^# gzip/gzip/' /etc/nginx/nginx.conf
RUN sed -i 's/gzip_types.*/gzip_types text\/plain text\/css application\/json application\/javascript;/' /etc/nginx/nginx.conf
```

**Database Indexing:**
```javascript
// Firestore indexes (created automatically or manually)
db.collection('moments').where('userId', '==', userId)
   .orderBy('createdAt', 'desc')
   .limit(20)
```

---

## Security Checklist

- [ ] CORS_ORIGIN configured correctly
- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] Firebase security rules reviewed
- [ ] R2 bucket not public
- [ ] Rate limiting enabled
- [ ] HTTPS/SSL certificate valid
- [ ] Environment variables secured (not in git)
- [ ] Docker images updated regularly
- [ ] Firewall rules restrict access appropriately
- [ ] Log files monitored for errors

---

## Document Metadata

- **Last Updated:** 2025-05-10
- **Version:** 1.0
- **Applies To:** Both cloud and self-hosted deployments
- **Related Files:** system-architecture.md, codebase-summary.md, project-overview-pdr.md
- **Maintenance Schedule:** Review quarterly

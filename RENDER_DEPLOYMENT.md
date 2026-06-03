# 🚀 Budget Tracker - Render Deployment Guide (Firebase Edition)

## Overview
This guide walks you through deploying your Budget Tracker application to Render using Docker containers and Firebase for authentication and database.

## Architecture on Render
```
┌─────────────────────────────────────┐
│    Firebase Cloud Services          │
│  - Authentication (Email/Password)  │
│  - Firestore Database (Auto-scaling)│
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   Render Docker Container           │
│  (Backend + Frontend Nginx Server)  │
│  - Node.js API (port 5000 internal) │
│  - Nginx serving React (port 10000) │
└─────────────────────────────────────┘
```

## Prerequisites
- GitHub account with your code pushed
- Render account (free tier available at https://render.com)
- Firebase account (free tier available at https://console.firebase.google.com)

## Step 1: Prepare Firebase

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Create a project"**
3. Name it: `budget-tracker`
4. Create the project

### 1.2 Set Up Firestore
1. In Firebase console, go to **"Firestore Database"**
2. Click **"Create database"**
3. Start in **"Production mode"**
4. Choose a region close to you
5. Click **"Create"**

### 1.3 Enable Authentication
1. Go to **"Authentication"** in Firebase
2. Click **"Get started"**
3. Enable **"Email/Password"** sign-in method

### 1.4 Create Service Account Key
1. Click **Settings** ⚙️ → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Save the JSON file securely
5. **Copy the entire JSON content** - you'll need this as an environment variable

### 1.5 Set Firestore Security Rules
1. In Firestore, go to **"Rules"** tab
2. Replace with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
3. Click **"Publish"**

## Step 2: Push Your Code to GitHub

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit for Render deployment"
```

2. Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/budget-tracker.git
git push -u origin main
```

## Step 3: Create the Render Dockerfile

A Render-compatible Dockerfile is already in your project root. It combines frontend and backend in a single container:

**File: `/Dockerfile` (Root Level)**
```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS build-stage
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN CI=false npm run build

# Stage 2: Build backend dependencies
FROM node:18-alpine AS backend-deps
WORKDIR /backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Stage 3: Runtime - Nginx + Node.js
FROM node:18-alpine
WORKDIR /app

# Install nginx
RUN apk add --no-cache nginx

# Copy backend
COPY --from=backend-deps /backend/node_modules ./backend/node_modules
COPY backend ./backend

# Copy frontend build
COPY --from=build-stage /app/build ./public

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 10000

# Start both nginx and backend
CMD ["sh", "-c", "node backend/server.js & nginx -g 'daemon off;'"]
```

## Step 4: Create Nginx Configuration

**File: `/nginx.conf` (Create this file in root)**
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    server {
        listen 10000 default_server;
        server_name _;

        root /app/public;
        index index.html;

        # API proxy - route all /api calls to backend
        location /api/ {
            proxy_pass http://127.0.0.1:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Serve React app - SPA routing
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "public, max-age=0, must-revalidate";
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Step 5: Update Backend for Render

**File: `backend/server.js`** - Ensure it's configured to work on port 5000:
```javascript
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget_tracker';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

## Step 6: Deploy to Render

### 6.1 Create a New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing your Budget Tracker
5. Fill in the configuration:

**Configuration Details:**
- **Name**: `budget-tracker` (or your preferred name)
- **Runtime**: `Docker`
- **Region**: Select closest to your users (e.g., `Ohio`, `Oregon`)
- **Branch**: `main`
- **Build Command**: Leave empty (Docker handles it)
- **Start Command**: Leave empty (Dockerfile's CMD is used)

### 6.2 Add Environment Variables

Click **"Environment"** and add:

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","..."}
CORS_ORIGIN=https://your-render-domain.onrender.com
NODE_ENV=production
REACT_APP_API_BASE_URL=https://your-render-domain.onrender.com/api
PORT=5000
```

**Important**: Replace values appropriately:
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Your full service account JSON (from Step 1.4)
- `CORS_ORIGIN`: Will be `https://your-app-name.onrender.com` (shown after deployment)
- `REACT_APP_API_BASE_URL`: Same as CORS_ORIGIN with `/api` suffix

### 6.3 Deploy Settings

- **Plan**: Start with free tier (upgrade if needed)
- **Auto-deploy**: Enable (optional - redeploys on every GitHub push)
- Click **"Create Web Service"**

### 6.4 Wait for Deployment

1. Render will build and deploy your application (takes 5-10 minutes)
2. You'll see logs in real-time
3. Once complete, you'll get a URL like: `https://budget-tracker-xyz.onrender.com`

## Step 7: Test Your Deployment

### 7.1 Test Health Endpoint
```bash
curl https://your-render-url.onrender.com/api/health
```

### 7.2 Register a New User
1. Open https://your-render-url.onrender.com in your browser
2. Click "Register"
3. Create an account with email and password
4. You should be redirected to the Dashboard

### 7.3 Add Transactions
1. Create a transaction to ensure MongoDB is working
2. Verify it persists after refresh

## Step 8: Common Issues & Solutions

### Issue: "Firebase Connection Error"
**Solution:**
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is correct in Render environment variables
- Check Firebase project ID matches in the service account key
- Ensure Firestore database is created in Firebase console
- Check security rules are published (Step 1.5)

### Issue: "Permission denied" on API calls
**Solution:**
- Verify Firestore security rules are correct
- Check FIREBASE_SERVICE_ACCOUNT_KEY is properly set
- Restart deployment after changing environment variables

### Issue: "Cannot GET /"
**Solution:**
- Check Render deployment logs for build errors
- Verify `nginx.conf` is in the root directory
- Ensure Docker build succeeds (check Render build logs)

### Issue: "CORS Error on API Calls"
**Solution:**
- Update `CORS_ORIGIN` environment variable to your Render URL
- Restart deployment after changing environment variables
- Use browser DevTools (Network tab) to verify headers

### Issue: "React App Shows 404"
**Solution:**
- Verify React build succeeded in Docker build logs
- Check that `build` folder exists after npm run build
- Ensure nginx.conf `try_files` directive is present

### Issue: Deployment Keeps Restarting
**Solution:**
- Check server logs for errors
- Verify all environment variables are set
- Ensure backend/server.js listens on port 5000
- Check MongoDB connection is working

## Step 9: Optional Enhancements

### Enable Auto-Restart on Failure
Done automatically by Render

### Add Custom Domain
1. In Render dashboard, go to your service
2. **Settings** → **Custom Domains**
3. Add your domain (e.g., `budget.yourdomain.com`)
4. Follow DNS configuration instructions

### Set Up Monitoring
- Render provides logs and metrics automatically
- Check **"Logs"** tab to monitor application
- View memory/CPU usage in **"Metrics"** tab

### Database Backups (Firebase Firestore)
1. Firestore automatically backs up your data
2. Access backups via Firebase console → Firestore → Backups
3. Restore from backup if needed (requires Firebase team plan or contact support)

## Step 10: Updates & Redeployment

### Auto-Deploy (if enabled)
- Push changes to GitHub
- Render automatically builds and deploys
- Takes 5-10 minutes

### Manual Redeployment
1. Go to Render dashboard
2. Select your service
3. Click **"Manual Deploy"** → **"Deploy Latest Commit"**

## Firebase Setup Details

Complete Firebase setup is in `FIREBASE_SETUP.md`. Key points:

1. **Create Firebase Project** at https://console.firebase.google.com
2. **Set Up Firestore Database** (Production mode, auto-scaling)
3. **Enable Email/Password Authentication**
4. **Create Service Account Key** - Download JSON file
5. **Set Firestore Security Rules** - User data isolation
6. **Copy service account JSON as environment variable**

## Firebase Pricing & Limits

**Free Tier Includes:**
- 1 GB storage
- 50,000 reads/day
- 20,000 writes/day
- Sufficient for most small projects

**Automatic Scaling:**
- Pay only for what you use
- Scales with your application
- No downtime during scaling

## Performance Tips

1. **Reduce Build Time**: Render caches Docker layers - push frequently to benefit from caching
2. **Database Indexing**: MongoDB Atlas automatically indexes common queries
3. **Compression**: gzip is enabled in nginx.conf - reduces payload by ~70%
4. **Static Asset Caching**: Images/CSS cached for 1 year in nginx.conf
5. **CDN Option**: Render supports custom domains - use Cloudflare as CDN for even better performance

## Security Checklist

- [ ] Firebase service account key is **never committed to GitHub**
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is set as environment variable only
- [ ] Firestore security rules restrict user data access
- [ ] `CORS_ORIGIN` points to your production domain only
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS enforced (Render provides free SSL)
- [ ] All sensitive data in environment variables (never in code)
- [ ] Regular monitoring of Firebase usage
- [ ] Keep dependencies updated

## Troubleshooting

### Check Logs
```bash
# In Render dashboard, click your service
# Go to "Logs" tab to see real-time application logs
```

### SSH into Container (if available)
1. Render dashboard → Your service
2. Click **"Shell"** (if available on your plan)
3. Inspect files and run commands

### Roll Back
```bash
# Render dashboard → Your service → "Manual Deploy"
# Select a previous deployment to roll back
```

## Next Steps After Deployment

1. Set up email notifications for deployment failures
2. Add monitoring/alerting tools (optional)
3. Plan database backup strategy
4. Document your deployment URLs
5. Set up SSL certificates (included by Render)

## Support Resources

- **Render Docs**: https://render.com/docs
- **Firebase Console**: https://console.firebase.google.com
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Firebase Auth Docs**: https://firebase.google.com/docs/auth
- **Express/Node.js**: https://expressjs.com
- **React**: https://react.dev

---

**Your application is now production-ready on Render!** 🎉

For questions or issues, check the logs in Render dashboard or review the troubleshooting section above.

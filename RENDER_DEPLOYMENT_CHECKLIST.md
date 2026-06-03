# 🚀 Budget Tracker - Render Deployment Checklist

Follow these steps in order to deploy to Render successfully.

## Phase 1: Preparation (5 min)

- [ ] **1.1** Install Git (if not already installed)
  ```bash
  # Windows: Download from https://git-scm.com/download/win
  # Mac: brew install git
  # Linux: sudo apt install git
  ```

- [ ] **1.2** Initialize Git repository in your project
  ```bash
  cd e:\Projects\Budget_final
  git init
  git add .
  git commit -m "Initial commit for Render deployment"
  ```

- [ ] **1.3** Create GitHub repository
  - Go to https://github.com/new
  - Create repo name: `budget-tracker`
  - Create repository (don't initialize with README)

- [ ] **1.4** Push code to GitHub
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/budget-tracker.git
  git branch -M main
  git push -u origin main
  ```

## Phase 2: Firebase Setup (10 min)

- [ ] **2.1** Create Firebase account
  - Go to https://console.firebase.google.com
  - Sign in with Google account

- [ ] **2.2** Create Firebase project
  - Click "Create a project" → name it `budget-tracker`
  - Wait for initialization (~2 min)

- [ ] **2.3** Set up Firestore Database
  - Go to **"Firestore Database"**
  - Click **"Create database"**
  - Start in **"Production mode"**
  - Choose region closest to you
  - Click **"Create"**

- [ ] **2.4** Enable Email/Password Authentication
  - Go to **"Authentication"**
  - Click **"Get started"**
  - Find **"Email/Password"** and enable it
  - Click **"Save"**

- [ ] **2.5** Set Firestore Security Rules
  - In Firestore, go to **"Rules"** tab
  - Replace with rules that protect user data (see FIREBASE_SETUP.md)
  - Click **"Publish"**

- [ ] **2.6** Generate Service Account Key
  - Click **Settings** ⚙️ → **"Project settings"**
  - Go to **"Service accounts"** tab
  - Click **"Generate new private key"**
  - Save JSON file securely
  - **Copy entire JSON content** (you'll use this in Render)

## Phase 3: Prepare Environment Variables (2 min)

- [ ] **3.1** Copy Firebase Service Account Key
  - From Phase 2.6, you have a JSON file
  - Open it and copy the **entire JSON content** as a single line
  - This is your `FIREBASE_SERVICE_ACCOUNT_KEY`

- [ ] **3.2** Note your values:
  ```
  FIREBASE_SERVICE_ACCOUNT_KEY: [entire JSON from service account key]
  CORS_ORIGIN: (you'll get this after Render deployment)
  REACT_APP_API_BASE_URL: (you'll get this after Render deployment)
  ```

## Phase 4: Render Setup (10 min)

- [ ] **4.1** Create Render account
  - Go to https://render.com
  - Sign up with GitHub account

- [ ] **4.2** Connect GitHub
  - In Render dashboard, click **New +**
  - Choose **Web Service**
  - Click **Connect account** next to GitHub
  - Authorize Render to access your GitHub
  - Click **Continue**

- [ ] **4.3** Select repository
  - Search for `budget-tracker`
  - Click **Connect**

- [ ] **4.4** Configure deployment

  **General Settings:**
  - Name: `budget-tracker`
  - Root Directory: Leave empty
  - Runtime: `Docker`
  - Region: Pick closest (Ohio, Oregon, Singapore, etc.)
  - Branch: `main`
  - Build Command: Leave empty
  - Start Command: Leave empty

  **Environment Variables** - Click **Add Environment Variable** for each:
  
  | Variable | Value |
  |----------|-------|
  | `FIREBASE_SERVICE_ACCOUNT_KEY` | `{"type":"service_account","project_id":"..."}` (entire JSON) |
  | `CORS_ORIGIN` | Will update after first deployment |
  | `REACT_APP_API_BASE_URL` | Will update after first deployment |
  | `NODE_ENV` | `production` |
  | `PORT` | `5000` |

  **Plan Settings:**
  - Select **Free** tier to start (upgrade later if needed)

- [ ] **4.5** Deploy!
  - Click **Create Web Service**
  - Wait for deployment (you'll see logs in real-time)
  - ⏳ Takes 5-10 minutes for first deployment

## Phase 5: Verify Deployment (5 min)

- [ ] **5.1** Check build completion
  - Render dashboard shows green status when complete
  - You'll see a message: "Service is live"
  - URL appears at top: `https://budget-tracker-xxxxx.onrender.com`

- [ ] **5.2** Test health endpoint
  ```bash
  curl https://your-render-url.onrender.com/api/health
  ```
  You should see:
  ```json
  {"status":"OK","message":"Budget Tracker API is running"}
  ```

- [ ] **5.3** Update CORS_ORIGIN and REACT_APP_API_BASE_URL
  - Go back to Render service settings
  - Click **Environment**
  - Update `CORS_ORIGIN`: `https://your-actual-render-url.onrender.com`
  - Update `REACT_APP_API_BASE_URL`: `https://your-actual-render-url.onrender.com/api`
  - Click **Deploy** or wait for automatic redeployment
  - ⏳ Takes 3-5 minutes

- [ ] **5.4** Open your app in browser
  - Visit: `https://your-render-url.onrender.com`
  - You should see the Budget Tracker login page

## Phase 6: Test Functionality (5 min)

- [ ] **6.1** Test registration
  - Click "Register"
  - Enter name, email, password
  - Submit
  - Should redirect to Dashboard

- [ ] **6.2** Test transaction creation
  - In Dashboard, create a test transaction
  - Refresh page
  - Transaction should still be there (saved to MongoDB)

- [ ] **6.3** Test logout and login
  - Click user menu → Logout
  - Log back in with your credentials
  - Should see your previous data

- [ ] **6.4** Check browser console (F12)
  - Should see no errors
  - API calls should succeed (green in Network tab)

## Phase 7: Troubleshooting (if needed)

### ❌ Problem: "Cannot connect to Firebase"

**Solution:**
- [ ] Check `FIREBASE_SERVICE_ACCOUNT_KEY` is correct (entire JSON)
- [ ] Verify Firebase project ID in the service account key
- [ ] Check Firestore database is created in Firebase console
- [ ] Check security rules are published in Firestore
- [ ] Manual redeploy in Render

### ❌ Problem: "Permission denied" errors

**Solution:**
- [ ] Check Firestore security rules (should allow user data access)
- [ ] Verify FIREBASE_SERVICE_ACCOUNT_KEY is properly set
- [ ] Manual redeploy after updating environment variables

### ❌ Problem: "API Error: Cannot GET /"

**Solution:**
- [ ] Check Render build logs for errors (Logs tab)
- [ ] Verify `nginx.conf` exists in root directory
- [ ] Check `Dockerfile` exists in root directory
- [ ] Manual redeploy

### ❌ Problem: "CORS Error when API called from browser"

**Solution:**
- [ ] Update `CORS_ORIGIN` to your Render URL
- [ ] Update `REACT_APP_API_BASE_URL` to your Render URL with `/api`
- [ ] Wait for redeployment to complete
- [ ] Clear browser cache (Ctrl+Shift+Delete)

### ❌ Problem: "Register button doesn't work"

**Solution:**
- [ ] Check browser Network tab (F12)
- [ ] Look for failed API calls
- [ ] Check Render logs for backend errors
- [ ] Verify MongoDB is connected (check health endpoint)

## Phase 8: Optional Enhancements

- [ ] **8.1** Add custom domain
  - Render dashboard → Your service → Settings
  - Scroll to **Custom Domains**
  - Add your domain (e.g., `budget.yoursite.com`)
  - Follow DNS instructions

- [ ] **8.2** Set up auto-deploy
  - Render dashboard → Your service → Settings
  - Toggle **Auto-Deploy** ON
  - Now every GitHub push auto-deploys

- [ ] **8.3** Monitor logs
  - Render dashboard → Your service → Logs
  - Monitor in real-time during development

- [ ] **8.4** View metrics
  - Render dashboard → Your service → Metrics
  - Check CPU, Memory, Request count

## Phase 9: Updates & Maintenance

To update your application:

- [ ] **9.1** Make code changes locally
- [ ] **9.2** Commit and push to GitHub
  ```bash
  git add .
  git commit -m "Your changes"
  git push origin main
  ```
- [ ] If auto-deploy enabled: Render automatically redeploys
- [ ] If manual: Go to Render dashboard → **Manual Deploy** → **Deploy Latest Commit**

## Quick Reference

| Item | Value |
|------|-------|
| **Render Dashboard** | https://dashboard.render.com |
| **GitHub Repository** | https://github.com/YOUR_USERNAME/budget-tracker |
| **Firebase Console** | https://console.firebase.google.com |
| **App URL** | https://your-render-url.onrender.com |
| **API Health Check** | https://your-render-url.onrender.com/api/health |
| **Firebase Setup Guide** | See FIREBASE_SETUP.md |

## Success Indicators ✅

Your deployment is successful when:

- [ ] ✅ Render shows "Service is live" with green status
- [ ] ✅ Health endpoint returns `{"status":"OK",...}`
- [ ] ✅ App loads at `https://your-render-url.onrender.com`
- [ ] ✅ Can register new account
- [ ] ✅ Can create and save transactions
- [ ] ✅ Can logout and login again
- [ ] ✅ No CORS errors in browser console
- [ ] ✅ No MongoDB connection errors in Render logs

---

## Getting Help

If you get stuck:

1. **Check Render Logs**
   - Render dashboard → Your service → Logs tab
   - Look for error messages

2. **Check MongoDB Atlas Status**
   - MongoDB dashboard → Check cluster is running
   - Check connection string matches

3. **Verify Environment Variables**
   - Render dashboard → Your service → Environment
   - Double-check all values match what you set

4. **Check Browser Console**
   - Open app in browser
   - Press F12 → Console tab
   - Look for errors

5. **Clear & Restart**
   - Clear browser cache
   - Hard refresh (Ctrl+F5)
   - Manual redeploy in Render

---

**Congratulations!** Your Budget Tracker is now deployed on Render! 🎉

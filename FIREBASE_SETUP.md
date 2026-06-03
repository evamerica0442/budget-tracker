# 🔥 Budget Tracker - Firebase Setup Guide

## Overview
Your Budget Tracker backend has been migrated from MongoDB to **Firebase** with **Firestore** as the database and **Firebase Authentication** for user management.

## What Changed

### Backend Architecture
- ✅ **Removed**: MongoDB/Mongoose
- ✅ **Removed**: bcryptjs (password hashing)
- ✅ **Removed**: JWT manual token creation
- ✅ **Added**: Firebase Admin SDK
- ✅ **Database**: Firestore (replaces MongoDB)
- ✅ **Authentication**: Firebase Auth (replaces local user schema)
- ✅ **Security**: Firebase token verification

### API Compatibility
All API endpoints remain the **same** - no frontend changes needed!
- `/api/auth/register` - Create account with Firebase Auth
- `/api/auth/login` - Login and get Firebase token
- `/api/transactions/*` - Firestore-backed operations
- `/api/categories/*` - Firestore-backed operations

## Prerequisites

1. **Firebase Project** (free tier available)
2. **Google Cloud Account** (required for Firebase)
3. **Node.js v14+**
4. **npm or yarn**

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
- Visit: https://console.firebase.google.com
- Click **"Create a project"**

### 1.2 Configure Project
- **Project name**: `budget-tracker`
- **Google Analytics**: Optional (you can skip)
- Click **"Create project"**
- Wait for project to initialize (~2 minutes)

## Step 2: Set Up Firestore Database

### 2.1 Create Firestore Database
1. In Firebase console, go to **"Firestore Database"** (left sidebar)
2. Click **"Create database"**
3. **Start in production mode** (we'll add security rules later)
4. **Location**: Select closest region to your users
5. Click **"Create"**

### 2.2 Set Up Security Rules
1. In Firestore, go to **"Rules"** tab
2. Replace default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      // User's transactions and categories
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Deny access to all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

## Step 3: Set Up Firebase Authentication

### 3.1 Enable Email/Password Auth
1. In Firebase console, go to **"Authentication"** (left sidebar)
2. Click **"Get started"**
3. Under **"Sign-in method"**, click **"Email/Password"**
4. **Enable** the toggle
5. Click **"Save"**

## Step 4: Create Service Account Key

### 4.1 Generate Key
1. In Firebase console, click **"Settings"** ⚙️ (top right)
2. Go to **"Project settings"**
3. Click **"Service accounts"** tab
4. Click **"Generate new private key"**
5. **Save the JSON file securely** - this is your credentials!

### 4.2 Extract Key Contents
1. Open the downloaded JSON file
2. Copy the entire JSON content
3. **This becomes your `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable**

## Step 5: Configure Environment Variables

### 5.1 Local Development
Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"budget-tracker-xxx",...}'
```

**Important**: 
- Copy the entire JSON from Step 4.2 as a single line string
- Wrap it in single quotes
- Escape any inner quotes if needed

### 5.2 For Render Deployment
You'll add `FIREBASE_SERVICE_ACCOUNT_KEY` as an environment variable in Render dashboard.

## Step 6: Install Dependencies

```bash
cd backend
npm install
```

This will install firebase-admin which replaces mongoose, bcryptjs, and jsonwebtoken.

## Step 7: Test Locally

### 7.1 Start Backend
```bash
cd backend
npm run dev
# Should show: "✅ Firebase initialized successfully"
```

### 7.2 Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

You should see:
```json
{"status":"OK","message":"Budget Tracker API is running"}
```

### 7.3 Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"TestPassword123"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "firebase-uid-here",
    "name": "Test User",
    "email": "test@example.com"
  },
  "token": "firebase-custom-token",
  "message": "Registration successful"
}
```

## Firestore Database Structure

Your data is organized like this:

```
Firestore
├── users/
│   └── {userId}/
│       ├── name: string
│       ├── email: string
│       ├── createdAt: timestamp
│       ├── categories/
│       │   └── {categoryId}/
│       │       ├── name: string
│       │       ├── displayName: string
│       │       ├── type: string (income/expense)
│       │       ├── color: string
│       │       └── createdAt: timestamp
│       └── transactions/
│           └── {transactionId}/
│               ├── type: string
│               ├── amount: number
│               ├── description: string
│               ├── category: string
│               ├── date: timestamp
│               └── createdAt: timestamp
```

## API Changes Summary

### Auth Routes
| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/auth/register` | POST | Uses Firebase Auth instead of bcryptjs |
| `/api/auth/login` | POST | Returns Firebase custom token instead of JWT |

### Request/Response Format
**Register Request:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Register Response:**
```json
{
  "user": { "id": "uid", "name": "...", "email": "..." },
  "token": "firebase-custom-token",
  "message": "Registration successful"
}
```

**Authentication Header:**
```
Authorization: Bearer <firebase-custom-token>
```

## Frontend Integration

### Update AuthContext (if using custom auth)
The backend returns the same token format, so no major changes needed. Just ensure:

1. Store the token from login/register response
2. Send it in Authorization header for all API calls
3. Token verification happens server-side via Firebase

### Example API Call:
```javascript
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password })
});

const { token, user } = await response.json();
// Store token in localStorage
localStorage.setItem('authToken', token);
// Use in subsequent calls: Authorization: Bearer {token}
```

## Deploying to Render

### Key Points
1. **No MongoDB setup needed** - Firestore is cloud-hosted
2. **Service Account Key** - Add as environment variable in Render
3. **No database migrations** - Just update the env var

### Steps
1. Push code to GitHub
2. Create Render Web Service (Docker)
3. Add `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable
4. Deploy!

See `RENDER_DEPLOYMENT_FIREBASE.md` for complete deployment guide.

## Firestore Pricing

### Free Tier Includes
- 1 GB storage
- 50,000 read operations per day
- 20,000 write operations per day
- Enough for small projects and testing

### Upgrade When Needed
- Pay as you go
- Automatic scaling
- No surprise bills with limits set

## Security Best Practices

1. ✅ **Service Account Key** - Keep it secret!
   - Never commit to GitHub
   - Use environment variables
   - Rotate keys periodically

2. ✅ **Firestore Rules** - Always enforce user isolation
   - Users can only access their own data
   - Admin operations restricted

3. ✅ **HTTPS** - Always use HTTPS in production
   - Render provides free SSL

4. ✅ **Backups** - Firestore auto-backs up
   - Access via Firebase console

## Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT_KEY not set"
- **Solution**: Ensure environment variable is set with full JSON content
- Test locally: `echo $FIREBASE_SERVICE_ACCOUNT_KEY`

### Error: "Permission denied" when accessing Firestore
- **Solution**: Check security rules (Step 2.2)
- Ensure user ID matches the token

### Error: "User already exists"
- **Solution**: User exists in Firebase Auth
- Delete from Firebase console or use different email

### Registration/Login returns 500
- **Solution**: Check Render logs or backend console
- Verify Firebase project ID in service account key
- Ensure Firestore database is created

## Migrating from MongoDB (if needed)

If you had existing MongoDB data:

1. Export data from MongoDB
2. Transform to Firestore structure
3. Use `/api/transactions/bulk/import` endpoint
4. Use `/api/categories/bulk/seed` endpoint

See Firebase Admin SDK docs for batch imports.

## Additional Resources

- **Firebase Console**: https://console.firebase.google.com
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **Firebase Auth Docs**: https://firebase.google.com/docs/auth
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Create service account key
3. ✅ Add environment variables
4. ✅ Test locally
5. ✅ Deploy to Render
6. ✅ Test in production

---

**Your Firebase migration is complete!** 🎉

All existing API endpoints work the same way. No frontend changes required (unless you want to integrate Firebase Client SDK for additional features).

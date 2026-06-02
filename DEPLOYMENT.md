# 🚀 Deployment Guide

Complete these steps to deploy your Bookkeeping Platform to Vercel.

## Step 1: Firebase Setup (10 min)

### Create Firebase Project
1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Create a project"
3. Name it: `bookkeeping-platform`
4. Accept defaults, click Create

### Enable Services
1. In Firebase Console, go to **Build → Firestore Database**
   - Click "Create Database"
   - Select "Start in production mode"
   - Select a region (e.g., `us-central1`)
   - Click "Create"

2. Go to **Build → Authentication**
   - Click "Get Started"
   - Enable "Email/Password"
   - Click "Enable"

### Get Credentials
1. Click ⚙️ (Settings) → Project Settings
2. Scroll to "Your apps" section
3. Click "Web" (</>) icon
4. Copy the config values:
   ```javascript
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

### Set Firestore Rules
1. Go to **Firestore Database → Rules**
2. Replace with:
   ```firestore
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth.uid == userId;
       }
       match /ledger_entries/{entryId} {
         allow read, write: if request.auth.uid == resource.data.userId;
       }
       match /clients/{clientId} {
         allow read, write: if request.auth.uid == resource.data.userId;
       }
       match /reports/{reportId} {
         allow read, write: if request.auth.uid == resource.data.userId;
       }
     }
   }
   ```
3. Click "Publish"

## Step 2: GitHub Setup (5 min)

1. Create GitHub account at [github.com](https://github.com)
2. Create new repository: `bookkeeping-platform`
3. Don't initialize with README
4. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/bookkeeping-platform.git
   git push -u origin main
   ```

## Step 3: Vercel Deployment (10 min)

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign up" (GitHub OAuth recommended)
3. Click "Import Project"
4. Select your GitHub repository
5. Vercel will auto-detect Next.js
6. Click "Continue"

### Add Environment Variables
Click "Environment Variables" and add:
- `NEXT_PUBLIC_FIREBASE_API_KEY` = your apiKey
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = your authDomain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = your projectId
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = your storageBucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = your messagingSenderId
- `NEXT_PUBLIC_FIREBASE_APP_ID` = your appId

7. Click "Deploy"
8. Wait for build to complete (2-3 min)

## Step 4: Test Your App

1. Once deployed, Vercel gives you a URL (e.g., `https://bookkeeping-platform.vercel.app`)
2. Open the URL in browser
3. Click "Sign Up"
4. Create an account with email
5. You should be redirected to Dashboard
6. Try importing a CSV file

## Step 5: Enable Mobile App Testing (Optional)

### With Expo (Easiest)

1. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```

2. Go to mobile app folder:
   ```bash
   cd apps/mobile
   ```

3. Start Expo:
   ```bash
   expo start
   ```

4. Scan QR code with Expo Go app (iOS/Android)

## CSV Import Example

Create a file `sample.csv`:
```csv
Order Date,Order ID,Item Type,Sales Channel,Total Revenue,Total Cost,Region,Country
2024-06-01,ORD001,Beverages,Online,150.00,75.00,North America,USA
2024-06-01,ORD002,Snacks,Retail,89.99,35.50,Europe,UK
2024-06-02,ORD003,Fruits,Online,200.00,100.00,Asia,Japan
```

Then in your Dashboard:
1. Go to "Import Data" tab
2. Upload `sample.csv`
3. You'll see real-time metrics update

## Troubleshooting

### Firebase Authentication Error
- ✅ Check credentials in `.env.local` match Firebase Console
- ✅ Ensure your domain is authorized: Firebase Console → Authentication → Settings → Authorized domains (add your Vercel URL)

### Firestore Permission Denied
- ✅ Check Firestore Rules (see Step 1)
- ✅ Ensure user is authenticated before accessing database

### CSV Import Not Working
- ✅ Check CSV column names match exactly
- ✅ Verify data types (dates should be YYYY-MM-DD)

## Next Steps

1. **Email Reports** (Week 2)
   - Add Sendgrid API key
   - Create email templates
   - Set up scheduled reports

2. **Client Management** (Week 2)
   - Create client accounts
   - Generate sharable report links
   - Set custom fields per client

3. **Mobile App** (Week 3)
   - Add real dashboard screens
   - Implement charts in React Native
   - Push notifications

4. **Advanced Features** (Week 4+)
   - Forecasting
   - Anomaly detection
   - Custom integrations (Stripe, Shopify)

## Getting Help

- 📖 Next.js: https://nextjs.org/docs
- 🔥 Firebase: https://firebase.google.com/docs
- 🚀 Vercel: https://vercel.com/docs
- 📊 Recharts: https://recharts.org/en-US/api

---

**You're all set! 🎉**

Your app is now live on Vercel with:
- ✅ Real-time dashboards
- ✅ CSV import
- ✅ Interactive charts
- ✅ Firebase backend
- ✅ Secure authentication

# 🏃 Quick Start Guide

Get your Bookkeeping Platform running locally in 5 minutes.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- Git ([Download](https://git-scm.com))
- A text editor (VS Code recommended)
- Firebase account (free at [firebase.google.com](https://firebase.google.com))

## Local Development (5 min)

### 1. Clone or Extract Project
```bash
# If you have the code, extract it or clone from GitHub
cd bookkeeping-platform
```

### 2. Install Dependencies
```bash
yarn install
# or: npm install
```

### 3. Set Up Firebase

Go to [firebase.google.com](https://firebase.google.com) and:

1. Create a new project
2. Enable Firestore Database
3. Enable Email/Password Authentication
4. Copy your config

### 4. Create `.env.local`
```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your Firebase credentials:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Run Development Server
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## First Time Using

1. **Sign Up** - Create account with email/password
2. **Go to Dashboard** - See empty metrics
3. **Import Data** - Upload a CSV file:
   ```csv
   Order Date,Order ID,Item Type,Total Revenue,Total Cost
   2024-06-01,ORD001,Beverages,150.00,75.00
   2024-06-02,ORD002,Snacks,89.99,35.50
   ```
4. **View Charts** - Watch metrics update in real-time!

## File Structure

```
bookkeeping-platform/
├── apps/
│   ├── web/                      # Next.js web app (main)
│   │   ├── pages/               # Route pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities (Firebase, store)
│   │   └── styles/              # CSS
│   │
│   ├── api/                      # Serverless functions
│   │   └── metrics.ts           # Example endpoint
│   │
│   └── mobile/                   # React Native Expo app
│       ├── App.tsx              # Main app
│       └── app.json             # Expo config
│
├── packages/
│   └── shared/                   # Shared types
│       └── types.ts             # TypeScript interfaces
│
├── README.md                      # Project overview
├── DEPLOYMENT.md                  # Deploy to Vercel
├── .env.example                   # Environment template
└── vercel.json                    # Vercel config
```

## Available Commands

```bash
# Development
yarn dev                 # Start dev server on http://localhost:3000
yarn build               # Build for production
yarn start               # Start production server

# Mobile (Expo)
cd apps/mobile
yarn start              # Start Expo dev server
# Scan QR with Expo Go app

# Utilities
yarn lint               # Check code
```

## Key Features

✅ **Real-time Dashboard** - Live metrics and stats  
✅ **CSV Import** - Bulk upload sales data  
✅ **Interactive Charts** - Revenue & expense trends  
✅ **Firebase Backend** - Secure data storage  
✅ **Mobile App** - React Native with Expo  
✅ **Free Hosting** - Deploy to Vercel  

## Firebase Collections

When you import data, it creates entries in these Firestore collections:

- **users** - Your account info
- **ledger_entries** - Sales transactions (revenue & costs)
- **clients** - Client accounts (multi-tenant)
- **reports** - Report configurations

## Example CSV Format

```csv
Order Date,Order ID,Item Type,Sales Channel,Total Revenue,Total Cost,Region,Country
2024-06-01,ORD001,Beverages,Online,150.00,75.00,North America,USA
2024-06-01,ORD002,Snacks,Retail,89.99,35.50,Europe,UK
2024-06-02,ORD003,Fruits,Online,200.00,100.00,Asia,Japan
2024-06-02,ORD004,Vegetables,Retail,75.50,25.00,North America,Canada
```

Required columns:
- `Order Date` (YYYY-MM-DD format)
- `Total Revenue` (number)
- `Total Cost` (number)
- `Item Type` (category name)
- `Order ID` (unique identifier)

Optional columns:
- `Sales Channel` (Online, Retail, etc.)
- `Region` (geographic region)
- `Country` (country name)

## Troubleshooting

### "Cannot find module 'firebase'"
```bash
yarn install  # Run this in root directory
```

### "localhost:3000 refused to connect"
- Make sure you ran `yarn dev` ✅
- Check if port 3000 is available ✅
- Clear cache: Press Ctrl+Shift+Delete in browser ✅

### "Firebase permission denied"
- Check Firebase Rules in [console.firebase.google.com](https://console.firebase.google.com) ✅
- Verify `.env.local` has correct credentials ✅
- Make sure Firestore is created ✅

### CSV import shows "file not found"
- Check file path in CSV upload ✅
- Verify CSV format matches template ✅
- Check date format is YYYY-MM-DD ✅

## Next Steps

1. **Deploy to Vercel** (10 min)
   - See [DEPLOYMENT.md](DEPLOYMENT.md)
   - Get live URL

2. **Add Email Reports** (Week 2)
   - Integrate Sendgrid
   - Schedule automated emails

3. **Mobile App** (Week 3)
   - Build dashboard screens
   - Add push notifications

4. **Advanced** (Week 4+)
   - Forecasting
   - Client management
   - White-label options

## Resources

- 📖 Next.js Docs: https://nextjs.org/docs
- 🔥 Firebase: https://firebase.google.com/docs
- 📊 Recharts: https://recharts.org
- 🎨 Tailwind CSS: https://tailwindcss.com
- 🚀 Vercel: https://vercel.com/docs

## Support

- 🐛 Report bugs in GitHub Issues
- 💬 Ask questions in Discussions
- 📧 Email: support@bookkeeping.dev

---

**Happy coding! 🚀**

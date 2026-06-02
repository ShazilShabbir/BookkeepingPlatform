# 📊 Bookkeeping Platform

A full-stack real-time analytics platform for sales tracking, reporting, and client dashboards.

## Features

✅ **Real-time Dashboards** - Live metrics and charts  
✅ **CSV Import** - Bulk import sales data with automatic reconciliation  
✅ **Client Management** - Multi-client support with isolated data  
✅ **Interactive Charts** - Revenue, expenses, profit margins, trends  
✅ **Email Reports** - Automated daily/weekly/monthly reports  
✅ **Authentication** - Firebase secure login  
✅ **Mobile App** - React Native Expo app  
✅ **Free Hosting** - Deploy to Vercel (free tier)  

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Vercel Serverless Functions, Firestore
- **Database:** Firebase Firestore (free tier)
- **Charts:** Recharts
- **Mobile:** React Native Expo
- **Email:** Resend or SendGrid (free tier)
- **Hosting:** Vercel (free tier)

## Project Structure

```
bookkeeping-platform/
├── apps/
│   ├── web/              # Next.js web app
│   ├── api/              # Serverless functions
│   └── mobile/           # React Native Expo app
├── packages/
│   └── shared/           # Shared types & utilities
├── .env.example          # Environment template
├── vercel.json           # Vercel deployment config
└── package.json          # Monorepo root
```

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn or npm
- Firebase Project (free tier at firebase.google.com)

### Installation

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd bookkeeping-platform
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up Firebase**
   - Go to [firebase.google.com](https://firebase.google.com)
   - Create a new project
   - Enable Firestore Database (free tier)
   - Enable Email/Password Authentication
   - Copy credentials to `.env.local`

4. **Create `.env.local`** (copy from `.env.example`)
   ```bash
   cp .env.example .env.local
   # Add your Firebase credentials
   ```

5. **Run development server**
   ```bash
   yarn dev
   ```
   Open http://localhost:3000

### Firebase Setup

1. Create collections in Firestore:
   - `users` - User profiles
   - `clients` - Client accounts
   - `ledger_entries` - Sales transactions
   - `reports` - Report configurations

2. Set Firestore security rules:
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
     }
   }
   ```

## Deployment to Vercel

### Easy Deploy (1 click)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables (Firebase credentials)
5. Deploy!

### Manual Deploy

```bash
npm install -g vercel
vercel
```

## Usage

### For Users (Import & View Reports)

1. Sign up at your deployed site
2. Go to Dashboard → Import Data
3. Upload CSV with columns:
   - Order Date
   - Order ID
   - Item Type
   - Total Revenue
   - Total Cost
   - Sales Channel (optional)
   - Region (optional)
4. View real-time metrics and charts

### For Clients (Share Reports)

1. Create client account
2. Generate shareable report links
3. Set up automated email reports
4. Clients can log in to view their data

## CSV Format

```csv
Order Date,Order ID,Item Type,Sales Channel,Total Revenue,Total Cost,Region,Country
2024-06-01,ORD001,Beverages,Online,150.00,75.00,North America,USA
2024-06-02,ORD002,Snacks,Retail,89.99,35.50,Europe,UK
```

## API Endpoints (Coming Soon)

- `POST /api/import` - Upload CSV
- `GET /api/metrics` - Get dashboard metrics
- `GET /api/reports` - List reports
- `POST /api/reports/send` - Send email report

## Mobile App (React Native)

Located in `apps/mobile/`:

```bash
cd apps/mobile
yarn start
# Use Expo Go app to view on device
```

## Contributing

1. Create a branch
2. Make changes
3. Test locally
4. Submit PR

## License

MIT

## Support

- 📧 Email: support@bookkeeping.dev
- 💬 Discord: [Join server]
- 📖 Docs: [Read the docs]

---

**Next Steps:**
- [ ] Deploy to Vercel
- [ ] Set up Firebase project
- [ ] Add Sendgrid for emails
- [ ] Create mobile app UI
- [ ] Build client invite system
- [ ] Add advanced reporting features

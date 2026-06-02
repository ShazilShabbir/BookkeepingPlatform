# Verify that a copilot-instructions.md file in the .github directory exists and work through each item in the task list.

## Bookkeeping Platform - Development Checklist

### Phase 1: Web Dashboard ✅ (In Progress)
- [x] Project structure created
- [x] Next.js app initialized
- [x] Firebase setup
- [x] Authentication (login/signup)
- [x] Dashboard with metrics
- [x] Chart components (Revenue, Expenses)
- [x] CSV import functionality
- [x] Firestore integration
- [ ] Deploy to Vercel

### Phase 2: Email Reports (Week 2)
- [ ] Set up Sendgrid or Resend
- [ ] Email template builder
- [ ] Scheduled report generation
- [ ] Attach PDF reports

### Phase 3: Mobile App (Week 3)
- [ ] React Native Expo setup
- [ ] Login screen
- [ ] Dashboard view
- [ ] Chart components
- [ ] Push notifications

### Phase 4: Advanced Features (Week 4+)
- [ ] Forecasting & predictions
- [ ] Alerts & anomalies
- [ ] Custom integrations (Stripe, Shopify)
- [ ] White-label options

## Getting Started

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Set up Firebase:**
   - Create project at firebase.google.com
   - Enable Firestore & Authentication
   - Copy credentials to `.env.local`

3. **Run development:**
   ```bash
   yarn dev
   ```

4. **Access dashboard:**
   - Open http://localhost:3000
   - Sign up with email
   - Start importing data

## Firebase Firestore Schema

### Collections

#### users
```json
{
  "id": "uid",
  "email": "user@example.com",
  "name": "John Doe",
  "companyName": "Acme Inc",
  "role": "admin",
  "createdAt": "2024-06-02T00:00:00Z",
  "updatedAt": "2024-06-02T00:00:00Z"
}
```

#### ledger_entries
```json
{
  "id": "entry_123",
  "userId": "uid",
  "date": "2024-06-01",
  "description": "Product Sale",
  "category": "beverages",
  "amount": 150.00,
  "type": "income",
  "note": "Channel: Online, Region: NA",
  "source": "sales_2024_06.csv",
  "importedAt": "2024-06-02T00:00:00Z"
}
```

#### clients (for multi-client)
```json
{
  "id": "client_123",
  "userId": "uid",
  "clientName": "Client Name",
  "customFields": {
    "region": "North America",
    "channel": "Online"
  },
  "createdAt": "2024-06-02T00:00:00Z"
}
```

## Deployment to Vercel

1. Push to GitHub
2. Go to vercel.com
3. Import repository
4. Add environment variables:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - (and others from .env.example)
5. Deploy!

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Useful Commands

```bash
# Development
yarn dev              # Start dev server
yarn build            # Build for production
yarn start            # Start production server

# Mobile
yarn mobile           # Start Expo dev server

# Utilities
yarn lint             # Run linter
yarn format           # Format code
```

## Project Timeline

- **Week 1:** Web dashboard with auth, import, charts ✅
- **Week 2:** Email reports & sharing
- **Week 3:** Mobile app
- **Week 4+:** Advanced features

## Resources

- Next.js: https://nextjs.org/docs
- Firebase: https://firebase.google.com/docs
- Recharts: https://recharts.org
- Tailwind: https://tailwindcss.com
- Vercel: https://vercel.com/docs


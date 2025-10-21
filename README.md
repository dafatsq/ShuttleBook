# ShuttleBook

A minimal badminton court booking web app built with Next.js (App Router), TypeScript, Tailwind CSS, and Firebase Firestore.

Features:
- Select a date, court, and multiple 30-minute time slots
- Past slots and already booked slots are disabled
- Summary and mock payment page that writes booking to Firestore
- Dark mode toggle with persistence
- No authentication required

## Setup

1. Install dependencies
```powershell
npm install
```

2. Configure Firebase
- Create a Firestore database in test mode.
- Copy `.env.local.example` to `.env.local` and fill your Firebase config.

3. Run the dev server
```powershell
npm run dev
```

Open http://localhost:3000

Notes:
- Bookings are stored in a `bookings` collection with fields: `date` (yyyy-MM-dd), `courtId` (string), `slots` (string[]), `createdAt` (number).
- Update `START_HOUR`/`END_HOUR` and `COURTS` in `components/booking-page.tsx` as needed.

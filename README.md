# ShuttleBook

Badminton court booking web app built with Next.js (App Router), TypeScript, Tailwind CSS, and Firebase Firestore.

## Features

- Hourly booking slots (07:00–21:00 start times); select multiple hours at once
- Past-time slots are automatically disabled using server time from `/api/time`
- Already-booked slots are disabled based on Firestore availability; rechecked before booking
- Courts with per-hour pricing (IDR): Court A/B/C/D with Rp50k/75k/100k/125k per hour
- Mock payment page that collects name, email, and phone then writes a booking
- Dark mode toggle with persistence (no authentication required)
- Clean, responsive UI with Tailwind and iconography

Tech stack: Next.js 14, React 18, TypeScript, Tailwind CSS 3, Firebase v10 (Firestore), date-fns, lucide-react.

## Quick start

Prerequisites: Node.js 18+ and npm.

1) Install dependencies

```powershell
npm install
```

2) Configure Firebase

- In Firebase console, create a project and enable Firestore (Start in test mode for local development).
- Copy `.env.local.example` to `.env.local` and fill in your Firebase project values.

3) Run the dev server

```powershell
npm run dev
```

Open https://shuttlebook.vercel.app

## Environment variables

Create `.env.local` with the following keys (client-side safe):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

If these aren’t set, the app will run in a mock mode where availability reads/writes are no-ops.

## Firestore data model

Collection: `bookings`

Each document includes:

- `date`: string (format `yyyy-MM-dd`)
- `courtId`: string (e.g., `court-a`)
- `slots`: string[] (hour starts like `"08:00"`)
- `name`: string
- `email`: string
- `phone`: string
- `createdAt`: number (milliseconds since epoch; client timestamp)

Notes:

- Availability is computed by querying all docs for a given `date` and `courtId`, then collecting their `slots`.
- On the payment step, availability is rechecked before creating a booking to avoid double-booking.

## Scripts

- `npm run dev` – Start the Next.js dev server on port 3000
- `npm run build` – Build the production app
- `npm run start` – Start the production server
- `npm run lint` – Run Next.js ESLint

## Configuration points

- Booking window hours are defined in `components/booking-page.tsx` via `START_HOUR` and `END_HOUR`.
- Court list and pricing are defined in `lib/courts.ts`.
- Server time is exposed at `app/api/time/route.ts` and used client-side to avoid device clock drift.

## Firestore security rules (development)

For local testing, you can use permissive rules. Don’t use these in production:

```
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /{document=**} {
			allow read, write: if true; // DEVELOPMENT ONLY
		}
	}
}
```

Production hardening suggestions:

- Restrict writes to the `bookings` collection only.
- Validate document shape and types (e.g., `date` string, `slots` is list of strings, etc.).
- Consider using Firestore `serverTimestamp()` for `createdAt` via Cloud Functions or server actions.

## Troubleshooting

- “Firebase not configured. This is a mock flow only.” – Ensure all `NEXT_PUBLIC_FIREBASE_*` variables are set in `.env.local`, stop the dev server, and start it again.
- No slots are disabled – If using mock mode (no Firebase), availability is not persisted; set up Firestore to see real availability.
- Past-slot behavior – The client regularly syncs to server time and updates every minute; past slots on the selected day are disabled and dates roll forward at midnight.

## License

MIT

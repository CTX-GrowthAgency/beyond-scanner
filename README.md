# BEYOND Scanner — Standalone QR Verification App

A secure, production-grade ticket scanning app for Beyond events. Completely separate from the main booking app — shares only the Firebase database (read-mostly, atomic writes only to `scannedAt`/`scannedBy`).

---

## Security Model

| Layer | Protection |
|---|---|
| **Authentication** | httpOnly cookie, secure, sameSite=strict, 12h session |
| **Route protection** | Edge middleware — all `/scan` routes require valid session |
| **DB writes** | Firestore transaction — only `scannedAt` + `scannedBy` written, nothing else |
| **Race conditions** | Firestore transaction prevents simultaneous double-scan |
| **Input sanitisation** | bookingId validated: 1–100 chars, no path-traversal slashes |
| **Method protection** | API routes explicitly reject GET/PUT/DELETE/PATCH |
| **No data corruption** | `paymentStatus`, `ticketStatus`, `tickets`, `pricing` — never touched |

---

## Quick Start

### 1. Clone and install

```bash
git clone <this-repo>
cd beyond-scanner
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Strong random scanner password — share with event staff only
SCANNER_SECRET=your_strong_secret_here

# Firebase credentials (use base64-encoded service account JSON)
FIREBASE_SERVICE_ACCOUNT_JSON=<base64 of serviceAccount.json>

# Optional: label written to DB for audit trail
SCANNER_OPERATOR=scanner-device-1
```

**Getting Firebase service account JSON:**
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key → download JSON
3. Encode: `cat serviceAccount.json | base64 -w0`
4. Paste value into `FIREBASE_SERVICE_ACCOUNT_JSON`

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## Firestore Security Rules

Add these rules to your **existing** `beyond` project's Firestore rules:

```javascript
// The scanner app uses Firebase Admin SDK (server-side) so these rules
// don't apply to it directly. However, if you use client-side Firebase
// anywhere, ensure:
match /bookings/{id} {
  // Only allow updates to scannedAt and scannedBy via Admin SDK
  // (enforced in API route — not via client SDK)
}
```

The scanner uses **Firebase Admin SDK** exclusively — it bypasses client-side rules and uses service account credentials. Security is enforced in the API route code.

---

## Scan Outcomes

| Outcome | Meaning | Display |
|---|---|---|
| `valid` | Payment complete, not previously scanned → **writes `scannedAt`** | 🟢 Green |
| `already_scanned` | Previously scanned — shows when it was scanned | 🟡 Amber |
| `invalid_payment` | `paymentStatus !== "completed"` | 🔴 Red |
| `cancelled` | `ticketStatus === "cancelled"` | 🔴 Red |
| `not_found` | No booking with that ID | ⚫ Grey |
| `error` | Network/DB error | 🔴 Red |

---

## QR Code Format

The scanner handles all three QR formats the main app might generate:

1. **Raw booking ID**: `BK-XXXXXXXX`
2. **Full URL**: `https://bookonbeyond.vercel.app/bookings/BK-XXXXXXXX`
3. **URL with query param**: `https://bookonbeyond.vercel.app/tickets?bookingId=BK-XXXXXXXX`

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel --prod
```

Set all env vars in the Vercel dashboard under Project → Settings → Environment Variables.

### Rate limiting

Add rate limiting at the edge layer (Vercel, Cloudflare, nginx):
- `/api/scan` — max 30 req/min per IP
- `/api/auth/login` — max 5 req/min per IP (brute-force protection)

### Multiple devices / operators

Deploy once, set `SCANNER_OPERATOR` per device (e.g. `scanner-gate-a`, `scanner-gate-b`). The operator value is written to `scannedBy` in Firestore for the audit trail.

---

## Project Structure

```
beyond-scanner/
├── app/
│   ├── api/
│   │   ├── scan/route.ts          # Core scan endpoint (Firestore transaction)
│   │   └── auth/
│   │       ├── login/route.ts     # Login endpoint
│   │       └── logout/route.ts    # Logout endpoint
│   ├── login/
│   │   ├── page.tsx
│   │   └── LoginClient.tsx        # Login UI
│   ├── scan/
│   │   ├── page.tsx
│   │   └── ScannerClient.tsx      # Main scanner UI
│   ├── layout.tsx
│   └── page.tsx                   # Redirects → /scan
├── lib/
│   ├── firebase/admin.ts          # Firebase Admin singleton
│   └── auth/index.ts              # Auth constants
├── middleware.ts                  # Route protection (edge)
├── types/index.ts                 # Shared TypeScript types
├── styles/globals.css             # Full UI styles
├── .env.example                   # Environment template
└── README.md
```

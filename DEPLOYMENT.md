# Production Deployment Guide

## 🚀 Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

## 🔐 Environment Variables (Required)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

### Required
- `SCANNER_SECRET` - Strong random string (min 32 chars)
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Base64 encoded service account

### Optional
- `SCANNER_OPERATOR` - Device identifier (e.g., "scanner-gate-a")
- `NODE_ENV` - Set to "production"

## 📊 Firestore Index

Create this index in Firebase Console:

1. Firestore → Indexes → Create Index
2. Collection: `bookings`
3. Fields:
   - `bookingId` (Ascending)
   - `paymentStatus` (Ascending)
4. Query scope: Collection

Or deploy with: `firebase deploy --only firestore:indexes`

## 🛡️ Security Features Enabled

- ✅ Rate limiting (5 login/min, 30 scan/min per IP)
- ✅ Security headers (XSS, CSRF protection)
- ✅ Session-based authentication
- ✅ Input sanitization
- ✅ Firestore transactions (race condition protection)
- ✅ Method protection (POST only)

## 💰 Free Tier Optimization

- ✅ Minimal Firestore reads (1 per scan)
- ✅ Efficient queries with composite index
- ✅ No unnecessary document reads
- ✅ Compressed responses
- ✅ Edge caching for static assets

## 🌍 Performance Optimizations

- ✅ Singapore region deployment (`sin1`)
- ✅ Gzip compression
- ✅ Bundle optimization
- ✅ Lazy loading for QR scanner
- ✅ SWC minification

## 📱 Multi-Device Setup

For multiple scanner devices:

1. Deploy once to Vercel
2. Set different `SCANNER_OPERATOR` per device:
   - Device 1: `SCANNER_OPERATOR=scanner-gate-a`
   - Device 2: `SCANNER_OPERATOR=scanner-gate-b`
3. Each device writes its identifier to `scannedBy` field

## 🔍 Monitoring

Monitor these metrics in Vercel Analytics:
- API response times (target: <200ms)
- Error rates (target: <1%)
- Rate limit hits
- Geographic distribution

## 🚨 Security Checklist

- [ ] Strong `SCANNER_SECRET` (32+ chars, random)
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limits configured
- [ ] Security headers present
- [ ] Firebase service account has minimal permissions
- [ ] Environment variables hidden from logs

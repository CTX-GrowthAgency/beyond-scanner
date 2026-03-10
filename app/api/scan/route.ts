/**
 * app/api/scan/route.ts
 *
 * POST /api/scan  { bookingId: string }
 *
 * SECURITY MODEL:
 *  1. Requires valid scanner session cookie — unauthenticated → 401.
 *  2. All DB reads + conditional write happen inside a Firestore TRANSACTION.
 *     Two simultaneous scans of the same QR → only one "valid", other gets
 *     "already_scanned". No double-entry is ever possible.
 *  3. ONLY scannedAt + scannedBy are written. Zero other fields are touched.
 *     paymentStatus, ticketStatus, tickets, pricing → completely untouched.
 *  4. bookingId sanitised: 1-100 printable chars, no slashes.
 *  5. Rate limiting: configure at Vercel/nginx/CDN layer (see deployment guide).
 *  6. Audit trail: scannedBy = SCANNER_OPERATOR env var (operator identifier).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { SCANNER_COOKIE, SCANNER_SECRET } from "@/lib/auth";
import type { BookingDoc, EventDoc, UserDoc, ScanResponse } from "@/types";

const OPERATOR = process.env.SCANNER_OPERATOR ?? "beyond-scanner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeBookingId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  // Must be 1–100 printable chars; no forward/back slashes (Firestore path safety)
  if (!/^[^\\/]{1,100}$/.test(trimmed)) return null;
  return trimmed;
}

function toIso(t?: Timestamp | null): string | undefined {
  return t ? t.toDate().toISOString() : undefined;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ScanResponse>> {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const store  = await cookies();
  const cookie = store.get(SCANNER_COOKIE)?.value;

  if (!SCANNER_SECRET) {
    console.error("[scanner] SCANNER_SECRET env var is not set — refusing all requests");
    return NextResponse.json(
      { outcome: "error", message: "Scanner not configured" },
      { status: 503 }
    );
  }
  if (cookie !== SCANNER_SECRET) {
    return NextResponse.json(
      { outcome: "error", message: "Unauthorised" },
      { status: 401 }
    );
  }

  // ── 2. Parse + validate input ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { outcome: "error", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const bookingId = sanitizeBookingId((body as Record<string, unknown>)?.bookingId);
  if (!bookingId) {
    return NextResponse.json(
      { outcome: "error", message: "Missing or invalid bookingId" },
      { status: 400 }
    );
  }

  const db = getDb();

  try {
    // ── 3. Firestore Transaction ──────────────────────────────────────────────
    //
    // The transaction guarantees: between reading scannedAt and writing it,
    // no other process can write. Firestore auto-retries on contention.
    //
    const result = await db.runTransaction(async (txn) => {
      // 3a. Find booking by bookingId field (not doc ID — matches beyond's schema)
      const snap = await txn.get(
        db.collection("bookings").where("bookingId", "==", bookingId).limit(1)
      );

      if (snap.empty) {
        return { outcome: "not_found" } as ScanResponse;
      }

      const bookingDocRef = snap.docs[0].ref;
      const booking = snap.docs[0].data() as BookingDoc;

      // 3b. Payment check — must be completed before anything else
      if (booking.paymentStatus !== "completed") {
        return {
          outcome: "invalid_payment",
          message: `Payment status is "${booking.paymentStatus}"`,
          booking: {
            bookingId:     booking.bookingId,
            eventId:       booking.eventId,
            tickets:       booking.tickets ?? [],
            pricing:       booking.pricing,
            paymentStatus: booking.paymentStatus,
            ticketStatus:  booking.ticketStatus,
            paidAt:        toIso(booking.paidAt),
            createdAt:     toIso(booking.createdAt) ?? "",
          },
        } as ScanResponse;
      }

      // 3c. Cancellation check
      if (booking.ticketStatus === "cancelled") {
        const [evSnap, userSnap] = await Promise.all([
          booking.eventId ? txn.get(db.collection("events").doc(booking.eventId)) : null,
          booking.uid     ? txn.get(db.collection("users").doc(booking.uid))      : null,
        ]);
        const ev   = evSnap?.data()   as EventDoc | undefined;
        const user = userSnap?.data() as UserDoc  | undefined;

        return {
          outcome: "cancelled",
          booking: {
            bookingId:     booking.bookingId,
            eventId:       booking.eventId,
            tickets:       booking.tickets ?? [],
            pricing:       booking.pricing,
            paymentStatus: booking.paymentStatus,
            ticketStatus:  booking.ticketStatus,
            paidAt:        toIso(booking.paidAt),
            createdAt:     toIso(booking.createdAt) ?? "",
          },
          event: ev ? { title: ev.title, date: toIso(ev.date) ?? "", venueName: ev.venueName } : undefined,
          user:  user ? { name: user.name, email: user.email, phone: user.phone } : undefined,
        } as ScanResponse;
      }

      // 3d. Fetch related event + user inside transaction (consistency)
      const [evSnap, userSnap] = await Promise.all([
        booking.eventId ? txn.get(db.collection("events").doc(booking.eventId)) : null,
        booking.uid     ? txn.get(db.collection("users").doc(booking.uid))      : null,
      ]);
      const ev   = evSnap?.data()   as EventDoc | undefined;
      const user = userSnap?.data() as UserDoc  | undefined;

      const bookingInfo = {
        bookingId:     booking.bookingId,
        eventId:       booking.eventId,
        tickets:       booking.tickets ?? [],
        pricing:       booking.pricing,
        paymentStatus: booking.paymentStatus,
        ticketStatus:  booking.ticketStatus,
        paidAt:        toIso(booking.paidAt),
        createdAt:     toIso(booking.createdAt) ?? "",
      };
      const eventInfo = ev
        ? { title: ev.title, date: toIso(ev.date) ?? "", venueName: ev.venueName }
        : undefined;
      const userInfo = user
        ? { name: user.name, email: user.email, phone: user.phone }
        : undefined;

      // 3e. Already scanned?
      if (booking.scannedAt) {
        return {
          outcome:       "already_scanned",
          booking:       bookingInfo,
          event:         eventInfo,
          user:          userInfo,
          scannedAt:     new Date().toISOString(),
          scannedAtPrev: toIso(booking.scannedAt)!,
        } as ScanResponse;
      }

      // 3f. VALID — atomic write of ONLY scannedAt + scannedBy
      //     Nothing else in the document is touched.
      txn.update(bookingDocRef, {
        scannedAt: FieldValue.serverTimestamp(),
        scannedBy: OPERATOR,
      });

      return {
        outcome:   "valid",
        booking:   bookingInfo,
        event:     eventInfo,
        user:      userInfo,
        scannedAt: new Date().toISOString(),
      } as ScanResponse;
    });

    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    console.error("[scanner] Transaction error:", err);
    return NextResponse.json(
      { outcome: "error", message: "Database error — please retry" },
      { status: 500 }
    );
  }
}

// Block all other HTTP methods
export function GET()    { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export function PUT()    { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export function PATCH()  { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }

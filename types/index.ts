import { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shapes ─────────────────────────────────────────────────

export interface UserDoc {
  name: string;
  email: string;
  phone: string;
  nationality?: string;
  state?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EventDoc {
  title: string;
  date: Timestamp;
  venueName: string;
  status: "active" | "inactive";
  ticketTypes?: Record<string, { price: number; capacity?: number }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TicketLine {
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface BookingDoc {
  uid: string;
  eventId: string;
  bookingId: string;

  tickets: TicketLine[];

  pricing: {
    subtotal: number;
    convenienceFee: number;
    gst: number;
    grandTotal: number;
  };

  cashfreeOrderId?: string;
  paymentReference?: string;
  paymentMethod?: string;
  paymentStatus: "pending" | "completed" | "failed";

  createdAt: Timestamp;
  expiresAt?: Timestamp;
  paidAt?: Timestamp;
  verifiedAt?: Timestamp;
  notificationSentAt?: Timestamp;

  ticketStatus: "pending" | "confirmed" | "cancelled";

  // Written ONLY by the scanner app
  scannedAt?: Timestamp;
  scannedBy?: string;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface BookingInfo {
  bookingId: string;
  eventId: string;
  tickets: TicketLine[];
  pricing: BookingDoc["pricing"];
  paymentStatus: BookingDoc["paymentStatus"];
  ticketStatus: BookingDoc["ticketStatus"];
  paidAt?: string;
  createdAt: string;
}

export interface EventInfo {
  title: string;
  date: string;
  venueName: string;
}

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

export type ScanOutcome =
  | "valid"
  | "already_scanned"
  | "invalid_payment"
  | "cancelled"
  | "not_found"
  | "error";

export type ScanResponse =
  | { outcome: "valid";           booking: BookingInfo; event?: EventInfo; user?: UserInfo; scannedAt: string }
  | { outcome: "already_scanned"; booking: BookingInfo; event?: EventInfo; user?: UserInfo; scannedAt: string; scannedAtPrev: string }
  | { outcome: "invalid_payment"; booking: BookingInfo; event?: EventInfo; user?: UserInfo; message: string }
  | { outcome: "cancelled";       booking: BookingInfo; event?: EventInfo; user?: UserInfo }
  | { outcome: "not_found" }
  | { outcome: "error"; message: string };

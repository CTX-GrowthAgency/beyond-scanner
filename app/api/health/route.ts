// app/api/health/route.ts
// GET — lightweight health check for uptime monitors

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

export async function GET() {
  try {
    // Ping Firestore to confirm connectivity
    const db = getDb();
    await db.collection("_health").limit(1).get();
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[health] Firestore ping failed:", err);
    return NextResponse.json({ ok: false, error: "DB unreachable" }, { status: 503 });
  }
}

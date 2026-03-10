/**
 * app/api/auth/login/route.ts
 *
 * POST /api/auth/login  { password: string }
 *
 * Validates scanner password against SCANNER_SECRET env var.
 * Sets an httpOnly, secure, sameSite=strict cookie on success.
 * Returns 401 on failure — no info leakage.
 *
 * Rate limiting must be applied at edge/CDN level.
 * Failed attempts are logged (without exposing the secret).
 */

import { NextRequest, NextResponse } from "next/server";
import { SCANNER_COOKIE, SCANNER_SECRET } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password = (body as Record<string, unknown>)?.password;

  if (
    typeof password !== "string" ||
    !SCANNER_SECRET ||
    password !== SCANNER_SECRET
  ) {
    // Uniform delay to mitigate timing attacks
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    console.warn("[scanner] Failed login attempt from", req.headers.get("x-forwarded-for") ?? "unknown");
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(SCANNER_COOKIE, SCANNER_SECRET, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/",
    // 12-hour session
    maxAge:   60 * 60 * 12,
  });

  return res;
}

export function GET() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }

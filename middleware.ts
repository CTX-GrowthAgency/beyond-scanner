/**
 * middleware.ts
 *
 * Edge middleware that protects the /scan route.
 * Unauthenticated users → redirected to /login.
 * Already-authenticated users on /login → redirected to /scan.
 */

import { NextRequest, NextResponse } from "next/server";
import { SCANNER_COOKIE, SCANNER_SECRET } from "@/lib/auth";

// Simple in-memory rate limiting (for production, consider Redis/Upstash)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
  return ip;
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimit.get(key);

  if (!record || now > record.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get(SCANNER_COOKIE)?.value;
  const isAuthed = !!SCANNER_SECRET && session === SCANNER_SECRET;

  // Rate limiting for API endpoints
  const ip = getRateLimitKey(req);
  
  if (pathname.startsWith('/api/auth/login')) {
    if (!checkRateLimit(`login:${ip}`, 5, 60 * 1000)) { // 5 requests per minute
      return NextResponse.json(
        { error: 'Too many login attempts' },
        { status: 429 }
      );
    }
  }

  if (pathname.startsWith('/api/scan')) {
    if (!checkRateLimit(`scan:${ip}`, 30, 60 * 1000)) { // 30 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
  }

  // Protect /scan
  if (pathname.startsWith("/scan") && !isAuthed) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && isAuthed) {
    const scanUrl = req.nextUrl.clone();
    scanUrl.pathname = "/scan";
    return NextResponse.redirect(scanUrl);
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ["/scan", "/scan/:path*", "/login", "/api/scan", "/api/auth/login"],
};

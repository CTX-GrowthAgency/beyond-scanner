/**
 * Enhanced security middleware for rate limiting and additional protections
 * Add this to your existing middleware.ts or use as reference
 */

import { NextRequest, NextResponse } from "next/server";
import { SCANNER_COOKIE, SCANNER_SECRET } from "@/lib/auth";

// Simple in-memory rate limiter (for production, use Redis/Upstash)
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

export function securityMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getRateLimitKey(req);

  // Rate limiting for sensitive endpoints
  if (pathname.startsWith('/api/auth/login')) {
    if (!checkRateLimit(ip, 5, 60 * 1000)) { // 5 requests per minute
      return NextResponse.json(
        { error: 'Too many login attempts' },
        { status: 429 }
      );
    }
  }

  if (pathname.startsWith('/api/scan')) {
    if (!checkRateLimit(ip, 30, 60 * 1000)) { // 30 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

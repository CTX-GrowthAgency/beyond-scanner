/**
 * lib/auth/index.ts
 *
 * Scanner authentication constants.
 *
 * SECURITY:
 *  - SCANNER_SECRET must be a long, random secret (32+ chars).
 *  - SCANNER_COOKIE is the cookie name used to carry the session.
 *  - Never log or expose SCANNER_SECRET.
 *
 * Usage: set SCANNER_SECRET in .env.local
 *        set SCANNER_COOKIE_NAME optionally (default: "byd_scanner_session")
 */

export const SCANNER_COOKIE =
  process.env.SCANNER_COOKIE_NAME ?? "byd_scanner_session";

export const SCANNER_SECRET = process.env.SCANNER_SECRET ?? "";

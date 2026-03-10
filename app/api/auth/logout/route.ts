import { NextResponse } from "next/server";
import { SCANNER_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SCANNER_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/",
    maxAge:   0,
  });
  return res;
}

export function GET() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }

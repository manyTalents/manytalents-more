import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/money/verify
 * Validates the user-entered password and returns the API token.
 *
 * Env vars (set in Vercel):
 *   MONEY_PASSWORD  — the human password for the Money login page
 *   MONEY_API_TOKEN — the shared DASHBOARD_TOKEN used by both bot APIs
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expected = process.env.MONEY_PASSWORD;
    const apiToken = process.env.MONEY_API_TOKEN;

    if (!expected || !apiToken) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (password !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ token: apiToken });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

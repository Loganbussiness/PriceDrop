import { NextRequest, NextResponse } from "next/server";
import { runPriceWatch } from "@/lib/price-watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured (local dev) — allow, but log a warning
  if (!secret) {
    console.warn(
      "[cron] CRON_SECRET is not set — endpoint is unauthenticated",
    );
    return true;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runPriceWatch();
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      ...result,
    });
  } catch (error) {
    console.error("[cron] price watch failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

/**
 * GET /api/cron/generate-manifests
 *
 * Safety-net cron: finds all completed gpu_jobs that have no energy manifest
 * and generates them by calling backfill_missing_manifests() (migration 008).
 *
 * Runs every 10 minutes via Vercel Cron (see vercel.json).
 * Idempotent — safe to call multiple times.
 * Capped at 100 jobs per invocation.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  if (!process.env.CRON_SECRET) {
    console.error("[cron/generate-manifests] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Backfill ──────────────────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const startedAt = Date.now();

  const { data, error } = await supabase.rpc("backfill_missing_manifests");

  if (error) {
    console.error("[cron/generate-manifests] backfill RPC error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const results = (data as Array<{ job_id: string; manifest_id: string | null; status: string }>) ?? [];
  const created = results.filter((r) => r.status === "created");
  const failed  = results.filter((r) => r.status.startsWith("error"));

  console.log(
    `[cron/generate-manifests] processed=${results.length} created=${created.length} failed=${failed.length} duration=${Date.now() - startedAt}ms`
  );

  return NextResponse.json({
    success: true,
    processed: results.length,
    created:   created.length,
    failed:    failed.length,
    failures:  failed.length > 0 ? failed.map((r) => ({ job_id: r.job_id, error: r.status })) : undefined,
    duration_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}

// Support POST too so Vercel Cron can use either method
export async function POST(request: NextRequest) {
  return GET(request);
}

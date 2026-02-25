/**
 * POST /api/metrics/jobs/complete
 *
 * Called by the monitoring agent when a tracked job process exits.
 * Sets end_time and is_active=false on the gpu_jobs row.
 * The DB trigger (migration 008) automatically fires generate_energy_manifest().
 *
 * Auth: X-API-Key header (same key used by /api/metrics/ingest)
 *
 * Body:
 *   job_id              string (UUID)   — required
 *   end_time            string (ISO8601) — optional, defaults to now
 *   grid_carbon_intensity number         — optional, g CO2/kWh, default 394
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { createSupabaseServerClient } from "@/lib/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { userId, error: authError } = await validateApiKey(request);
  if (authError || !userId) {
    return NextResponse.json(
      { error: authError ?? "Unauthorized" },
      { status: 401 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { job_id, end_time } = body;

  if (!job_id || typeof job_id !== "string") {
    return NextResponse.json(
      { error: "job_id is required (UUID string)" },
      { status: 400 }
    );
  }

  // Validate UUID format
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(job_id)) {
    return NextResponse.json(
      { error: "job_id must be a valid UUID" },
      { status: 400 }
    );
  }

  // Validate end_time if provided
  let completedAt = new Date().toISOString();
  if (end_time !== undefined) {
    if (typeof end_time !== "string" || isNaN(Date.parse(end_time as string))) {
      return NextResponse.json(
        { error: "end_time must be a valid ISO 8601 timestamp" },
        { status: 400 }
      );
    }
    completedAt = end_time as string;
  }

  const supabase = createSupabaseServerClient();

  // ── Verify job ownership ────────────────────────────────────────────────
  const { data: job, error: fetchError } = await supabase
    .from("gpu_jobs")
    .select("id, end_time, is_active")
    .eq("id", job_id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !job) {
    return NextResponse.json(
      { error: "Job not found or does not belong to this account" },
      { status: 404 }
    );
  }

  // Already completed — idempotent success
  if (job.end_time !== null) {
    return NextResponse.json({
      ok: true,
      job_id,
      end_time: job.end_time,
      message: "Job was already marked complete",
      already_complete: true,
    });
  }

  // ── Mark job complete ───────────────────────────────────────────────────
  // The DB trigger on_job_complete_generate_manifest fires here automatically
  const { error: updateError } = await supabase
    .from("gpu_jobs")
    .update({ end_time: completedAt, is_active: false })
    .eq("id", job_id)
    .eq("user_id", userId);

  if (updateError) {
    console.error("[jobs/complete] update error:", updateError);
    return NextResponse.json(
      { error: `Failed to complete job: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    job_id,
    end_time: completedAt,
    message:
      "Job marked complete. Energy manifest is being generated automatically.",
  });
}

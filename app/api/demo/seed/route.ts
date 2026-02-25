/**
 * POST /api/demo/seed
 *
 * Seeds realistic demo data for the authenticated user.
 * - Generates ~11k gpu_metrics rows across 5 ML jobs
 * - Inserts gpu_jobs and energy_manifests records
 * - Refreshes gpu_metrics_hourly materialized view
 * - Inserts in parallel batches of 500 rows to stay under Supabase limits
 *
 * Idempotent: deletes existing demo data for this user before re-seeding.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseCookieClient } from "@/lib/supabase-server";
import { createSupabaseServerClient } from "@/lib/supabase-client";
import { generateSeedData } from "@/lib/demo-seed";

const BATCH_SIZE      = 500;   // rows per insert call
const MAX_PARALLEL    = 4;     // concurrent insert batches

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function insertBatches<T extends object>(
  table: string,
  rows: T[],
  service: ReturnType<typeof createSupabaseServerClient>
): Promise<number> {
  const batches = chunk(rows, BATCH_SIZE);
  let inserted  = 0;

  // Process MAX_PARALLEL batches at a time
  for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
    const window = batches.slice(i, i + MAX_PARALLEL);
    const results = await Promise.all(
      window.map((batch) =>
        service.from(table).insert(batch).select("count")
      )
    );
    for (const { error, data } of results) {
      if (error) throw new Error(`Insert into ${table} failed: ${error.message}`);
      inserted += data?.length ?? 0;
    }
  }

  return inserted;
}

export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────
  const cookieClient = await createSupabaseCookieClient();
  const {
    data: { user },
    error: authError,
  } = await cookieClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId  = user.id;
  const service = createSupabaseServerClient(); // service role — bypasses RLS

  try {
    // ── 1. Clear existing demo data for this user ─────────────────────
    // Only remove rows that belong to our known demo job IDs so we don't
    // nuke real user data on re-seed.
    const DEMO_JOB_IDS = [
      "a1b2c3d4-0001-4000-8001-000000000001",
      "a1b2c3d4-0002-4000-8002-000000000002",
      "a1b2c3d4-0003-4000-8003-000000000003",
      "a1b2c3d4-0004-4000-8004-000000000004",
      "a1b2c3d4-0005-4000-8005-000000000005",
    ];

    await Promise.all([
      service
        .from("gpu_metrics")
        .delete()
        .eq("user_id", userId)
        .in("job_id", DEMO_JOB_IDS),
      service
        .from("gpu_jobs")
        .delete()
        .eq("user_id", userId)
        .in("id", DEMO_JOB_IDS),
      service
        .from("energy_manifests")
        .delete()
        .eq("user_id", userId)
        .in("job_id", DEMO_JOB_IDS),
    ]);

    // ── 2. Generate seed data ─────────────────────────────────────────
    const { metrics, jobs, manifests } = generateSeedData(userId);

    // ── 3. Insert gpu_jobs first (metrics FK may reference job_id) ────
    const { error: jobsError } = await service.from("gpu_jobs").insert(jobs);
    if (jobsError) throw new Error(`gpu_jobs insert: ${jobsError.message}`);

    // ── 4. Bulk-insert metrics in parallel batches ────────────────────
    await insertBatches("gpu_metrics", metrics, service);

    // ── 5. Insert energy manifests ────────────────────────────────────
    const { error: maniError } = await service
      .from("energy_manifests")
      .insert(manifests);
    if (maniError) throw new Error(`energy_manifests insert: ${maniError.message}`);

    // ── 6. Refresh materialized view so utilization chart works ───────
    const { error: rpcError } = await service.rpc("refresh_gpu_metrics_hourly");
    // Non-fatal: view may not exist on all DB versions
    if (rpcError) {
      console.warn("refresh_gpu_metrics_hourly RPC failed (non-fatal):", rpcError.message);
    }

    return NextResponse.json({
      ok:              true,
      metrics_rows:    metrics.length,
      jobs_seeded:     jobs.length,
      manifests_seeded: manifests.length,
      message:         `Seeded ${metrics.length} metric samples across ${jobs.length} jobs.`,
    });
  } catch (err: unknown) {
    console.error("[demo/seed] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

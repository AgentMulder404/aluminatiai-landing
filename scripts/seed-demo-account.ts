#!/usr/bin/env tsx
/**
 * scripts/seed-demo-account.ts
 *
 * One-time script to create the public demo account and seed it with data.
 * Run with:  npm run seed:demo
 *
 * What it does:
 *   1. Creates demo@aluminatai.com in Supabase Auth (or reuses if exists)
 *   2. Waits for the profile trigger to fire (creates users row + API key)
 *   3. Seeds all demo gpu_metrics, gpu_jobs, energy_manifests
 *   4. Refreshes materialized view
 *   5. Prints the demo credentials to stdout
 *
 * Env vars required (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEMO_ACCOUNT_PASSWORD   (set this before running — min 8 chars)
 */

import { createClient } from "@supabase/supabase-js";
import { generateSeedData } from "../lib/demo-seed";

// ── Load env ──────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL        = "demo@aluminatiai.com";
const DEMO_PASSWORD     = process.env.DEMO_ACCOUNT_PASSWORD ?? "AluminatiDemo2026!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function bulkInsert<T extends object>(table: string, rows: T[]) {
  const batches = chunk(rows, 500);
  let total = 0;
  for (let i = 0; i < batches.length; i += 4) {
    const window = batches.slice(i, i + 4);
    await Promise.all(
      window.map(async (batch) => {
        const { error } = await service.from(table).insert(batch);
        if (error) throw new Error(`${table}: ${error.message}`);
        total += batch.length;
      })
    );
    process.stdout.write(`  ${table}: ${total}/${rows.length} rows\r`);
  }
  console.log(`  ✓ ${table}: ${total} rows inserted`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  AluminatiAI Demo Account Seeder\n");

  // ── Step 1: Get or create auth user ──────────────────────────────────
  console.log(`Creating auth user: ${DEMO_EMAIL}`);

  const { data: listData } = await service.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === DEMO_EMAIL);

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`  ↳ Existing user found: ${userId}`);
    // Update password in case it changed
    await service.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
  } else {
    const { data: created, error } = await service.auth.admin.createUser({
      email:          DEMO_EMAIL,
      password:       DEMO_PASSWORD,
      email_confirm:  true, // skip confirmation email
      user_metadata:  { full_name: "Demo User" },
    });
    if (error || !created.user) {
      console.error("❌  Failed to create user:", error?.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`  ✓ Created: ${userId}`);
  }

  // ── Step 2: Ensure users profile row exists ───────────────────────────
  // The DB trigger fires on auth.users insert, but may not fire for admin
  // creates. Upsert manually to be safe.
  console.log("Ensuring user profile...");
  const { error: profileError } = await service
    .from("users")
    .upsert(
      {
        id:              userId,
        email:           DEMO_EMAIL,
        trial_start_date: new Date().toISOString(),
        trial_end_date:   new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(), // 1 year
        electricity_rate_per_kwh: 0.12,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );
  if (profileError) {
    console.warn("  Profile upsert warning (may already exist):", profileError.message);
  } else {
    console.log("  ✓ Profile ready");
  }

  // ── Step 3: Clear old demo data ───────────────────────────────────────
  console.log("Clearing existing demo data...");
  const DEMO_JOB_IDS = [
    "job-llama3-finetune-001",
    "job-inference-serving-001",
    "job-sdxl-batch-001",
    "job-bert-eval-001",
    "job-data-preproc-abandoned",
  ];
  await Promise.all([
    service.from("gpu_metrics").delete().eq("user_id", userId).in("job_id", DEMO_JOB_IDS),
    service.from("gpu_jobs").delete().eq("user_id", userId).in("id", DEMO_JOB_IDS),
    service.from("energy_manifests").delete().eq("user_id", userId).in("job_id", DEMO_JOB_IDS),
  ]);
  console.log("  ✓ Cleared");

  // ── Step 4: Generate + insert seed data ───────────────────────────────
  console.log("Generating seed data...");
  const { metrics, jobs, manifests } = generateSeedData(userId);
  console.log(
    `  Generated: ${metrics.length} metrics, ${jobs.length} jobs, ${manifests.length} manifests`
  );

  console.log("\nInserting...");
  await bulkInsert("gpu_jobs", jobs);
  await bulkInsert("gpu_metrics", metrics);
  await bulkInsert("energy_manifests", manifests);

  // ── Step 5: Refresh materialized view ────────────────────────────────
  console.log("Refreshing materialized view...");
  const { error: rpcError } = await service.rpc("refresh_gpu_metrics_hourly");
  if (rpcError) {
    console.warn("  ⚠  refresh_gpu_metrics_hourly failed (non-fatal):", rpcError.message);
  } else {
    console.log("  ✓ View refreshed");
  }

  // ── Done ───────────────────────────────────────────────────────────────
  console.log("\n✅  Demo account ready!\n");
  console.log("  Email   :", DEMO_EMAIL);
  console.log("  Password:", DEMO_PASSWORD);
  console.log("  User ID :", userId);
  console.log("\nAdd to .env.local:");
  console.log(`  DEMO_ACCOUNT_EMAIL=${DEMO_EMAIL}`);
  console.log(`  DEMO_ACCOUNT_PASSWORD=${DEMO_PASSWORD}`);
  console.log(`  DEMO_USER_ID=${userId}`);
  console.log();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

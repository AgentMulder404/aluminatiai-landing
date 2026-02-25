/**
 * Demo Seed Generator — AluminatiAI
 *
 * Pure TypeScript. No DB calls. Deterministic per userId (seeded PRNG).
 * Produces ~11,000 gpu_metrics rows across 5 realistic ML jobs.
 *
 * The five jobs tell the product story:
 *   1. llama3-finetune      — 8× A100 80GB, 72h, heavy training (high cost)
 *   2. inference-serving    — 4× H100 SXM,  ongoing, steady load (the benchmark)
 *   3. sdxl-batch-render    — 2× L40S,      48h, bursty creative workload
 *   4. bert-eval-v3         — 4× A100 40GB, 24h, completed eval sweep
 *   5. data-preproc-abandon — 4× A100 40GB, 7d, IDLE → the waste story
 *
 * Sample interval: 10 minutes (600s) — ~11k rows total, Supabase-friendly.
 */

// ── Seeded PRNG (Mulberry32) — deterministic, no external deps ──────────────

function makePRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function seedFromUserId(userId: string): number {
  // First 8 hex chars of UUID → uint32
  return parseInt(userId.replace(/-/g, "").slice(0, 8), 16) || 0xdeadbeef;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface GpuMetricRow {
  time: string;
  user_id: string;
  gpu_index: number;
  gpu_uuid: string;
  gpu_name: string;
  power_draw_w: number;
  power_limit_w: number;
  energy_delta_j: number;
  utilization_gpu_pct: number;
  utilization_memory_pct: number;
  temperature_c: number;
  fan_speed_pct: number;
  memory_used_mb: number;
  memory_total_mb: number;
  clock_sm_mhz: number;
  job_id: string;
}

export interface GpuJobRow {
  id: string;
  user_id: string;
  job_name: string;
  gpu_indices: number[];
  num_gpus: number;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  total_energy_kwh: number;
  total_cost_usd: number;
  avg_power_w: number;
  avg_utilization_pct: number;
  duration_seconds: number | null;
}

export interface EnergyManifestRow {
  user_id: string;
  job_id: string;
  team_id: string;
  model_tag: string;
  scheduler_source: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  total_energy_j: number;
  total_energy_kwh: number;
  peak_power_w: number;
  avg_power_w: number;
  electricity_rate: number;
  cost_usd: number;
  grid_carbon_intensity_g_kwh: number;
  co2_kg: number;
  gpu_arch: string;
  gpu_count: number;
  gpu_uuids: string[];
  hardware_match_score: number;
  efficiency_percentile: number;
  sample_count: number;
}

export interface SeedOutput {
  metrics: GpuMetricRow[];
  jobs: GpuJobRow[];
  manifests: EnergyManifestRow[];
}

// ── Job definitions ───────────────────────────────────────────────────────────

const SAMPLE_INTERVAL_S = 600; // 10-minute samples
const ELECTRICITY_RATE  = 0.12; // $0.12/kWh — US average
const CARBON_INTENSITY  = 386;  // g CO₂/kWh — US grid average (EPA 2024)

interface JobDef {
  id: string;
  name: string;
  gpuArch: string;
  gpuName: string;
  gpuCount: number;
  tdpW: number;
  powerLimitW: number;
  memoryTotalMb: number;
  startOffsetH: number;  // hours before now
  durationH: number | null; // null = still running
  avgUtilPct: number;
  utilVariance: number;
  isIdle: boolean;
  teamId: string;
  modelTag: string;
  schedulerSource: string;
  smClockBase: number;
  hardwareMatchScore: number;
  efficiencyPercentile: number;
}

const JOB_DEFS: JobDef[] = [
  {
    id: "a1b2c3d4-0001-4000-8001-000000000001",
    name: "llama3-finetune",
    gpuArch: "A100 80GB SXM",
    gpuName: "NVIDIA A100-SXM4-80GB",
    gpuCount: 8,
    tdpW: 400,
    powerLimitW: 400,
    memoryTotalMb: 81920,
    startOffsetH: 168, // 7 days ago
    durationH: 72,     // finished 4 days ago
    avgUtilPct: 87,
    utilVariance: 8,
    isIdle: false,
    teamId: "team-ml-research",
    modelTag: "llama3-70b",
    schedulerSource: "kubernetes",
    smClockBase: 1410,
    hardwareMatchScore: 96,
    efficiencyPercentile: 91,
  },
  {
    id: "a1b2c3d4-0002-4000-8002-000000000002",
    name: "inference-serving",
    gpuArch: "H100 SXM",
    gpuName: "NVIDIA H100 SXM5 80GB",
    gpuCount: 4,
    tdpW: 700,
    powerLimitW: 700,
    memoryTotalMb: 81920,
    startOffsetH: 96, // 4 days ago, still running
    durationH: null,
    avgUtilPct: 54,
    utilVariance: 16,
    isIdle: false,
    teamId: "team-inference",
    modelTag: "llama3-8b",
    schedulerSource: "kubernetes",
    smClockBase: 1980,
    hardwareMatchScore: 88,
    efficiencyPercentile: 78,
  },
  {
    id: "a1b2c3d4-0003-4000-8003-000000000003",
    name: "sdxl-batch-render",
    gpuArch: "L40S",
    gpuName: "NVIDIA L40S",
    gpuCount: 2,
    tdpW: 350,
    powerLimitW: 350,
    memoryTotalMb: 49152,
    startOffsetH: 120, // 5 days ago
    durationH: 48,     // ended 3 days ago
    avgUtilPct: 82,
    utilVariance: 12,
    isIdle: false,
    teamId: "team-creative",
    modelTag: "sdxl-turbo",
    schedulerSource: "slurm",
    smClockBase: 2520,
    hardwareMatchScore: 79,
    efficiencyPercentile: 64,
  },
  {
    id: "a1b2c3d4-0004-4000-8004-000000000004",
    name: "bert-eval-v3",
    gpuArch: "A100 40GB PCIe",
    gpuName: "NVIDIA A100-PCIE-40GB",
    gpuCount: 4,
    tdpW: 300,
    powerLimitW: 300,
    memoryTotalMb: 40960,
    startOffsetH: 144, // 6 days ago
    durationH: 24,     // ended 5 days ago
    avgUtilPct: 68,
    utilVariance: 14,
    isIdle: false,
    teamId: "team-ml-research",
    modelTag: "bert-large",
    schedulerSource: "slurm",
    smClockBase: 1065,
    hardwareMatchScore: 72,
    efficiencyPercentile: 55,
  },
  {
    // THE WASTE STORY: 4× A100s, idle for 7 days, nobody noticed
    id: "a1b2c3d4-0005-4000-8005-000000000005",
    name: "data-preproc-abandoned",
    gpuArch: "A100 40GB PCIe",
    gpuName: "NVIDIA A100-PCIE-40GB",
    gpuCount: 4,
    tdpW: 300,
    powerLimitW: 300,
    memoryTotalMb: 40960,
    startOffsetH: 168, // 7 days ago, STILL RUNNING (abandoned)
    durationH: null,
    avgUtilPct: 4,
    utilVariance: 3,
    isIdle: true,
    teamId: "team-data",
    modelTag: "data-pipeline",
    schedulerSource: "manual",
    smClockBase: 210,
    hardwareMatchScore: 0, // not applicable
    efficiencyPercentile: 3,
  },
];

// ── Core generator ────────────────────────────────────────────────────────────

interface JobStats {
  totalEnergyJ: number;
  peakPowerW: number;
  totalUtilSum: number;
  sampleCount: number;
  gpuUuids: string[];
}

function generateJobMetrics(
  def: JobDef,
  userId: string,
  now: Date,
  rng: () => number
): { rows: GpuMetricRow[]; stats: JobStats } {
  const startTime = new Date(now.getTime() - def.startOffsetH * 3_600_000);
  const endTime   = def.durationH
    ? new Date(startTime.getTime() + def.durationH * 3_600_000)
    : now;

  const totalSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  const numSamples   = Math.floor(totalSeconds / SAMPLE_INTERVAL_S);

  const rows: GpuMetricRow[] = [];
  let totalEnergyJ  = 0;
  let peakPowerW    = 0;
  let totalUtilSum  = 0;

  const gpuUuids: string[] = Array.from(
    { length: def.gpuCount },
    (_, g) => `GPU-${def.id}-${String(g).padStart(2, "0")}`
  );

  for (let s = 0; s < numSamples; s++) {
    const sampleTime = new Date(
      startTime.getTime() + s * SAMPLE_INTERVAL_S * 1000
    );

    for (let g = 0; g < def.gpuCount; g++) {
      let utilPct: number;
      let powerW: number;

      if (def.isIdle) {
        // Abandoned/idle: nearly flat low utilization
        // Occasional small spike simulates OS/health-check activity
        const isSpike = rng() < 0.03;
        utilPct = isSpike
          ? 12 + rng() * 18
          : Math.max(1, def.avgUtilPct + (rng() - 0.5) * def.utilVariance * 2);

        const idleBase = def.tdpW * 0.17; // ~17% TDP idle
        powerW = isSpike
          ? def.tdpW * 0.28 + rng() * 20
          : idleBase + (rng() - 0.5) * 12;
      } else {
        // Active job: batch-processing cycle creates sinusoidal power pattern
        // Each GPU is slightly out of phase (g * 1.7) — realistic for multi-GPU
        const batchCycle   = Math.sin(s * 0.09  + g * 1.7) * def.utilVariance * 0.55;
        const thermalDrift = Math.sin(s * 0.004 + g * 0.9) * def.utilVariance * 0.25;
        const noise        = (rng() - 0.5) * def.utilVariance * 0.35;
        // Data-loading valley: brief ~10% dip every ~20 steps
        const loadDip      = s % 22 < 2 ? -12 : 0;

        utilPct = Math.max(5, Math.min(100,
          def.avgUtilPct + batchCycle + thermalDrift + noise + loadDip
        ));

        // Power = idle floor + load-scaled portion, bounded by TDP
        const utilFactor = utilPct / 100;
        const basePower  = def.tdpW * (0.22 + 0.78 * utilFactor);
        const powerNoise = (rng() - 0.5) * def.tdpW * 0.025;
        powerW = Math.max(
          def.tdpW * 0.18,
          Math.min(def.powerLimitW, basePower + powerNoise)
        );
      }

      const energyDeltaJ = powerW * SAMPLE_INTERVAL_S;
      totalEnergyJ  += energyDeltaJ;
      totalUtilSum  += utilPct;
      if (powerW > peakPowerW) peakPowerW = powerW;

      // Temperature: base 28°C + load component, max ~85°C
      const tempBase = 28 + (powerW / def.tdpW) * 57;
      const tempC    = Math.round(Math.min(85, Math.max(28, tempBase + (rng() - 0.5) * 4)));

      // Fan speed: proportional to temp above ~45°C
      const fanPct   = Math.round(Math.min(100, Math.max(0, (tempC - 42) * 2.1 + rng() * 8)));

      // Memory usage: training near capacity, inference/idle much lower
      const memFillFactor = def.isIdle
        ? 0.04 + rng() * 0.02
        : 0.68 + (utilPct / 100) * 0.14 + (rng() - 0.5) * 0.04;
      const memUsedMb = Math.round(def.memoryTotalMb * memFillFactor);

      // SM clock: scales with utilization
      const smClock = def.isIdle
        ? Math.round(210 + rng() * 120)
        : Math.round(def.smClockBase * (0.82 + (utilPct / 100) * 0.18) + (rng() - 0.5) * 40);

      rows.push({
        time:                    sampleTime.toISOString(),
        user_id:                 userId,
        gpu_index:               g,
        gpu_uuid:                gpuUuids[g],
        gpu_name:                def.gpuName,
        power_draw_w:            Math.round(powerW * 10) / 10,
        power_limit_w:           def.powerLimitW,
        energy_delta_j:          Math.round(energyDeltaJ),
        utilization_gpu_pct:     Math.round(utilPct),
        utilization_memory_pct:  Math.round(
          def.isIdle ? 4 + rng() * 4 : 58 + (utilPct * 0.22) + (rng() - 0.5) * 8
        ),
        temperature_c:           tempC,
        fan_speed_pct:           fanPct,
        memory_used_mb:          memUsedMb,
        memory_total_mb:         def.memoryTotalMb,
        clock_sm_mhz:            smClock,
        job_id:                  def.id,
      });
    }
  }

  return {
    rows,
    stats: {
      totalEnergyJ,
      peakPowerW,
      totalUtilSum,
      sampleCount: numSamples * def.gpuCount,
      gpuUuids,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateSeedData(userId: string): SeedOutput {
  const rng = makePRNG(seedFromUserId(userId));
  const now = new Date();

  const metrics:   GpuMetricRow[]      = [];
  const jobs:      GpuJobRow[]         = [];
  const manifests: EnergyManifestRow[] = [];

  for (const def of JOB_DEFS) {
    const { rows, stats } = generateJobMetrics(def, userId, now, rng);
    metrics.push(...rows);

    const startTime = new Date(now.getTime() - def.startOffsetH * 3_600_000);
    const endTime   = def.durationH
      ? new Date(startTime.getTime() + def.durationH * 3_600_000)
      : null;

    const totalKwh       = stats.totalEnergyJ / 3_600_000;
    const costUsd        = totalKwh * ELECTRICITY_RATE;
    const avgUtilPct     = stats.sampleCount > 0
      ? stats.totalUtilSum / stats.sampleCount
      : 0;
    const durationSeconds = def.durationH ? def.durationH * 3600 : null;

    const avgPowerW = stats.sampleCount > 0
      ? Math.round((stats.totalEnergyJ / (durationSeconds ?? (now.getTime() - startTime.getTime()) / 1000)) * 10) / 10
      : 0;

    jobs.push({
      id:                  def.id,
      user_id:             userId,
      job_name:            def.name,
      gpu_indices:         Array.from({ length: def.gpuCount }, (_, i) => i),
      num_gpus:            def.gpuCount,
      is_active:           def.durationH === null,
      start_time:          startTime.toISOString(),
      end_time:            endTime?.toISOString() ?? null,
      total_energy_kwh:    Math.round(totalKwh    * 10000) / 10000,
      total_cost_usd:      Math.round(costUsd     * 10000) / 10000,
      avg_power_w:         avgPowerW,
      avg_utilization_pct: Math.round(avgUtilPct  * 10)    / 10,
      duration_seconds:    durationSeconds,
    });

    // Only completed jobs get an energy manifest
    if (endTime) {
      const co2Kg = (totalKwh * CARBON_INTENSITY) / 1000;

      manifests.push({
        user_id:                    userId,
        job_id:                     def.id,
        team_id:                    def.teamId,
        model_tag:                  def.modelTag,
        scheduler_source:           def.schedulerSource,
        start_time:                 startTime.toISOString(),
        end_time:                   endTime.toISOString(),
        duration_seconds:           def.durationH! * 3600,
        total_energy_j:             Math.round(stats.totalEnergyJ),
        total_energy_kwh:           Math.round(totalKwh  * 100000) / 100000,
        peak_power_w:               Math.round(stats.peakPowerW * 10) / 10,
        avg_power_w:                Math.round((stats.totalEnergyJ / (def.durationH! * 3600)) * 10) / 10,
        electricity_rate:           ELECTRICITY_RATE,
        cost_usd:                   Math.round(costUsd    * 100) / 100,
        grid_carbon_intensity_g_kwh: CARBON_INTENSITY,
        co2_kg:                     Math.round(co2Kg      * 1000) / 1000,
        gpu_arch:                   def.gpuArch,
        gpu_count:                  def.gpuCount,
        gpu_uuids:                  stats.gpuUuids,
        hardware_match_score:       def.hardwareMatchScore,
        efficiency_percentile:      def.efficiencyPercentile,
        sample_count:               stats.sampleCount,
      });
    }
  }

  return { metrics, jobs, manifests };
}

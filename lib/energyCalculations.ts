// Energy Calculation Utilities for Workload Tracking

export type GPUType = "H100" | "A100" | "H200" | "L40S" | "RTX_4090" | "other";

// GPU Power Draw Database (Watts - TDP)
const GPU_POWER_MAP: Record<string, number> = {
  H100: 700,
  A100: 400,
  H200: 700,
  L40S: 300,
  RTX_4090: 450,
  RTX4090: 450,
  other: 500,
};

// Default constants
const DEFAULT_PUE = 1.3; // Power Usage Effectiveness (datacenter overhead)
const DEFAULT_GRID_CARBON_INTENSITY = 0.4; // kg CO₂e per kWh (US average)
const DEFAULT_ELECTRICITY_COST = 0.15; // USD per kWh

export interface WorkloadInput {
  model_size_gb: number;
  num_gpus: number;
  gpu_type: string;
  duration_hours: number;
  utilization_pct?: number;
}

export interface EnergyEstimates {
  estimated_kwh: number;
  estimated_carbon_kg: number;
  estimated_cost_usd: number;
  calculation_method: "fallback" | "agent";
  power_draw_watts?: number;
  effective_power_watts?: number;
  pue_used?: number;
}

/**
 * Get GPU power draw in watts
 */
export function getGPUPowerDraw(gpuType: string): number {
  // Normalize GPU type
  const normalized = gpuType.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Try exact match first
  for (const [key, watts] of Object.entries(GPU_POWER_MAP)) {
    if (normalized === key.toUpperCase().replace(/[^A-Z0-9]/g, "")) {
      return watts;
    }
  }

  // Try partial match
  for (const [key, watts] of Object.entries(GPU_POWER_MAP)) {
    if (normalized.includes(key.toUpperCase().replace(/[^A-Z0-9]/g, ""))) {
      return watts;
    }
  }

  // Default to generic GPU
  return GPU_POWER_MAP.other;
}

/**
 * Calculate fallback energy estimates using simple formula
 */
export function calculateFallbackEstimates(input: WorkloadInput): EnergyEstimates {
  const {
    num_gpus,
    gpu_type,
    duration_hours,
    utilization_pct = 80,
  } = input;

  // Get GPU power draw
  const powerDrawWatts = getGPUPowerDraw(gpu_type);

  // Calculate energy consumption
  // kWh = (watts * num_gpus * hours * utilization) / 1000 * PUE
  const utilizationFactor = utilization_pct / 100;
  const effectivePowerWatts = powerDrawWatts * utilizationFactor;
  const energyKwh = (effectivePowerWatts * num_gpus * duration_hours * DEFAULT_PUE) / 1000;

  // Calculate carbon footprint
  const carbonKg = energyKwh * DEFAULT_GRID_CARBON_INTENSITY;

  // Calculate cost
  const costUsd = energyKwh * DEFAULT_ELECTRICITY_COST;

  console.log(`💡 Fallback calculation:
    GPU: ${gpu_type} (${powerDrawWatts}W)
    Count: ${num_gpus}
    Duration: ${duration_hours}h
    Utilization: ${utilization_pct}%
    PUE: ${DEFAULT_PUE}
    → Energy: ${energyKwh.toFixed(2)} kWh
    → Carbon: ${carbonKg.toFixed(2)} kg CO₂e
    → Cost: $${costUsd.toFixed(2)}
  `);

  return {
    estimated_kwh: Math.round(energyKwh * 100) / 100,
    estimated_carbon_kg: Math.round(carbonKg * 100) / 100,
    estimated_cost_usd: Math.round(costUsd * 100) / 100,
    calculation_method: "fallback",
    power_draw_watts: powerDrawWatts,
    effective_power_watts: Math.round(effectivePowerWatts),
    pue_used: DEFAULT_PUE,
  };
}

/**
 * Validate workload input
 */
export function validateWorkloadInput(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof input.model_size_gb !== "number" || input.model_size_gb <= 0) {
    errors.push("model_size_gb must be a positive number");
  }

  if (typeof input.num_gpus !== "number" || input.num_gpus <= 0 || !Number.isInteger(input.num_gpus)) {
    errors.push("num_gpus must be a positive integer");
  }

  if (typeof input.gpu_type !== "string" || input.gpu_type.trim().length === 0) {
    errors.push("gpu_type must be a non-empty string");
  }

  if (typeof input.duration_hours !== "number" || input.duration_hours <= 0) {
    errors.push("duration_hours must be a positive number");
  }

  if (input.utilization_pct !== undefined) {
    if (typeof input.utilization_pct !== "number" || input.utilization_pct < 0 || input.utilization_pct > 100) {
      errors.push("utilization_pct must be a number between 0 and 100");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format workload description for agent
 */
export function formatWorkloadForAgent(input: WorkloadInput): string {
  const { model_size_gb, num_gpus, gpu_type, duration_hours, utilization_pct = 80 } = input;

  return `AI workload with ${model_size_gb}GB model running on ${num_gpus} ${gpu_type} GPUs for ${duration_hours} hours at ${utilization_pct}% utilization.`;
}

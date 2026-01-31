// Energy Advisor Tool Definitions and Implementations

import { GPU_POWER_DRAW, DEFAULT_ELECTRICITY_COST, DEFAULT_GRID_CARBON_INTENSITY, DEFAULT_PUE, GPUType } from "./types";

// Tool Schemas for MiniMax M2.1
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "calculate_energy",
      description: "Calculate estimated energy consumption in kWh for AI workloads based on GPU specs and runtime",
      parameters: {
        type: "object",
        properties: {
          gpu_type: {
            type: "string",
            enum: ["H100", "A100", "H200", "L40S", "RTX_4090", "other"],
            description: "Type of GPU being used"
          },
          num_gpus: {
            type: "integer",
            minimum: 1,
            description: "Number of GPUs"
          },
          hours: {
            type: "number",
            minimum: 0.1,
            description: "Runtime in hours"
          },
          utilization_pct: {
            type: "number",
            minimum: 0,
            maximum: 100,
            default: 80,
            description: "GPU utilization percentage (0-100)"
          },
          pUE: {
            type: "number",
            default: 1.3,
            description: "Power Usage Effectiveness - datacenter overhead multiplier"
          }
        },
        required: ["gpu_type", "num_gpus", "hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_gpu_power_draw",
      description: "Look up typical TDP or average power draw in watts for a specific GPU model",
      parameters: {
        type: "object",
        properties: {
          gpu_type: {
            type: "string",
            description: "GPU model name (e.g., H100, A100, H200, L40S, RTX_4090)"
          }
        },
        required: ["gpu_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "estimate_carbon",
      description: "Convert energy consumption (kWh) to carbon emissions (kg CO₂e) using grid carbon intensity",
      parameters: {
        type: "object",
        properties: {
          kwh: {
            type: "number",
            description: "Energy consumption in kilowatt-hours"
          },
          grid_intensity_kg_per_kwh: {
            type: "number",
            default: 0.4,
            description: "Grid carbon intensity in kg CO₂e per kWh (default: 0.4 for US average)"
          }
        },
        required: ["kwh"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_optimizations",
      description: "Generate 2-5 realistic optimization suggestions to reduce energy consumption for the given workload",
      parameters: {
        type: "object",
        properties: {
          current_kwh: {
            type: "number",
            description: "Current estimated energy consumption in kWh"
          },
          workload_description: {
            type: "string",
            description: "Description of the AI workload (training, inference, model details, etc.)"
          }
        },
        required: ["current_kwh", "workload_description"]
      }
    }
  }
];

// Tool Implementation Functions
export function executeToolCall(toolName: string, args: any): string {
  try {
    switch (toolName) {
      case "calculate_energy":
        return JSON.stringify(calculateEnergy(args));

      case "get_gpu_power_draw":
        return JSON.stringify(getGPUPowerDraw(args));

      case "estimate_carbon":
        return JSON.stringify(estimateCarbon(args));

      case "suggest_optimizations":
        return JSON.stringify(suggestOptimizations(args));

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: String(error) });
  }
}

// Calculate Energy Consumption
function calculateEnergy(args: {
  gpu_type: GPUType;
  num_gpus: number;
  hours: number;
  utilization_pct?: number;
  pUE?: number;
}): any {
  const {
    gpu_type,
    num_gpus,
    hours,
    utilization_pct = 80,
    pUE = DEFAULT_PUE
  } = args;

  // Get GPU power draw
  const powerDrawWatts = GPU_POWER_DRAW[gpu_type] || GPU_POWER_DRAW.other;

  // Calculate energy
  // kWh = (watts * num_gpus * hours * utilization) / 1000 * PUE
  const utilizationFactor = utilization_pct / 100;
  const energyKwh = (powerDrawWatts * num_gpus * hours * utilizationFactor * pUE) / 1000;

  // Calculate cost
  const costUsd = energyKwh * DEFAULT_ELECTRICITY_COST;

  return {
    energy_kwh: Math.round(energyKwh * 100) / 100,
    cost_usd: Math.round(costUsd * 100) / 100,
    power_draw_watts: powerDrawWatts,
    effective_power_watts: Math.round(powerDrawWatts * utilizationFactor * pUE),
    calculation: `${powerDrawWatts}W × ${num_gpus} GPUs × ${hours}h × ${utilizationPct}% util × ${pUE} PUE ÷ 1000 = ${Math.round(energyKwh * 100) / 100} kWh`
  };
}

// Get GPU Power Draw
function getGPUPowerDraw(args: { gpu_type: string }): any {
  const { gpu_type } = args;

  // Normalize GPU type
  const normalizedType = gpu_type.toUpperCase().replace(/[^A-Z0-9]/g, '_');

  // Try to match
  let powerDraw = GPU_POWER_DRAW.other;
  let matchedType: GPUType = "other";

  for (const [key, value] of Object.entries(GPU_POWER_DRAW)) {
    if (normalizedType.includes(key.replace('_', ''))) {
      powerDraw = value;
      matchedType = key as GPUType;
      break;
    }
  }

  return {
    gpu_type: matchedType,
    power_draw_watts: powerDraw,
    tdp_watts: powerDraw,
    typical_utilization_range: "60-90%",
    note: matchedType === "other"
      ? "Using generic GPU estimate. Specify exact model for better accuracy."
      : `Typical TDP for ${matchedType}`
  };
}

// Estimate Carbon Emissions
function estimateCarbon(args: {
  kwh: number;
  grid_intensity_kg_per_kwh?: number;
}): any {
  const {
    kwh,
    grid_intensity_kg_per_kwh = DEFAULT_GRID_CARBON_INTENSITY
  } = args;

  const carbonKg = kwh * grid_intensity_kg_per_kwh;
  const carbonTonnes = carbonKg / 1000;

  return {
    carbon_kg: Math.round(carbonKg * 100) / 100,
    carbon_tonnes: Math.round(carbonTonnes * 1000) / 1000,
    grid_intensity_used: grid_intensity_kg_per_kwh,
    equivalent: getEquivalent(carbonKg),
    calculation: `${kwh} kWh × ${grid_intensity_kg_per_kwh} kg CO₂e/kWh = ${Math.round(carbonKg * 100) / 100} kg CO₂e`
  };
}

// Get Carbon Equivalent
function getEquivalent(carbonKg: number): string {
  const milesInCar = Math.round(carbonKg * 2.5); // ~0.4 kg CO2 per mile
  const treesNeeded = Math.round(carbonKg / 21); // ~21 kg CO2 absorbed per tree per year

  if (milesInCar < 100) {
    return `~${milesInCar} miles driven in average car`;
  } else if (milesInCar < 1000) {
    return `~${milesInCar} miles driven, or ${treesNeeded} trees needed for 1 year`;
  } else {
    return `~${Math.round(milesInCar / 100) / 10}k miles driven, or ${treesNeeded} trees for 1 year`;
  }
}

// Suggest Optimizations
function suggestOptimizations(args: {
  current_kwh: number;
  workload_description: string;
}): any {
  const { current_kwh, workload_description } = args;
  const desc = workload_description.toLowerCase();

  const suggestions: string[] = [];

  // Training-specific optimizations
  if (desc.includes("train")) {
    suggestions.push("Use mixed precision training (FP16/BF16) to reduce compute intensity by ~40%");
    suggestions.push("Implement gradient accumulation to use smaller batch sizes and reduce memory/power");

    if (desc.includes("llm") || desc.includes("language")) {
      suggestions.push("Consider quantized training (INT8/INT4) for large language models");
    }
  }

  // Inference-specific optimizations
  if (desc.includes("inference") || desc.includes("serving")) {
    suggestions.push("Deploy quantized models (INT8/INT4) to reduce inference power by 50-70%");
    suggestions.push("Use TensorRT or ONNX Runtime for optimized inference execution");
    suggestions.push("Implement dynamic batching to maximize GPU utilization during low-traffic periods");
  }

  // General optimizations
  suggestions.push("Schedule non-urgent jobs during off-peak hours when grid is cleaner");
  suggestions.push("Enable GPU power capping (e.g., 80% TDP) for 10-15% energy savings with minimal performance loss");

  // High energy workloads
  if (current_kwh > 100) {
    suggestions.push("Consider distributed training with gradient compression to reduce communication overhead");
    suggestions.push("Explore spot instances or renewable-powered datacenters for cost and carbon reduction");
  }

  // Low utilization
  if (desc.includes("batch") || desc.includes("periodic")) {
    suggestions.push("Consolidate workloads to reduce idle GPU time and improve overall cluster utilization");
  }

  return {
    optimizations: suggestions.slice(0, 5), // Return top 5
    potential_savings_kwh: Math.round(current_kwh * 0.3 * 100) / 100, // Conservative 30% savings
    potential_savings_pct: 30,
    note: "Actual savings depend on implementation and workload specifics"
  };
}

// Energy Advisor Types and Constants

export type GPUType = "H100" | "A100" | "H200" | "L40S" | "RTX_4090" | "other";

export interface EnergyEstimateResponse {
  estimated_kwh: number;
  estimated_carbon_kg: number;
  estimated_cost_usd: number;
  optimizations: string[];
  reasoning_trace: string[];
  confidence: number;
  clarifying_questions?: string[];
  raw_agent_response?: any;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: "tool";
  name: string;
  content: string;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// GPU Power Draw Database (Watts)
export const GPU_POWER_DRAW: Record<GPUType, number> = {
  H100: 700,
  A100: 400,
  H200: 700,
  L40S: 300,
  RTX_4090: 450,
  other: 500,
};

// Default Constants
export const DEFAULT_ELECTRICITY_COST = 0.15; // USD per kWh
export const DEFAULT_GRID_CARBON_INTENSITY = 0.4; // kg CO₂e per kWh
export const DEFAULT_PUE = 1.3; // Power Usage Effectiveness (datacenter overhead)

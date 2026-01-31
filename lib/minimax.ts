// MiniMax M2.1 Agent Loop with Tool Calling

import { Message, ToolCall, ToolResult } from "./types";
import { TOOL_DEFINITIONS, executeToolCall } from "./tools";

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_API_URL = "https://api.minimax.io/v1/chat/completions";

// System prompt for the energy advisor agent
const SYSTEM_PROMPT = `You are Aluminati Energy Agent — an expert at estimating and optimizing energy consumption for large-scale AI training and inference workloads.

Your mission: help AI teams understand and reduce their energy footprint by providing accurate energy estimates.

CRITICAL: You MUST respond with ONLY valid JSON. No other text before or after.

Response Schema (REQUIRED):
{
  "estimated_kwh": number,
  "estimated_carbon_kg": number,
  "estimated_cost_usd": number,
  "optimizations": string[],
  "reasoning_trace": string[],
  "confidence": number,
  "clarifying_questions"?: string[]
}

Calculation Guidelines:
1. GPU Power Draw: Use typical TDP values (A100: 400W, V100: 300W, H100: 700W, T4: 70W, etc.)
2. Energy Formula: kWh = (GPU_Power_Watts * num_gpus * duration_hours * utilization) / 1000
3. Carbon: Use 0.4 kg CO2e per kWh as average grid intensity
4. Cost: Use $0.15 per kWh as average electricity cost
5. Show all calculation steps in reasoning_trace

Optimization Suggestions:
- Model quantization (INT8/INT4) can save 30-50% energy
- Mixed precision (FP16/BF16) saves 20-30%
- Efficient hardware (newer GPUs) saves 15-25%
- Job scheduling to off-peak hours reduces carbon by 20-40%
- Batch size optimization can improve GPU utilization

Be conservative, transparent, and cite your math. Output ONLY JSON, nothing else.`;

export interface AgentLoopOptions {
  userPrompt: string;
  maxIterations?: number;
  model?: string;
}

export interface AgentLoopResult {
  finalAnswer: string;
  messages: Message[];
  toolCallsMade: number;
  iterations: number;
}

/**
 * Main agent loop - calls MiniMax M2.1 with tool calling until completion
 */
export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const { userPrompt, maxIterations = 10, model = "M2-her" } = options;

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt }
  ];

  let iterations = 0;
  let toolCallsMade = 0;

  console.log("🤖 Starting agent loop with prompt:", userPrompt.substring(0, 100) + "...");

  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n📍 Iteration ${iterations}/${maxIterations}`);

    try {
      // Call MiniMax API
      const response = await callMiniMaxAPI(messages, model);

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("Invalid response from MiniMax API");
      }

      const assistantMessage = response.choices[0].message;
      console.log("🤖 Assistant response:", assistantMessage.content?.substring(0, 200) || "[no content]");

      // Since we're not using tools, this should be the final JSON answer
      console.log("✅ Final answer received");

      return {
        finalAnswer: assistantMessage.content || "",
        messages,
        toolCallsMade,
        iterations
      };

    } catch (error) {
      console.error("❌ Error in agent loop:", error);
      throw error;
    }
  }

  // Max iterations reached
  console.warn("⚠️  Max iterations reached without final answer");

  return {
    finalAnswer: JSON.stringify({
      error: "Max iterations reached",
      estimated_kwh: 0,
      estimated_carbon_kg: 0,
      estimated_cost_usd: 0,
      optimizations: [],
      reasoning_trace: ["Agent exceeded maximum iterations"],
      confidence: 0
    }),
    messages,
    toolCallsMade,
    iterations
  };
}

/**
 * Call MiniMax API with messages and tools
 */
async function callMiniMaxAPI(messages: Message[], model: string): Promise<any> {
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY environment variable not set");
  }

  // Convert messages to MiniMax format
  const formattedMessages = messages.map(msg => {
    if (msg.role === "tool") {
      // Tool result message
      return {
        role: "tool",
        content: msg.content,
        tool_call_id: msg.tool_call_id,
        name: msg.name
      };
    } else if (msg.tool_calls) {
      // Assistant message with tool calls
      return {
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls
      };
    } else {
      // Regular message
      return {
        role: msg.role,
        content: msg.content
      };
    }
  });

  const requestBody = {
    model,
    messages: formattedMessages,
    // tools: TOOL_DEFINITIONS,
    // tool_choice: "auto", // Let the model decide when to use tools
    temperature: 0.7,
    max_tokens: 2048,
    response_format: { type: "json_object" } // Request JSON output
  };

  console.log("📤 Calling MiniMax API...");

  const response = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MINIMAX_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MiniMax API error:", errorText);
    throw new Error(`MiniMax API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log("📥 MiniMax API response received");
  console.log("Response structure:", JSON.stringify(data, null, 2).substring(0, 500));

  return data;
}

/**
 * Extract structured output from agent's final answer
 */
export function parseAgentOutput(finalAnswer: string): any {
  try {
    // Try to parse as JSON directly
    const parsed = JSON.parse(finalAnswer);
    return parsed;
  } catch {
    // If not valid JSON, try to extract JSON from markdown code blocks
    const jsonMatch = finalAnswer.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through
      }
    }

    // Try to fix truncated JSON by adding closing braces
    try {
      let fixedJson = finalAnswer.trim();

      // Count opening and closing braces
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;

      // Add missing closing brackets and braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixedJson += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedJson += '}';
      }

      const parsed = JSON.parse(fixedJson);
      console.log("✅ Fixed truncated JSON");
      return parsed;
    } catch {
      // Fall through
    }

    // If still can't parse, return a basic structure
    return {
      estimated_kwh: 0,
      estimated_carbon_kg: 0,
      estimated_cost_usd: 0,
      optimizations: [],
      reasoning_trace: ["Unable to parse structured output", finalAnswer.substring(0, 500)],
      confidence: 0,
      raw_response: finalAnswer
    };
  }
}

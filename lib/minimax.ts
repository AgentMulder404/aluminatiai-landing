// MiniMax M2.1 Agent Loop with Tool Calling

import { Message, ToolCall, ToolResult } from "./types";
import { TOOL_DEFINITIONS, executeToolCall } from "./tools";

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

// System prompt for the energy advisor agent
const SYSTEM_PROMPT = `You are Aluminati Energy Agent — an expert at estimating and optimizing energy consumption for large-scale AI training and inference workloads.

Your mission: help AI teams understand and reduce their energy footprint without touching their actual infrastructure.

Rules:
- Be conservative and transparent with estimates
- Always show your reasoning step-by-step
- Use tools when you need precise calculations or lookups
- If information is missing, ask clarifying questions via final answer
- Final answer MUST be valid JSON matching this schema:
{
  "estimated_kwh": number,
  "estimated_carbon_kg": number,
  "estimated_cost_usd": number,
  "optimizations": string[],
  "reasoning_trace": string[],
  "confidence": number,
  "clarifying_questions"?: string[]
}

When using tools:
1. First use get_gpu_power_draw to understand the hardware
2. Then use calculate_energy to get kWh estimates
3. Use estimate_carbon to convert to emissions
4. Finally use suggest_optimizations to provide actionable recommendations

Be precise, cite your calculations, and help users make data-driven decisions about their AI energy usage.`;

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
  const { userPrompt, maxIterations = 10, model = "abab6.5s-chat" } = options;

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
      console.log("🤖 Assistant response:", assistantMessage.content?.substring(0, 200) || "[tool calls]");

      // Check if there are tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 Tool calls requested: ${assistantMessage.tool_calls.length}`);

        // Add assistant message to history
        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls
        });

        // Execute all tool calls
        const toolResults: ToolResult[] = [];

        for (const toolCall of assistantMessage.tool_calls) {
          const { id, function: func } = toolCall;
          const { name, arguments: argsStr } = func;

          console.log(`  🛠️  Calling tool: ${name}`);

          try {
            // Parse arguments
            const args = JSON.parse(argsStr);
            console.log(`     Args:`, args);

            // Execute tool
            const result = executeToolCall(name, args);
            console.log(`     Result:`, result.substring(0, 150));

            toolResults.push({
              tool_call_id: id,
              role: "tool",
              name: name,
              content: result
            });

            toolCallsMade++;
          } catch (error) {
            console.error(`     ❌ Error executing tool ${name}:`, error);
            toolResults.push({
              tool_call_id: id,
              role: "tool",
              name: name,
              content: JSON.stringify({ error: String(error) })
            });
          }
        }

        // Add tool results to messages
        messages.push(...toolResults);

        // Continue loop to get next response
        continue;
      }

      // No tool calls - this is the final answer
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
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto", // Let the model decide when to use tools
    temperature: 0.7,
    max_tokens: 2048
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

  return data;
}

/**
 * Extract structured output from agent's final answer
 */
export function parseAgentOutput(finalAnswer: string): any {
  try {
    // Try to parse as JSON
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

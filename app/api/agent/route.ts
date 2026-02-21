// Energy Advisor Agent API Route

import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop, parseAgentOutput } from "@/lib/minimax";
import { EnergyEstimateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max execution time

/**
 * POST /api/agent
 *
 * Accepts: { prompt: string }
 * Returns: EnergyEstimateResponse
 */
export async function POST(request: NextRequest) {
  console.log("\n🚀 POST /api/agent - Energy Advisor Agent");

  try {
    // Parse request body
    const body = await request.json();
    const { prompt } = body;

    // Validate input
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'prompt' field" },
        { status: 400 }
      );
    }

    if (prompt.length < 10) {
      return NextResponse.json(
        { error: "Prompt too short. Please describe your AI workload in detail." },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        { error: "Prompt too long. Please keep it under 5000 characters." },
        { status: 400 }
      );
    }

    console.log("📝 User prompt:", prompt.substring(0, 200) + "...");

    // Check if API key is configured
    if (!process.env.MINIMAX_API_KEY) {
      console.error("❌ MINIMAX_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Agent not configured. Please set MINIMAX_API_KEY environment variable.",
          estimated_kwh: 0,
          estimated_carbon_kg: 0,
          estimated_cost_usd: 0,
          optimizations: ["Configure MiniMax API key to enable energy analysis"],
          reasoning_trace: ["API key not configured"],
          confidence: 0
        } as EnergyEstimateResponse,
        { status: 503 }
      );
    }

    // Run the agent loop
    const startTime = Date.now();
    const agentResult = await runAgentLoop({
      userPrompt: prompt,
      maxIterations: 10
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Agent completed in ${duration}ms (${agentResult.iterations} iterations, ${agentResult.toolCallsMade} tool calls)`);

    // Parse the final answer
    const parsedOutput = parseAgentOutput(agentResult.finalAnswer);

    // Build response
    const response: EnergyEstimateResponse = {
      estimated_kwh: parsedOutput.estimated_kwh || 0,
      estimated_carbon_kg: parsedOutput.estimated_carbon_kg || 0,
      estimated_cost_usd: parsedOutput.estimated_cost_usd || 0,
      optimizations: parsedOutput.optimizations || [],
      reasoning_trace: parsedOutput.reasoning_trace || [],
      confidence: parsedOutput.confidence || 0,
      clarifying_questions: parsedOutput.clarifying_questions,
      raw_agent_response: {
        iterations: agentResult.iterations,
        tool_calls_made: agentResult.toolCallsMade,
        duration_ms: duration,
        final_answer: agentResult.finalAnswer
      }
    };

    // Validate response structure
    if (!response.estimated_kwh && !response.clarifying_questions) {
      console.warn("⚠️  Agent didn't provide estimates or clarifying questions");
      response.reasoning_trace.push("Agent response incomplete - may need more information");
    }

    console.log("✅ Response prepared:", {
      kwh: response.estimated_kwh,
      carbon: response.estimated_carbon_kg,
      cost: response.estimated_cost_usd,
      optimizations: response.optimizations.length,
      confidence: response.confidence
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ Error in agent route:", error);

    // Return error response in expected format
    const errorResponse: EnergyEstimateResponse = {
      estimated_kwh: 0,
      estimated_carbon_kg: 0,
      estimated_cost_usd: 0,
      optimizations: [],
      reasoning_trace: [
        "Error occurred during analysis",
        error instanceof Error ? error.message : String(error)
      ],
      confidence: 0,
      raw_agent_response: {
        error: error instanceof Error ? error.message : String(error)
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/agent
 * Health check endpoint
 */
export async function GET() {
  const isConfigured = !!process.env.MINIMAX_API_KEY;

  return NextResponse.json({
    status: "ok",
    service: "AluminatiAi Energy Advisor Agent",
    configured: isConfigured,
    message: isConfigured
      ? "Agent ready to analyze workloads"
      : "Please configure MINIMAX_API_KEY to enable agent"
  });
}

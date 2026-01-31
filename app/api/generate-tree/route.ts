// Decision Tree Generator API - Uses MiniMax M2.1 to create optimization trees

import { NextRequest, NextResponse } from "next/server";
import { TreeNode, GenerateTreeRequest, GenerateTreeResponse, validateTree } from "@/lib/decisionTree";

export const runtime = "nodejs";
export const maxDuration = 60;

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_API_URL = "https://api.minimax.io/v1/chat/completions";

// Exact system prompt as specified
const SYSTEM_PROMPT = `You are AluminatiAI Optimization Tree Generator.
Given an AI workload description or agent's reasoning trace, create a decision tree JSON for energy optimization paths.
Output ONLY valid JSON matching this schema (no extra text):
{
  "tree": {
    "id": "root",
    "label": "string",
    "description": "string?",
    "children": [ ... recursive TreeNode ... ]
  }
}
Rules:
- Root node: overall problem (e.g. 'Workload energy estimate: 1500 kWh')
- Branches: binary or multi-choice decisions (e.g. 'High energy? → Yes: Quantize? → Yes: Save 40%')
- Each node should have:
  - Clear label (question/decision)
  - Optional condition, action, savings_pct, tradeoff
  - Realistic optimizations: quantization, lower precision, efficient hardware, scheduling, pruning, etc.
  - Conservative estimates
  - 3-5 levels deep max for clarity
- Use agent's reasoning_trace if provided to base the tree on its steps.
- Make it visualizable and actionable for AI teams.`;

/**
 * POST /api/generate-tree
 * Generate optimization decision tree using MiniMax M2.1
 */
export async function POST(request: NextRequest) {
  console.log("\n🌳 POST /api/generate-tree");

  const startTime = Date.now();

  try {
    // Parse request
    const body: GenerateTreeRequest = await request.json();
    const { workload_description, agent_response } = body;

    // Validate input
    if (!workload_description && !agent_response) {
      return NextResponse.json(
        { error: "Either workload_description or agent_response is required" },
        { status: 400 }
      );
    }

    // Check API key
    if (!MINIMAX_API_KEY) {
      console.error("❌ MINIMAX_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Tree generator not configured",
          tree: getFallbackTree(workload_description || "Unknown workload"),
        } as GenerateTreeResponse,
        { status: 503 }
      );
    }

    // Build user prompt
    const userPrompt = buildUserPrompt(workload_description, agent_response);
    console.log("📝 User prompt:", userPrompt.substring(0, 200) + "...");

    // Call MiniMax M2.1
    console.log("🤖 Calling MiniMax M2.1...");
    const minimaxResponse = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "M2-her",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" }, // Request JSON output
      }),
    });

    if (!minimaxResponse.ok) {
      const errorText = await minimaxResponse.text();
      console.error("❌ MiniMax error:", errorText);
      throw new Error(`MiniMax API error: ${minimaxResponse.status}`);
    }

    const minimaxData = await minimaxResponse.json();
    const generatedContent = minimaxData.choices?.[0]?.message?.content || "";

    console.log("📥 MiniMax response received");
    console.log("Raw content (full):", generatedContent);

    // Parse tree from response
    const tree = parseTreeFromResponse(generatedContent);

    if (!tree) {
      console.warn("⚠️  Failed to parse tree, using fallback");
      console.log("Parse failure - content length:", generatedContent.length);
      return NextResponse.json({
        tree: getFallbackTree(workload_description || "Unknown workload"),
        error: "Failed to parse tree from model response",
        generation_time_ms: Date.now() - startTime,
        model_used: "fallback",
      } as GenerateTreeResponse);
    }

    // Validate tree structure
    if (!validateTree(tree)) {
      console.warn("⚠️  Tree validation failed, using fallback");
      return NextResponse.json({
        tree: getFallbackTree(workload_description || "Unknown workload"),
        error: "Generated tree failed validation",
        generation_time_ms: Date.now() - startTime,
        model_used: "fallback",
      } as GenerateTreeResponse);
    }

    console.log("✅ Tree generated successfully");

    return NextResponse.json({
      tree,
      generation_time_ms: Date.now() - startTime,
      model_used: "minimax-m2.1",
    } as GenerateTreeResponse);
  } catch (error) {
    console.error("❌ Error generating tree:", error);

    // Return fallback tree on error
    const { workload_description } = await request.json().catch(() => ({}));

    return NextResponse.json({
      tree: getFallbackTree(workload_description || "Unknown workload"),
      error: error instanceof Error ? error.message : String(error),
      generation_time_ms: Date.now() - startTime,
      model_used: "fallback",
    } as GenerateTreeResponse);
  }
}

/**
 * Build user prompt for tree generation
 */
function buildUserPrompt(workloadDescription?: string, agentResponse?: any): string {
  let prompt = "Generate an optimization decision tree for the following AI workload:\n\n";

  if (workloadDescription) {
    prompt += `Workload: ${workloadDescription}\n\n`;
  }

  if (agentResponse) {
    prompt += `Agent Analysis:\n`;
    prompt += `- Estimated Energy: ${agentResponse.estimated_kwh || "N/A"} kWh\n`;
    prompt += `- Estimated Carbon: ${agentResponse.estimated_carbon_kg || "N/A"} kg CO₂e\n`;
    prompt += `- Estimated Cost: $${agentResponse.estimated_cost_usd || "N/A"}\n`;

    if (agentResponse.reasoning_trace && agentResponse.reasoning_trace.length > 0) {
      prompt += `\nReasoning Steps:\n`;
      agentResponse.reasoning_trace.slice(0, 5).forEach((step: string, i: number) => {
        prompt += `${i + 1}. ${step}\n`;
      });
    }

    if (agentResponse.optimizations && agentResponse.optimizations.length > 0) {
      prompt += `\nOptimization Suggestions:\n`;
      agentResponse.optimizations.slice(0, 5).forEach((opt: string, i: number) => {
        prompt += `${i + 1}. ${opt}\n`;
      });
    }
  }

  prompt += `\nCreate a decision tree with realistic optimization paths, conservative savings estimates, and clear tradeoffs.`;

  return prompt;
}

/**
 * Parse tree from MiniMax response
 */
function parseTreeFromResponse(content: string): TreeNode | null {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(content);

    if (parsed.tree) {
      return parsed.tree as TreeNode;
    }

    // If no tree field, assume the whole object is the tree
    if (parsed.id && parsed.label) {
      return parsed as TreeNode;
    }

    return null;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return (parsed.tree || parsed) as TreeNode;
      } catch {
        return null;
      }
    }

    return null;
  }
}

/**
 * Fallback tree for when generation fails
 */
function getFallbackTree(workloadDescription: string): TreeNode {
  return {
    id: "root",
    label: "Optimize AI Workload Energy",
    description: workloadDescription,
    children: [
      {
        id: "high-energy",
        label: "High Energy Consumption?",
        condition: "Energy > 1000 kWh",
        children: [
          {
            id: "quantization",
            label: "Apply Model Quantization",
            action: "Quantize model to INT8 or INT4",
            savings_pct: 40,
            tradeoff: "Potential 1-3% accuracy loss",
            confidence: 0.9,
            tooltip: "Quantization reduces precision but maintains most accuracy while significantly reducing compute",
            children: [],
          },
          {
            id: "precision",
            label: "Use Mixed Precision Training",
            action: "Enable FP16/BF16",
            savings_pct: 30,
            tradeoff: "May require gradient scaling",
            confidence: 0.95,
            tooltip: "Mixed precision uses lower precision for most operations, reducing memory and energy",
            children: [],
          },
        ],
      },
      {
        id: "scheduling",
        label: "Optimize Scheduling",
        description: "Run during off-peak hours",
        children: [
          {
            id: "off-peak",
            label: "Schedule for Off-Peak Hours",
            action: "Delay non-urgent jobs to off-peak",
            savings_pct: 20,
            tradeoff: "Delayed completion time",
            confidence: 0.85,
            tooltip: "Grid carbon intensity is lower during off-peak hours",
            children: [],
          },
        ],
      },
      {
        id: "hardware",
        label: "Hardware Selection",
        description: "Choose efficient GPUs",
        children: [
          {
            id: "efficient-gpu",
            label: "Use Energy-Efficient GPUs",
            action: "Switch to H100 or L40S",
            savings_pct: 25,
            tradeoff: "May have availability constraints",
            confidence: 0.8,
            tooltip: "Newer GPUs offer better performance per watt",
            children: [],
          },
        ],
      },
    ],
  };
}

/**
 * GET /api/generate-tree
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: "AluminatiAI Decision Tree Generator",
    model: "MiniMax M2.1",
    status: MINIMAX_API_KEY ? "ready" : "not configured",
  });
}

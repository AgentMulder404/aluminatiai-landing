// Workloads API - Submit and track AI workload energy consumption

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateFallbackEstimates,
  validateWorkloadInput,
  formatWorkloadForAgent,
  WorkloadInput,
} from "@/lib/energyCalculations";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Create Supabase client (lazy initialization)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * POST /api/workloads
 * Submit a new AI workload for energy tracking
 */
export async function POST(request: NextRequest) {
  console.log("\n🚀 POST /api/workloads");

  try {
    // Parse request body
    const body = await request.json();
    const { use_smart_agent, notes, ...workloadData } = body;

    console.log("📦 Workload data:", workloadData);

    // Validate input
    const validation = validateWorkloadInput(workloadData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Invalid workload data",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const workloadInput: WorkloadInput = {
      model_size_gb: workloadData.model_size_gb,
      num_gpus: workloadData.num_gpus,
      gpu_type: workloadData.gpu_type,
      duration_hours: workloadData.duration_hours,
      utilization_pct: workloadData.utilization_pct || 80,
    };

    // Check if we should use smart agent
    const useAgent = use_smart_agent === true || request.nextUrl.searchParams.get("useAgent") === "true";

    let estimates;
    let agentData = null;

    if (useAgent) {
      console.log("🤖 Using smart agent for estimates...");

      try {
        // Call the agent API
        const agentPrompt = formatWorkloadForAgent(workloadInput);
        const agentResponse = await fetch(`${request.nextUrl.origin}/api/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: agentPrompt }),
        });

        if (agentResponse.ok) {
          const agentResult = await agentResponse.json();
          console.log("✅ Agent estimates received");

          estimates = {
            estimated_kwh: agentResult.estimated_kwh,
            estimated_carbon_kg: agentResult.estimated_carbon_kg,
            estimated_cost_usd: agentResult.estimated_cost_usd,
            calculation_method: "agent",
          };

          agentData = {
            used_smart_agent: true,
            agent_confidence: agentResult.confidence,
            agent_reasoning: {
              optimizations: agentResult.optimizations,
              reasoning_trace: agentResult.reasoning_trace,
              raw_response: agentResult.raw_agent_response,
            },
          };
        } else {
          console.warn("⚠️  Agent call failed, falling back to simple calculation");
          estimates = calculateFallbackEstimates(workloadInput);
        }
      } catch (error) {
        console.error("❌ Error calling agent, using fallback:", error);
        estimates = calculateFallbackEstimates(workloadInput);
      }
    } else {
      console.log("💡 Using fallback calculation");
      estimates = calculateFallbackEstimates(workloadInput);
    }

    // Prepare workload record
    const workloadRecord = {
      model_size_gb: workloadInput.model_size_gb,
      num_gpus: workloadInput.num_gpus,
      gpu_type: workloadInput.gpu_type,
      duration_hours: workloadInput.duration_hours,
      utilization_pct: workloadInput.utilization_pct,
      estimated_kwh: estimates.estimated_kwh,
      estimated_carbon_kg: estimates.estimated_carbon_kg,
      estimated_cost_usd: estimates.estimated_cost_usd,
      status: "submitted",
      notes: notes || null,
      ...agentData,
    };

    console.log("💾 Inserting into Supabase...");

    // Insert into Supabase
    const { data, error } = await getSupabaseClient()
      .from("workloads")
      .insert(workloadRecord)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("✅ Workload created:", data.id);

    // Return response
    return NextResponse.json(
      {
        id: data.id,
        message: "Workload submitted successfully",
        estimates: {
          kwh: estimates.estimated_kwh,
          carbon_kg: estimates.estimated_carbon_kg,
          cost_usd: estimates.estimated_cost_usd,
          calculation_method: estimates.calculation_method || (useAgent ? "agent" : "fallback"),
        },
        workload: {
          ...workloadInput,
          created_at: data.created_at,
          status: data.status,
        },
        agent_insights: agentData?.agent_reasoning
          ? {
              optimizations: agentData.agent_reasoning.optimizations,
              confidence: agentData.agent_confidence,
            }
          : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error in POST /api/workloads:", error);

    return NextResponse.json(
      {
        error: "Failed to submit workload",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workloads
 * List all workloads (for demo - in production would paginate/filter)
 */
export async function GET(request: NextRequest) {
  console.log("\n📋 GET /api/workloads");

  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, error } = await getSupabaseClient()
      .from("workloads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      workloads: data,
      count: data.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("❌ Error in GET /api/workloads:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch workloads",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

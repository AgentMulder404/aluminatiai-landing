// Individual Workload API - Retrieve specific workload by ID

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * GET /api/workloads/[id]
 * Retrieve a specific workload by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`\n📖 GET /api/workloads/${params.id}`);

  try {
    const { id } = params;
    const { searchParams } = request.nextUrl;
    const includeHistory = searchParams.get("history") === "true";

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid workload ID format" },
        { status: 400 }
      );
    }

    // Fetch workload from database
    const { data, error } = await supabase
      .from("workloads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          { error: "Workload not found" },
          { status: 404 }
        );
      }
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("✅ Workload found:", data.id);

    // Build response
    const response: any = {
      id: data.id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      workload: {
        model_size_gb: data.model_size_gb,
        num_gpus: data.num_gpus,
        gpu_type: data.gpu_type,
        duration_hours: data.duration_hours,
        utilization_pct: data.utilization_pct,
      },
      estimates: {
        kwh: data.estimated_kwh,
        carbon_kg: data.estimated_carbon_kg,
        cost_usd: data.estimated_cost_usd,
      },
      status: data.status,
      notes: data.notes,
    };

    // Add agent insights if available
    if (data.used_smart_agent) {
      response.agent_insights = {
        confidence: data.agent_confidence,
        optimizations: data.agent_reasoning?.optimizations || [],
        reasoning_trace: data.agent_reasoning?.reasoning_trace || [],
      };
    }

    // Add history if requested
    if (includeHistory) {
      // For now, just return current state as single history entry
      // In production, you'd have a separate history table
      response.history = [
        {
          timestamp: data.updated_at,
          status: data.status,
          estimates: response.estimates,
        },
      ];
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ Error in GET /api/workloads/${params.id}:`, error);

    return NextResponse.json(
      {
        error: "Failed to fetch workload",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workloads/[id]
 * Update workload status (for simulating monitoring)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`\n🔄 PATCH /api/workloads/${params.id}`);

  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["submitted", "running", "completed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status",
          valid_statuses: validStatuses,
        },
        { status: 400 }
      );
    }

    // Update workload
    const { data, error } = await supabase
      .from("workloads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Workload not found" },
          { status: 404 }
        );
      }
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("✅ Workload updated:", data.id);

    return NextResponse.json({
      id: data.id,
      status: data.status,
      updated_at: data.updated_at,
      message: "Workload updated successfully",
    });
  } catch (error) {
    console.error(`❌ Error in PATCH /api/workloads/${params.id}:`, error);

    return NextResponse.json(
      {
        error: "Failed to update workload",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

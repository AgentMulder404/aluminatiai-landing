"use client";

import { useEffect, useState, useCallback } from "react";
import TodayCostCard from "@/components/dashboard/TodayCostCard";
import JobsTable from "@/components/dashboard/JobsTable";
import UtilizationChart from "@/components/dashboard/UtilizationChart";
import StatCard from "@/components/dashboard/StatCard";

// ── Empty state banner ────────────────────────────────────────────────────────

function EmptyStateBanner({ onSeed }: { onSeed: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  async function handleSeed() {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Seed failed");
      onSeed(); // trigger dashboard reload
    } catch (err: unknown) {
      setSeedError(err instanceof Error ? err.message : "Something went wrong");
      setSeeding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-forest/30 bg-gradient-to-br from-forest/10 via-neutral-900/60 to-blue-900/10 p-10 text-center">
      {/* Icon */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-forest/30 bg-forest/10">
        <svg className="h-8 w-8 text-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      </div>

      <h3 className="mb-2 text-xl font-semibold text-white">No GPU data yet</h3>
      <p className="mx-auto mb-2 max-w-md text-gray-400">
        Install the monitoring agent to start tracking real GPU energy usage —
        or load sample data to explore the dashboard right now.
      </p>
      <p className="mx-auto mb-8 max-w-sm text-xs text-gray-600">
        Sample data simulates 5 realistic ML jobs: a Llama-3 fine-tune, inference
        serving, an SDXL batch render, a BERT eval sweep, and one abandoned job
        wasting energy in the background.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-forest to-glow px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-glow/20 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {seeding ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Seeding data…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Load sample data
            </>
          )}
        </button>

        <a
          href="/dashboard/setup"
          className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-glow hover:text-glow"
        >
          Install agent →
        </a>
      </div>

      {seedError && (
        <p className="mt-4 text-sm text-red-400">{seedError}</p>
      )}
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [todayCost, setTodayCost]       = useState<any>(null);
  const [jobs, setJobs]                 = useState<any[]>([]);
  const [chartData, setChartData]       = useState<any[]>([]);
  const [chartSummary, setChartSummary] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const isEmpty =
    !loading &&
    !error &&
    jobs.length === 0 &&
    (todayCost === null || todayCost.sample_count === 0);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [costRes, jobsRes, chartRes] = await Promise.all([
        fetch("/api/dashboard/today-cost"),
        fetch("/api/dashboard/jobs?limit=10"),
        fetch("/api/dashboard/utilization-chart?hours=24"),
      ]);

      if (!costRes.ok || !jobsRes.ok || !chartRes.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const costData     = await costRes.json();
      const jobsData     = await jobsRes.json();
      const chartResData = await chartRes.json();

      setTodayCost(costData);
      setJobs(jobsData.jobs || []);
      setChartData(chartResData.data || []);
      setChartSummary(chartResData.summary || null);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError("Failed to load dashboard data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GPU Energy Dashboard</h1>
          <p className="mt-2 text-gray-400">
            Monitor your GPU energy usage and costs in real-time
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="rounded-lg bg-neutral-800 px-4 py-2 text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Empty state — replaces the whole dashboard when no data */}
      {isEmpty ? (
        <EmptyStateBanner onSeed={loadDashboardData} />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Today's Cost"
              value={todayCost ? `$${todayCost.cost_usd.toFixed(2)}` : "--"}
              accent="green"
              loading={loading}
            />
            <StatCard
              label="Total kWh"
              value={todayCost ? `${todayCost.energy_kwh.toFixed(3)}` : "--"}
              accent="purple"
              loading={loading}
            />
            <StatCard
              label="Active GPUs"
              value={chartSummary ? `${chartSummary.gpu_count}` : "--"}
              accent="blue"
              loading={loading}
            />
            <StatCard
              label="Avg Utilization"
              value={chartSummary ? `${chartSummary.avg_utilization_pct}%` : "--"}
              loading={loading}
            />
          </div>

          <TodayCostCard data={todayCost} loading={loading} />
          <JobsTable     jobs={jobs}      loading={loading} />
          <UtilizationChart data={chartData} loading={loading} />
        </>
      )}
    </div>
  );
}

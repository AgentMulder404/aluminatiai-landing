"use client";

import { useState } from "react";
import Link from "next/link";
import GanttChart from "./GanttChart";

interface Job {
  id: string;
  duration: number;
  gpu_count: number;
  priority: string;
  estimated_power_per_gpu: number;
}

interface GPU {
  id: string;
  model: string;
  max_power: number;
  idle_power: number;
  cost_per_kwh: number;
}

interface ScheduleAction {
  job_id: string;
  gpu_ids: string[];
  start_time: number;
}

interface ScheduleResult {
  optimal_schedule: ScheduleAction[];
  naive_schedule?: ScheduleAction[];
  metrics: {
    total_time: number;
    total_energy_cost: number;
    jobs_completed: number;
    avg_wait_time: number;
  };
  search_stats: {
    total_nodes_explored: number;
    nodes_pruned: number;
    max_depth_reached: number;
  };
  naive_metrics?: {
    total_time: number;
    total_energy_cost: number;
  };
  cost_savings?: {
    energy_cost_saved: number;
    time_difference: number;
    percentage_saved: number;
  };
}

const DEMO_JOBS: Job[] = [
  { id: "training_1", duration: 120, gpu_count: 4, priority: "high", estimated_power_per_gpu: 350 },
  { id: "inference_1", duration: 30, gpu_count: 1, priority: "medium", estimated_power_per_gpu: 200 },
  { id: "training_2", duration: 180, gpu_count: 2, priority: "high", estimated_power_per_gpu: 400 },
  { id: "inference_2", duration: 15, gpu_count: 1, priority: "low", estimated_power_per_gpu: 150 },
  { id: "training_3", duration: 90, gpu_count: 3, priority: "critical", estimated_power_per_gpu: 380 },
];

const DEMO_GPUS: GPU[] = [
  { id: "gpu_a100_1", model: "A100", max_power: 400, idle_power: 50, cost_per_kwh: 0.12 },
  { id: "gpu_a100_2", model: "A100", max_power: 400, idle_power: 50, cost_per_kwh: 0.12 },
  { id: "gpu_a100_3", model: "A100", max_power: 400, idle_power: 50, cost_per_kwh: 0.12 },
  { id: "gpu_a100_4", model: "A100", max_power: 400, idle_power: 50, cost_per_kwh: 0.12 },
  { id: "gpu_h100_1", model: "H100", max_power: 700, idle_power: 70, cost_per_kwh: 0.15 },
  { id: "gpu_h100_2", model: "H100", max_power: 700, idle_power: 70, cost_per_kwh: 0.15 },
];

export default function MinimaxScheduler() {
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [speedWeight, setSpeedWeight] = useState(0.5);
  const [costWeight, setCostWeight] = useState(0.5);

  const runOptimization = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: DEMO_JOBS,
          gpus: DEMO_GPUS,
          max_depth: 4,
          speed_weight: speedWeight,
          cost_weight: costWeight,
          include_naive_comparison: true
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to optimize schedule. Make sure the API is running on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold hover:text-gray-300 transition-colors">
            ← AluminatiAI
          </Link>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-400">Live Demo</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4">GPU Cost Optimization Agent</h1>
          <p className="text-xl text-gray-400">
            Minimax-based intelligent scheduling that balances speed and energy costs
          </p>
        </div>

        {/* Controls */}
        <div className="bg-neutral-900 rounded-lg p-6 mb-8 border border-neutral-800">
          <h2 className="text-2xl font-semibold mb-4">Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Speed Weight: {speedWeight.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={speedWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeedWeight(val);
                  setCostWeight(1 - val);
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cost Weight: {costWeight.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={costWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCostWeight(val);
                  setSpeedWeight(1 - val);
                }}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={runOptimization}
            disabled={loading}
            className="w-full px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Optimizing..." : "Run Minimax Optimization"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Metrics Comparison */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-2 text-green-400">Time Saved</h3>
                <p className="text-4xl font-bold">
                  {result.cost_savings?.time_difference || 0} min
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {result.metrics.total_time} min vs {result.naive_metrics?.total_time} min (naive)
                </p>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-2 text-blue-400">Energy Cost</h3>
                <p className="text-4xl font-bold">
                  ${result.metrics.total_energy_cost.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Saved: ${Math.abs(result.cost_savings?.energy_cost_saved || 0).toFixed(2)}
                </p>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-2 text-purple-400">Search Stats</h3>
                <p className="text-4xl font-bold">
                  {result.search_stats.total_nodes_explored}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Nodes explored | {result.search_stats.nodes_pruned} pruned
                </p>
              </div>
            </div>

            {/* Gantt Chart Visualizations */}
            <div className="grid md:grid-cols-2 gap-6">
              <GanttChart
                schedule={result.optimal_schedule}
                jobs={DEMO_JOBS}
                gpus={DEMO_GPUS}
                title="Minimax Optimized Schedule"
                totalTime={result.metrics.total_time}
                maxTime={Math.max(result.metrics.total_time, result.naive_metrics?.total_time || 0)}
              />

              {result.naive_schedule && result.naive_metrics && (
                <GanttChart
                  schedule={result.naive_schedule}
                  jobs={DEMO_JOBS}
                  gpus={DEMO_GPUS}
                  title="Naive FIFO Schedule"
                  totalTime={result.naive_metrics.total_time}
                  maxTime={Math.max(result.metrics.total_time, result.naive_metrics.total_time)}
                />
              )}
            </div>

            {/* Schedule */}
            <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
              <h3 className="text-2xl font-semibold mb-4">Optimal Schedule</h3>
              <div className="space-y-3">
                {result.optimal_schedule.map((action, i) => (
                  <div key={i} className="bg-black rounded p-4 border border-neutral-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{action.job_id}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          GPUs: {action.gpu_ids.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Start Time</p>
                        <p className="font-semibold">{action.start_time} min</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jobs & GPUs Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h3 className="text-xl font-semibold mb-4">Input Jobs</h3>
                <div className="space-y-2">
                  {DEMO_JOBS.map(job => (
                    <div key={job.id} className="bg-black rounded p-3 border border-neutral-700 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{job.id}</span>
                        <span className="text-gray-400">{job.duration}m</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {job.gpu_count} GPUs • {job.priority} priority
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h3 className="text-xl font-semibold mb-4">GPU Cluster</h3>
                <div className="space-y-2">
                  {DEMO_GPUS.map(gpu => (
                    <div key={gpu.id} className="bg-black rounded p-3 border border-neutral-700 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{gpu.id}</span>
                        <span className="text-gray-400">{gpu.model}</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {gpu.max_power}W max • ${gpu.cost_per_kwh}/kWh
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 py-12 text-center border-t border-neutral-800 mt-12">
        <p className="text-gray-400 mb-4">
          This demo showcases our minimax-based GPU job scheduler
        </p>
        <Link
          href="/"
          className="text-white hover:text-gray-300 transition-colors font-semibold"
        >
          ← Back to Main Site
        </Link>
      </div>
    </div>
  );
}

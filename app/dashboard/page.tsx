"use client";

import { useEffect, useState } from 'react';
import TodayCostCard from '@/components/dashboard/TodayCostCard';
import JobsTable from '@/components/dashboard/JobsTable';
import UtilizationChart from '@/components/dashboard/UtilizationChart';

export default function DashboardPage() {
  const [todayCost, setTodayCost] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [costRes, jobsRes, chartRes] = await Promise.all([
        fetch('/api/dashboard/today-cost'),
        fetch('/api/dashboard/jobs?limit=10'),
        fetch('/api/dashboard/utilization-chart?hours=24'),
      ]);

      if (!costRes.ok || !jobsRes.ok || !chartRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const costData = await costRes.json();
      const jobsData = await jobsRes.json();
      const chartResData = await chartRes.json();

      setTodayCost(costData);
      setJobs(jobsData.jobs || []);
      setChartData(chartResData.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GPU Energy Dashboard</h1>
          <p className="text-gray-400 mt-2">Monitor your GPU energy usage and costs in real-time</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* View 1: Today's Cost */}
      <TodayCostCard data={todayCost} loading={loading} />

      {/* View 2: Jobs Table */}
      <JobsTable jobs={jobs} loading={loading} />

      {/* View 3: Utilization vs Power Chart */}
      <UtilizationChart data={chartData} loading={loading} />
    </div>
  );
}

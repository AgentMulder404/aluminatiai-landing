"use client";

import { useEffect, useState } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import FleetTable from '@/components/dashboard/FleetTable';
import LoadingCard from '@/components/dashboard/LoadingCard';
import EmptyState from '@/components/dashboard/EmptyState';

export default function FleetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/reports/hardware-efficiency');
        if (!res.ok) throw new Error('Failed to fetch fleet data');
        setData(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Fleet Overview</h1>
        <LoadingCard title="Loading fleet data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Fleet Overview</h1>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const fleet = data?.fleet || [];

  if (fleet.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Fleet Overview</h1>
        <EmptyState
          title="No GPU fleet data yet"
          message="Fleet metrics will appear once your agent starts sending data."
        />
      </div>
    );
  }

  const totalSamples = data.total_samples || 0;
  const avgUtil = fleet.length > 0
    ? (fleet.reduce((s: number, f: any) => s + f.avg_utilization_pct, 0) / fleet.length).toFixed(1)
    : '0';
  const bestArch = fleet[0];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Fleet Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="GPU Architectures" value={`${fleet.length}`} accent="blue" />
        <StatCard label="Avg Utilization" value={`${avgUtil}%`} accent="purple" />
        <StatCard label="Most Efficient" value={bestArch?.arch_name || '--'} accent="green" />
      </div>

      <FleetTable fleet={fleet} />
    </div>
  );
}

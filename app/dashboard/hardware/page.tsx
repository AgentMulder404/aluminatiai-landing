"use client";

import { useEffect, useState, useCallback } from 'react';
import HardwareComparisonTable from '@/components/dashboard/HardwareComparisonTable';
import EfficiencyCurveChart from '@/components/dashboard/EfficiencyCurveChart';
import LoadingCard from '@/components/dashboard/LoadingCard';
import EmptyState from '@/components/dashboard/EmptyState';

export default function HardwarePage() {
  const [utilPct, setUtilPct] = useState(80);
  const [comparison, setComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedArch, setSelectedArch] = useState<string | null>(null);
  const [curveData, setCurveData] = useState<any>(null);
  const [curveLoading, setCurveLoading] = useState(false);

  // Debounced fetch for comparison data
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComparison(utilPct);
    }, 300);
    return () => clearTimeout(timer);
  }, [utilPct]);

  async function fetchComparison(util: number) {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/hardware-efficiency?compare=true&util=${util}`);
      if (!res.ok) throw new Error('Failed to fetch comparison data');
      const data = await res.json();
      setComparison(data.comparison || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectArch = useCallback(async (arch: string) => {
    setSelectedArch(arch);
    setCurveLoading(true);
    try {
      const res = await fetch(`/api/reports/hardware-efficiency?arch=${encodeURIComponent(arch)}`);
      if (!res.ok) throw new Error('Failed to fetch curve data');
      setCurveData(await res.json());
    } catch {
      setCurveData(null);
    } finally {
      setCurveLoading(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hardware Efficiency</h1>
        <p className="text-gray-400 mt-2">Compare GPU architectures by energy efficiency</p>
      </div>

      {/* Utilization slider */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400 whitespace-nowrap">
            Utilization:
          </label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={utilPct}
            onChange={(e) => setUtilPct(Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-sm font-medium w-12 text-right">{utilPct}%</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingCard title="Loading comparison..." />
      ) : comparison.length === 0 ? (
        <EmptyState
          title="No hardware data available"
          message="GPU architecture benchmark data isn't loaded yet. Try refreshing the page."
        />
      ) : (
        <HardwareComparisonTable
          rows={comparison}
          selectedArch={selectedArch}
          onSelectArch={handleSelectArch}
        />
      )}

      {/* Efficiency curve (appears on row click) */}
      {selectedArch && (
        curveLoading ? (
          <LoadingCard title={`Loading ${selectedArch} curve...`} />
        ) : curveData ? (
          <EfficiencyCurveChart
            archName={curveData.arch_name}
            theoretical={curveData.theoretical_curve || []}
            observed={curveData.observed_curve || []}
          />
        ) : null
      )}
    </div>
  );
}

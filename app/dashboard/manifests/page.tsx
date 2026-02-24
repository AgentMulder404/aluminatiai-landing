"use client";

import { useEffect, useState, useCallback } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import PeriodSelector from '@/components/dashboard/PeriodSelector';
import ManifestTable from '@/components/dashboard/ManifestTable';
import ManifestDetailPanel from '@/components/dashboard/ManifestDetailPanel';
import LoadingCard from '@/components/dashboard/LoadingCard';
import EmptyState from '@/components/dashboard/EmptyState';

const PAGE_SIZE = 50;

export default function ManifestsPage() {
  const [period, setPeriod] = useState('30d');
  const [modelFilter, setModelFilter] = useState('');
  const [manifests, setManifests] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchManifests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        period,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (modelFilter.trim()) {
        params.set('model_tag', modelFilter.trim());
      }
      const res = await fetch(`/api/reports/energy-manifest?${params}`);
      if (!res.ok) throw new Error('Failed to fetch manifests');
      const data = await res.json();
      setManifests(data.manifests || []);
      setSummary(data.summary || null);
      setPagination(data.pagination || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period, offset, modelFilter]);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [period, modelFilter]);

  const handleSelectJob = useCallback(async (jobId: string) => {
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
      setDetail(null);
      return;
    }
    setSelectedJobId(jobId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reports/energy-manifest?job_id=${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch manifest detail');
      setDetail(await res.json());
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedJobId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Energy Manifests</h1>
        <p className="text-gray-400 mt-2">Per-job energy audits with cost and carbon accounting</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <PeriodSelector value={period} onChange={setPeriod} />
        <input
          type="text"
          placeholder="Filter by model tag..."
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total kWh"
          value={summary ? `${summary.total_kwh.toFixed(3)}` : '--'}
          accent="purple"
          loading={loading}
        />
        <StatCard
          label="Total Cost"
          value={summary ? `$${summary.total_cost_usd.toFixed(2)}` : '--'}
          accent="green"
          loading={loading}
        />
        <StatCard
          label="Total CO2"
          value={summary ? `${summary.total_co2_kg.toFixed(3)} kg` : '--'}
          accent="blue"
          loading={loading}
        />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingCard title="Loading manifests..." />
      ) : manifests.length === 0 ? (
        <EmptyState
          title="No manifests found"
          message="Energy manifests will appear here once jobs complete with the agent running."
        />
      ) : (
        <>
          <ManifestTable
            manifests={manifests}
            selectedId={selectedJobId}
            onSelect={handleSelectJob}
          />

          {/* Detail panel */}
          {selectedJobId && (
            <ManifestDetailPanel detail={detail} loading={detailLoading} />
          )}

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={!pagination.has_more}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

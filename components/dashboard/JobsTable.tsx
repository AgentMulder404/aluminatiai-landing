interface Job {
  id: string;
  job_name: string;
  start_time: string;
  duration_seconds: number;
  total_energy_kwh: number;
  total_cost_usd: number;
  avg_utilization_pct: number;
  is_active: boolean;
}

interface JobsTableProps {
  jobs: Job[];
  loading?: boolean;
}

export default function JobsTable({ jobs, loading }: JobsTableProps) {
  if (loading) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-6">Energy by Job</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-6">Energy by Job</h2>
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No jobs recorded yet</p>
          <p className="text-sm text-gray-500">
            Jobs will appear here automatically when you run GPU workloads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6">Energy by Job</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-neutral-800">
            <tr className="text-left text-sm text-gray-400">
              <th className="pb-3 font-medium">Job Name</th>
              <th className="pb-3 font-medium text-right">Runtime</th>
              <th className="pb-3 font-medium text-right">Energy (kWh)</th>
              <th className="pb-3 font-medium text-right">Cost (USD)</th>
              <th className="pb-3 font-medium text-right">Avg Util</th>
              <th className="pb-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors"
              >
                <td className="py-3">
                  <div className="font-medium">{job.job_name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(job.start_time).toLocaleString()}
                  </div>
                </td>
                <td className="py-3 text-right text-gray-400">
                  {formatDuration(job.duration_seconds)}
                </td>
                <td className="py-3 text-right">
                  {job.total_energy_kwh?.toFixed(3) || '0.000'}
                </td>
                <td className="py-3 text-right">
                  ${job.total_cost_usd?.toFixed(2) || '0.00'}
                </td>
                <td className="py-3 text-right">
                  {job.avg_utilization_pct?.toFixed(0) || '0'}%
                </td>
                <td className="py-3 text-center">
                  {job.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-neutral-800 text-gray-400">
                      Completed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0h 0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

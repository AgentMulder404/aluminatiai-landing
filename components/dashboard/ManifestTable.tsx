interface Manifest {
  id: string;
  job_id: string;
  team_id: string;
  model_tag: string;
  scheduler_source: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  duration_human: string;
  total_kwh: number;
  cost_usd: number;
  co2_kg: number;
  gpu_arch: string;
  gpu_count: number;
  hardware_match_score: number | null;
}

interface ManifestTableProps {
  manifests: Manifest[];
  selectedId: string | null;
  onSelect: (jobId: string) => void;
}

function matchScoreColor(score: number | null): string {
  if (score == null) return 'text-gray-500';
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

export default function ManifestTable({ manifests, selectedId, onSelect }: ManifestTableProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6">Energy Manifests</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-neutral-800">
            <tr className="text-left text-sm text-gray-400">
              <th className="pb-3 font-medium">Start Time</th>
              <th className="pb-3 font-medium">Model</th>
              <th className="pb-3 font-medium">GPU Arch</th>
              <th className="pb-3 font-medium text-right">Duration</th>
              <th className="pb-3 font-medium text-right">kWh</th>
              <th className="pb-3 font-medium text-right">Cost</th>
              <th className="pb-3 font-medium text-right">CO2 (kg)</th>
              <th className="pb-3 font-medium text-right">Match</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {manifests.map((m) => (
              <tr
                key={m.id}
                onClick={() => onSelect(m.job_id)}
                className={`border-b border-neutral-800/50 hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                  selectedId === m.job_id ? 'bg-neutral-900/70' : ''
                }`}
              >
                <td className="py-3">
                  <div className="font-medium">
                    {new Date(m.start_time).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(m.start_time).toLocaleTimeString()}
                  </div>
                </td>
                <td className="py-3 text-gray-300">{m.model_tag || '--'}</td>
                <td className="py-3 text-gray-400">
                  {m.gpu_arch}
                  {m.gpu_count > 1 && <span className="text-gray-500"> x{m.gpu_count}</span>}
                </td>
                <td className="py-3 text-right text-gray-400">{m.duration_human}</td>
                <td className="py-3 text-right">{m.total_kwh.toFixed(3)}</td>
                <td className="py-3 text-right">${m.cost_usd.toFixed(2)}</td>
                <td className="py-3 text-right">{m.co2_kg.toFixed(3)}</td>
                <td className={`py-3 text-right font-medium ${matchScoreColor(m.hardware_match_score)}`}>
                  {m.hardware_match_score != null ? `${m.hardware_match_score}%` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

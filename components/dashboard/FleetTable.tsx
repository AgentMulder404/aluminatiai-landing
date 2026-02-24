interface FleetArch {
  arch_name: string;
  family: string;
  sample_count: number;
  avg_utilization_pct: number;
  avg_power_w: number;
  estimated_tflops: number;
  joules_per_tflop: number;
}

interface FleetTableProps {
  fleet: FleetArch[];
}

function utilColor(pct: number): string {
  if (pct < 30) return 'bg-red-500';
  if (pct < 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function FleetTable({ fleet }: FleetTableProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6">Fleet by Architecture</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-neutral-800">
            <tr className="text-left text-sm text-gray-400">
              <th className="pb-3 font-medium">Architecture</th>
              <th className="pb-3 font-medium">Family</th>
              <th className="pb-3 font-medium text-right">Avg Utilization</th>
              <th className="pb-3 font-medium text-right">Avg Power (W)</th>
              <th className="pb-3 font-medium text-right">Est. TFLOPS</th>
              <th className="pb-3 font-medium text-right">J/TFLOP</th>
              <th className="pb-3 font-medium text-right">Samples</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {fleet.map((arch) => (
              <tr
                key={arch.arch_name}
                className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors"
              >
                <td className="py-3 font-medium">{arch.arch_name}</td>
                <td className="py-3 text-gray-400">{arch.family}</td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${utilColor(arch.avg_utilization_pct)}`}
                        style={{ width: `${Math.min(arch.avg_utilization_pct, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right">{arch.avg_utilization_pct}%</span>
                  </div>
                </td>
                <td className="py-3 text-right text-gray-400">{arch.avg_power_w}</td>
                <td className="py-3 text-right">{arch.estimated_tflops}</td>
                <td className="py-3 text-right">{arch.joules_per_tflop}</td>
                <td className="py-3 text-right text-gray-500">{arch.sample_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

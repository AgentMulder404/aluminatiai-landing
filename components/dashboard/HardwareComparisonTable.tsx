interface ComparisonRow {
  rank: number;
  arch_name: string;
  family: string;
  tdp_w: number;
  power_at_util_w: number;
  effective_tflops: number;
  joules_per_tflop: number;
  relative_efficiency: number;
  has_transformer_engine: boolean;
}

interface HardwareComparisonTableProps {
  rows: ComparisonRow[];
  selectedArch: string | null;
  onSelectArch: (arch: string) => void;
}

export default function HardwareComparisonTable({
  rows,
  selectedArch,
  onSelectArch,
}: HardwareComparisonTableProps) {
  const maxEfficiency = rows.length > 0 ? rows[0].relative_efficiency : 100;

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6">Architecture Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-neutral-800">
            <tr className="text-left text-sm text-gray-400">
              <th className="pb-3 font-medium w-8">#</th>
              <th className="pb-3 font-medium">Architecture</th>
              <th className="pb-3 font-medium">Family</th>
              <th className="pb-3 font-medium text-right">TDP (W)</th>
              <th className="pb-3 font-medium text-right">Power @ Util</th>
              <th className="pb-3 font-medium text-right">TFLOPS</th>
              <th className="pb-3 font-medium text-right">J/TFLOP</th>
              <th className="pb-3 font-medium">Efficiency</th>
              <th className="pb-3 font-medium text-center">TE</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((row) => (
              <tr
                key={row.arch_name}
                onClick={() => onSelectArch(row.arch_name)}
                className={`border-b border-neutral-800/50 hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                  selectedArch === row.arch_name ? 'bg-neutral-900/70' : ''
                }`}
              >
                <td className="py-3 text-gray-500">{row.rank}</td>
                <td className="py-3 font-medium">{row.arch_name}</td>
                <td className="py-3 text-gray-400">{row.family}</td>
                <td className="py-3 text-right text-gray-400">{row.tdp_w}</td>
                <td className="py-3 text-right">{row.power_at_util_w} W</td>
                <td className="py-3 text-right">{row.effective_tflops}</td>
                <td className="py-3 text-right">{row.joules_per_tflop}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${(row.relative_efficiency / maxEfficiency) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12">{row.relative_efficiency}%</span>
                  </div>
                </td>
                <td className="py-3 text-center">
                  {row.has_transformer_engine && (
                    <span className="inline-block px-1.5 py-0.5 text-xs bg-purple-900/40 text-purple-300 rounded">
                      TE
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
